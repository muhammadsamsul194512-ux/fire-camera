-- Rental slots are whole hours from 08:00 through 20:00 WIB. Returning at the
-- selected pickup time after N calendar days preserves exactly N x 24 hours.
-- The singleton settings row is the configurable source of truth for both UI
-- slot generation and database booking validation.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS rental_open_hour integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS rental_close_hour integer NOT NULL DEFAULT 20;

CREATE OR REPLACE FUNCTION public.buat_pesanan(
  p_nama text, p_whatsapp text, p_email text, p_camera_id bigint,
  p_tanggal_ambil date, p_jam_ambil time,
  p_tanggal_kembali date, p_jam_kembali time, p_jumlah integer
)
RETURNS TABLE (nomor_pesanan text, total_harga numeric, jumlah_hari integer)
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
  v_start_ts timestamp without time zone;
  v_end_ts timestamp without time zone;
  v_nomor_pesanan text;
  v_payment_expires_at timestamptz;
  v_open_hour integer;
  v_close_hour integer;
BEGIN
  SELECT rental_open_hour, rental_close_hour INTO v_open_hour, v_close_hour
  FROM public.settings LIMIT 1;
  v_open_hour := COALESCE(v_open_hour, 8);
  v_close_hour := COALESCE(v_close_hour, 20);
  IF v_open_hour < 0 OR v_close_hour > 20 OR v_close_hour < v_open_hour THEN
    RAISE EXCEPTION 'Pengaturan jam operasional tidak valid.';
  END IF;
  IF p_jumlah IS NULL OR p_jumlah < 1 THEN RAISE EXCEPTION 'Jumlah kamera minimal 1.'; END IF;
  IF p_tanggal_ambil IS NULL OR p_tanggal_kembali IS NULL OR p_jam_ambil IS NULL OR p_jam_kembali IS NULL THEN
    RAISE EXCEPTION 'Tanggal dan waktu penyewaan wajib diisi.';
  END IF;
  IF p_tanggal_kembali <= p_tanggal_ambil OR p_jam_ambil <> p_jam_kembali
     OR extract(minute FROM p_jam_ambil) <> 0 OR extract(second FROM p_jam_ambil) <> 0
     OR extract(hour FROM p_jam_ambil) < v_open_hour OR extract(hour FROM p_jam_ambil) > v_close_hour THEN
    RAISE EXCEPTION 'Pilih slot operasional dengan durasi minimal 24 jam dan jam kembali yang sama.';
  END IF;
  v_start_ts := p_tanggal_ambil + p_jam_ambil;
  v_end_ts := p_tanggal_kembali + p_jam_kembali;
  IF v_start_ts <= (NOW() AT TIME ZONE 'Asia/Jakarta') THEN
    RAISE EXCEPTION 'Waktu pengambilan harus di masa depan.';
  END IF;

  SELECT * INTO v_camera FROM public.camera WHERE id = p_camera_id AND aktif = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kamera tidak ditemukan.'; END IF;

  SELECT COALESCE(SUM(od.jumlah), 0) INTO v_terpakai
  FROM public.order_detail od JOIN public.orders o ON o.id = od.order_id
  WHERE od.camera_id = p_camera_id
    AND o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'dikonfirmasi', 'disewa')
    AND (o.tanggal_ambil + o.jam_ambil) < v_end_ts
    AND (o.tanggal_kembali + o.jam_kembali) > v_start_ts
    AND NOT (o.status = 'menunggu_pembayaran' AND o.payment_expires_at IS NOT NULL AND o.payment_expires_at <= NOW())
    AND NOT (o.status = 'menunggu_verifikasi' AND EXISTS (
      SELECT 1 FROM public.payment p WHERE p.order_id = o.id
        AND p.status = 'perlu_upload_ulang' AND p.reupload_expires_at IS NOT NULL AND p.reupload_expires_at <= NOW()
    ));
  IF v_camera.stok - v_terpakai < p_jumlah THEN RAISE EXCEPTION 'Kamera tidak tersedia untuk rentang tanggal yang dipilih.'; END IF;

  v_jumlah_hari := p_tanggal_kembali - p_tanggal_ambil;
  v_total_harga := v_jumlah_hari * p_jumlah * v_camera.harga_per_hari;
  v_payment_expires_at := NOW() + interval '30 minutes';
  INSERT INTO public.customer (nama_lengkap, whatsapp, email) VALUES (p_nama, p_whatsapp, p_email) RETURNING id INTO v_customer_id;
  v_nomor_pesanan := 'FC-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::int;
  INSERT INTO public.orders (customer_id, nomor_pesanan, tanggal_ambil, jam_ambil, tanggal_kembali, jam_kembali, jumlah_hari, total_harga, status, created_at, payment_expires_at)
  VALUES (v_customer_id, v_nomor_pesanan, p_tanggal_ambil, p_jam_ambil, p_tanggal_kembali, p_jam_kembali, v_jumlah_hari, v_total_harga, 'menunggu_pembayaran', NOW(), v_payment_expires_at)
  RETURNING id INTO v_order_id;
  INSERT INTO public.order_detail (order_id, camera_id, jumlah, harga_per_hari, subtotal)
  VALUES (v_order_id, p_camera_id, p_jumlah, v_camera.harga_per_hari, v_total_harga);
  INSERT INTO public.payment (order_id, metode, bank, nomor_rekening, nama_pemilik_rekening, status, uploaded_at, verified_at, expires_at, created_at)
  VALUES (v_order_id, 'transfer_bank', NULL, NULL, NULL, 'menunggu_pembayaran', NULL, NULL, v_payment_expires_at, NOW());
  RETURN QUERY SELECT v_nomor_pesanan, v_total_harga, v_jumlah_hari;
END;
$$;

COMMENT ON FUNCTION public.buat_pesanan(text, text, text, bigint, date, time, date, time, integer) IS
  'Atomically validates 24-hour pickup slots, availability and server-side rental pricing; returns at the selected slot after whole rental days.';
