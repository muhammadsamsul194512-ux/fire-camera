-- Booking concurrency protection and unpaid reservation expiry.
-- This migration adds the server-side safeguard for inventory allocation and payment expiry.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

ALTER TABLE public.payment
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_payment_expires_at
  ON public.orders (payment_expires_at);

CREATE INDEX IF NOT EXISTS idx_orders_expired_at
  ON public.orders (expired_at);

CREATE INDEX IF NOT EXISTS idx_payment_status_expires_at
  ON public.payment (status, expires_at);

CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS TABLE (
  order_id bigint,
  payment_id bigint,
  nomor_pesanan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expired_orders AS (
    UPDATE public.orders o
    SET status = 'kedaluwarsa',
        expired_at = COALESCE(o.expired_at, NOW())
    WHERE o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi')
      AND o.payment_expires_at IS NOT NULL
      AND o.payment_expires_at <= NOW()
    RETURNING o.id, o.nomor_pesanan
  ),
  updated_payment AS (
    UPDATE public.payment p
    SET status = 'kedaluwarsa',
        expires_at = COALESCE(p.expires_at, NOW()),
        catatan_admin = COALESCE(p.catatan_admin, 'Pesanan kedaluwarsa karena pembayaran tidak diselesaikan dalam waktu yang ditentukan.')
    FROM expired_orders eo
    WHERE p.order_id = eo.id
      AND p.status IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'perlu_upload_ulang')
    RETURNING p.order_id, p.id AS payment_id, eo.nomor_pesanan
  )
  SELECT order_id, payment_id, nomor_pesanan
  FROM updated_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.buat_pesanan(
  p_nama text,
  p_whatsapp text,
  p_email text,
  p_camera_id bigint,
  p_tanggal_ambil date,
  p_jam_ambil time,
  p_tanggal_kembali date,
  p_jam_kembali time,
  p_jumlah integer
)
RETURNS TABLE (
  nomor_pesanan text,
  total_harga numeric,
  jumlah_hari integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camera record;
  v_customer_id bigint;
  v_order_id bigint;
  v_total_harga numeric;
  v_jumlah_hari integer;
  v_terpakai integer;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_nomor_pesanan text;
  v_payment_expires_at timestamptz;
BEGIN
  IF p_jumlah IS NULL OR p_jumlah < 1 THEN
    RAISE EXCEPTION 'Jumlah kamera minimal 1.';
  END IF;

  IF p_tanggal_kembali IS NULL OR p_tanggal_ambil IS NULL THEN
    RAISE EXCEPTION 'Tanggal penyewaan wajib diisi.';
  END IF;

  IF p_jam_ambil IS NULL OR p_jam_kembali IS NULL THEN
    RAISE EXCEPTION 'Jam penyewaan wajib diisi.';
  END IF;

  v_start_ts := (p_tanggal_ambil::text || ' ' || p_jam_ambil::text)::timestamptz;
  v_end_ts := (p_tanggal_kembali::text || ' ' || p_jam_kembali::text)::timestamptz;

  IF v_end_ts <= v_start_ts THEN
    RAISE EXCEPTION 'Waktu pengembalian harus setelah waktu pengambilan.';
  END IF;

  SELECT *
    INTO v_camera
  FROM public.camera
  WHERE id = p_camera_id AND aktif = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kamera tidak ditemukan.';
  END IF;

  SELECT COALESCE(SUM(od.jumlah), 0)
    INTO v_terpakai
  FROM public.order_detail od
  JOIN public.orders o ON o.id = od.order_id
  WHERE od.camera_id = p_camera_id
    AND o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'dikonfirmasi', 'disewa')
    AND o.tanggal_ambil < p_tanggal_kembali
    AND o.tanggal_kembali > p_tanggal_ambil
    AND NOT (
      o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi')
      AND o.payment_expires_at IS NOT NULL
      AND o.payment_expires_at <= NOW()
    );

  IF v_camera.stok - v_terpakai < p_jumlah THEN
    RAISE EXCEPTION 'Kamera tidak tersedia untuk rentang tanggal yang dipilih.';
  END IF;

  v_jumlah_hari := (p_tanggal_kembali - p_tanggal_ambil);
  v_total_harga := v_jumlah_hari * p_jumlah * v_camera.harga_per_hari;
  v_payment_expires_at := NOW() + interval '30 minutes';

  INSERT INTO public.customer (nama_lengkap, whatsapp, email)
  VALUES (p_nama, p_whatsapp, p_email)
  RETURNING id INTO v_customer_id;

  v_nomor_pesanan := 'FC-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::int;

  INSERT INTO public.orders (
    customer_id,
    nomor_pesanan,
    tanggal_ambil,
    jam_ambil,
    tanggal_kembali,
    jam_kembali,
    jumlah_hari,
    total_harga,
    status,
    created_at,
    payment_expires_at
  )
  VALUES (
    v_customer_id,
    v_nomor_pesanan,
    p_tanggal_ambil,
    p_jam_ambil,
    p_tanggal_kembali,
    p_jam_kembali,
    v_jumlah_hari,
    v_total_harga,
    'menunggu_pembayaran',
    NOW(),
    v_payment_expires_at
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_detail (
    order_id,
    camera_id,
    jumlah,
    harga_per_hari,
    subtotal
  )
  VALUES (
    v_order_id,
    p_camera_id,
    p_jumlah,
    v_camera.harga_per_hari,
    v_total_harga
  );

  INSERT INTO public.payment (
    order_id,
    metode,
    bank,
    nomor_rekening,
    nama_pemilik_rekening,
    status,
    uploaded_at,
    verified_at,
    expires_at,
    created_at
  )
  VALUES (
    v_order_id,
    'transfer_bank',
    NULL,
    NULL,
    NULL,
    'menunggu_pembayaran',
    NULL,
    NULL,
    v_payment_expires_at,
    NOW()
  );

  RETURN QUERY
  SELECT v_nomor_pesanan AS nomor_pesanan,
         v_total_harga AS total_harga,
         v_jumlah_hari AS jumlah_hari;
END;
$$;

COMMENT ON FUNCTION public.expire_unpaid_bookings() IS 'Marks unpaid bookings as expired after their payment window closes. Safe to run repeatedly.';
COMMENT ON FUNCTION public.buat_pesanan(
  p_nama text,
  p_whatsapp text,
  p_email text,
  p_camera_id bigint,
  p_tanggal_ambil date,
  p_jam_ambil time,
  p_tanggal_kembali date,
  p_jam_kembali time,
  p_jumlah integer
) IS 'Atomically validates camera availability, reserves inventory, and creates the order/payment record with a payment expiry timestamp.';
