-- Keep payment and order state changes in one transaction. These functions are
-- called by server routes using the Supabase service role only.
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
  -- Lock order before payment, matching submit_payment_proof to avoid deadlocks.
  SELECT * INTO v_order FROM public.orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
  SELECT * INTO v_payment FROM public.payment WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.order_id <> v_order_id THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan.'; END IF;

  IF v_payment.status <> 'menunggu_verifikasi'
     OR v_order.status <> 'menunggu_verifikasi'
     OR v_payment.bukti_pembayaran_url IS NULL THEN
    RAISE EXCEPTION 'Pembayaran tidak lagi menunggu verifikasi.';
  END IF;
  IF v_order.payment_expires_at IS NOT NULL AND v_order.payment_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Pesanan sudah kedaluwarsa dan tidak dapat diverifikasi.';
  END IF;
  IF v_payment.expires_at IS NOT NULL AND v_payment.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Pembayaran sudah kedaluwarsa dan tidak dapat diverifikasi.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.payment SET status = 'dikonfirmasi', verified_at = NOW(), catatan_admin = NULL
    WHERE id = p_payment_id;
    UPDATE public.orders SET status = 'dikonfirmasi' WHERE id = v_order.id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.payment SET status = 'ditolak', verified_at = NOW(), catatan_admin = trim(p_note)
    WHERE id = p_payment_id;
    UPDATE public.orders SET status = 'ditolak' WHERE id = v_order.id;
  ELSE
    UPDATE public.payment SET status = 'perlu_upload_ulang', verified_at = NULL, catatan_admin = trim(p_note)
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

  IF v_order.status IN ('kedaluwarsa', 'dibatalkan', 'selesai', 'dikonfirmasi', 'disewa')
     OR v_payment.status IN ('kedaluwarsa', 'dikonfirmasi') THEN
    RAISE EXCEPTION 'Bukti pembayaran tidak dapat diunggah pada status saat ini.';
  END IF;
  IF v_order.payment_expires_at IS NOT NULL AND v_order.payment_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Batas waktu pembayaran sudah habis.';
  END IF;
  IF v_payment.status NOT IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'ditolak', 'perlu_upload_ulang')
     OR v_order.status NOT IN ('menunggu_pembayaran', 'menunggu_verifikasi', 'ditolak') THEN
    RAISE EXCEPTION 'Bukti pembayaran tidak dapat diunggah pada status saat ini.';
  END IF;

  UPDATE public.payment
  SET bukti_pembayaran_url = p_proof_path, uploaded_at = NOW(), status = 'menunggu_verifikasi',
      catatan_admin = NULL, verified_at = NULL
  WHERE id = v_payment.id;
  UPDATE public.orders SET status = 'menunggu_verifikasi' WHERE id = v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_payment(bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_payment_proof(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(bigint, text) TO service_role;
