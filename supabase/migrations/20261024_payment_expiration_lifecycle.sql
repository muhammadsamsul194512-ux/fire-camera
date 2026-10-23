-- Separate customer payment and replacement proof deadlines. Submitted proofs
-- stay pending review indefinitely and are never expired by the original timer.
ALTER TABLE public.payment
  ADD COLUMN IF NOT EXISTS reupload_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payment_reupload_status_deadline
  ON public.payment (status, reupload_expires_at);

CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS TABLE (order_id bigint, payment_id bigint, nomor_pesanan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT o.id AS order_id, p.id AS payment_id, o.nomor_pesanan
    FROM public.orders o
    JOIN public.payment p ON p.order_id = o.id
    WHERE (
      o.status = 'menunggu_pembayaran'
      AND p.status = 'menunggu_pembayaran'
      AND p.bukti_pembayaran_url IS NULL
      AND o.payment_expires_at IS NOT NULL
      AND o.payment_expires_at <= NOW()
    ) OR (
      o.status = 'menunggu_verifikasi'
      AND p.status = 'perlu_upload_ulang'
      AND p.reupload_expires_at IS NOT NULL
      AND p.reupload_expires_at <= NOW()
    )
    FOR UPDATE OF o, p SKIP LOCKED
  ), expired_orders AS (
    UPDATE public.orders o
    SET status = 'kedaluwarsa', expired_at = COALESCE(o.expired_at, NOW())
    FROM candidates c
    WHERE o.id = c.order_id
      AND o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi')
    RETURNING o.id, o.nomor_pesanan
  ), updated_payment AS (
    UPDATE public.payment p
    SET status = 'kedaluwarsa',
        expires_at = COALESCE(p.expires_at, NOW()),
        reupload_expires_at = NULL,
        catatan_admin = COALESCE(p.catatan_admin, 'Pesanan kedaluwarsa karena batas waktu pembayaran atau unggah ulang telah berakhir.')
    FROM expired_orders eo, candidates c
    WHERE p.id = c.payment_id AND c.order_id = eo.id
      AND p.status IN ('menunggu_pembayaran', 'perlu_upload_ulang')
    RETURNING p.order_id, p.id AS payment_id, eo.nomor_pesanan
  )
  SELECT u.order_id, u.payment_id, u.nomor_pesanan FROM updated_payment u;
END;
$$;

COMMENT ON FUNCTION public.expire_unpaid_bookings() IS
  'Expires only unpaid orders past their payment deadline or replacement proof requests past their separate deadline; never expires submitted proofs awaiting review.';

CREATE OR REPLACE FUNCTION public.review_payment(
  p_payment_id bigint,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payment%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_order_id bigint;
BEGIN
  IF p_action NOT IN ('approve', 'reject', 'request_reupload') THEN
    RAISE EXCEPTION 'Tindakan pembayaran tidak valid.';
  END IF;
  IF p_action <> 'approve' AND (length(trim(COALESCE(p_note, ''))) < 8 OR length(trim(p_note)) > 500) THEN
    RAISE EXCEPTION 'Alasan wajib diisi (8–500 karakter).';
  END IF;

  SELECT order_id INTO v_order_id FROM public.payment WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan.'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
  SELECT * INTO v_payment FROM public.payment WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.order_id <> v_order_id THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan.'; END IF;

  IF v_payment.status <> 'menunggu_verifikasi'
     OR v_order.status <> 'menunggu_verifikasi'
     OR v_payment.bukti_pembayaran_url IS NULL THEN
    RAISE EXCEPTION 'Pembayaran tidak lagi menunggu verifikasi.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.payment SET status = 'dikonfirmasi', verified_at = NOW(), catatan_admin = NULL, reupload_expires_at = NULL
    WHERE id = p_payment_id;
    UPDATE public.orders SET status = 'dikonfirmasi' WHERE id = v_order.id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.payment SET status = 'ditolak', verified_at = NOW(), catatan_admin = trim(p_note), reupload_expires_at = NULL
    WHERE id = p_payment_id;
    UPDATE public.orders SET status = 'ditolak' WHERE id = v_order.id;
  ELSE
    UPDATE public.payment SET status = 'perlu_upload_ulang', verified_at = NULL,
      catatan_admin = trim(p_note), reupload_expires_at = NOW() + interval '30 minutes'
    WHERE id = p_payment_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_order_id bigint,
  p_proof_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payment%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_proof_path IS NULL OR length(trim(p_proof_path)) = 0 OR p_proof_path NOT LIKE p_order_id::text || '/%' THEN
    RAISE EXCEPTION 'Referensi bukti pembayaran tidak valid.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
  SELECT * INTO v_payment FROM public.payment WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan.'; END IF;

  IF v_order.status = 'menunggu_pembayaran' THEN
    IF v_payment.status <> 'menunggu_pembayaran' OR v_payment.bukti_pembayaran_url IS NOT NULL THEN
      RAISE EXCEPTION 'Bukti pembayaran tidak dapat diunggah pada status saat ini.';
    END IF;
    IF v_order.payment_expires_at IS NULL OR v_order.payment_expires_at <= NOW() THEN
      RAISE EXCEPTION 'Batas waktu pembayaran sudah habis.';
    END IF;
  ELSIF v_order.status = 'menunggu_verifikasi' AND v_payment.status = 'perlu_upload_ulang' THEN
    IF v_payment.reupload_expires_at IS NULL OR v_payment.reupload_expires_at <= NOW() THEN
      RAISE EXCEPTION 'Batas waktu upload ulang sudah habis.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Bukti pembayaran tidak dapat diunggah pada status saat ini.';
  END IF;

  UPDATE public.payment
  SET bukti_pembayaran_url = p_proof_path, uploaded_at = NOW(), status = 'menunggu_verifikasi',
      catatan_admin = NULL, verified_at = NULL, reupload_expires_at = NULL
  WHERE id = v_payment.id;
  UPDATE public.orders SET status = 'menunggu_verifikasi' WHERE id = v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment(bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_payment_proof(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(bigint, text) TO service_role;

-- Keep atomic allocation aligned: normal proof submissions hold stock through
-- review; only an unsubmitted initial payment or overdue re-upload can release it.
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
BEGIN
  IF p_jumlah IS NULL OR p_jumlah < 1 THEN RAISE EXCEPTION 'Jumlah kamera minimal 1.'; END IF;
  IF p_tanggal_kembali IS NULL OR p_tanggal_ambil IS NULL THEN RAISE EXCEPTION 'Tanggal penyewaan wajib diisi.'; END IF;
  IF p_tanggal_kembali <= p_tanggal_ambil THEN RAISE EXCEPTION 'Tanggal kembali harus setelah tanggal ambil.'; END IF;
  IF p_jam_ambil IS NULL OR p_jam_kembali IS NULL THEN RAISE EXCEPTION 'Jam penyewaan wajib diisi.'; END IF;
  v_start_ts := p_tanggal_ambil + p_jam_ambil;
  v_end_ts := p_tanggal_kembali + p_jam_kembali;
  IF v_end_ts <= v_start_ts THEN RAISE EXCEPTION 'Waktu pengembalian harus setelah waktu pengambilan.'; END IF;

  SELECT * INTO v_camera FROM public.camera WHERE id = p_camera_id AND aktif = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kamera tidak ditemukan.'; END IF;

  SELECT COALESCE(SUM(od.jumlah), 0) INTO v_terpakai
  FROM public.order_detail od JOIN public.orders o ON o.id = od.order_id
  WHERE od.camera_id = p_camera_id
    AND o.status IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'dikonfirmasi', 'disewa')
    AND (o.tanggal_ambil + o.jam_ambil) < v_end_ts
    AND (o.tanggal_kembali + o.jam_kembali) > v_start_ts
    AND NOT (
      o.status = 'menunggu_pembayaran'
      AND o.payment_expires_at IS NOT NULL AND o.payment_expires_at <= NOW()
    )
    AND NOT (
      o.status = 'menunggu_verifikasi'
      AND EXISTS (SELECT 1 FROM public.payment p WHERE p.order_id = o.id
        AND p.status = 'perlu_upload_ulang' AND p.reupload_expires_at IS NOT NULL
        AND p.reupload_expires_at <= NOW())
    );
  IF v_camera.stok - v_terpakai < p_jumlah THEN RAISE EXCEPTION 'Kamera tidak tersedia untuk rentang tanggal yang dipilih.'; END IF;

  v_jumlah_hari := p_tanggal_kembali - p_tanggal_ambil;
  v_total_harga := v_jumlah_hari * p_jumlah * v_camera.harga_per_hari;
  v_payment_expires_at := NOW() + interval '30 minutes';
  INSERT INTO public.customer (nama_lengkap, whatsapp, email) VALUES (p_nama, p_whatsapp, p_email) RETURNING id INTO v_customer_id;
  v_nomor_pesanan := 'FC-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::int;
  INSERT INTO public.orders (customer_id, nomor_pesanan, tanggal_ambil, jam_ambil, tanggal_kembali, jam_kembali,
    jumlah_hari, total_harga, status, created_at, payment_expires_at)
  VALUES (v_customer_id, v_nomor_pesanan, p_tanggal_ambil, p_jam_ambil, p_tanggal_kembali, p_jam_kembali,
    v_jumlah_hari, v_total_harga, 'menunggu_pembayaran', NOW(), v_payment_expires_at)
  RETURNING id INTO v_order_id;
  INSERT INTO public.order_detail (order_id, camera_id, jumlah, harga_per_hari, subtotal)
  VALUES (v_order_id, p_camera_id, p_jumlah, v_camera.harga_per_hari, v_total_harga);
  INSERT INTO public.payment (order_id, metode, bank, nomor_rekening, nama_pemilik_rekening, status,
    uploaded_at, verified_at, expires_at, created_at)
  VALUES (v_order_id, 'transfer_bank', NULL, NULL, NULL, 'menunggu_pembayaran', NULL, NULL, v_payment_expires_at, NOW());
  RETURN QUERY SELECT v_nomor_pesanan, v_total_harga, v_jumlah_hari;
END;
$$;
