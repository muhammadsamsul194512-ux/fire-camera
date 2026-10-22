import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

async function getAuthorizedAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return { error: "Kamu harus login sebagai admin.", status: 401 as const };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authorization.slice(7));
  if (error || !user) return { error: "Session login tidak valid.", status: 401 as const };
  if (!(await cekAdmin(user.id))) return { error: "Akses ditolak. Kamu bukan admin.", status: 403 as const };
  return { user };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthorizedAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const filter = new URL(request.url).searchParams.get("filter") ?? "all";
    let query = supabaseAdmin.from("payment").select(`
      id, order_id, metode, bank, bukti_pembayaran_url, status, catatan_admin,
      uploaded_at, verified_at, created_at,
        order:order_id!inner (
        id, nomor_pesanan, tanggal_ambil, tanggal_kembali, jumlah_hari, total_harga,
        status, payment_expires_at,
        customer:customer_id (nama_lengkap, whatsapp),
        detail:order_detail (jumlah, camera:camera_id (nama, brand))
      )
    `).order("uploaded_at", { ascending: false, nullsFirst: false });

    if (filter === "needs_verification") {
      query = query.eq("status", "menunggu_verifikasi")
        .eq("order.status", "menunggu_verifikasi")
        .not("bukti_pembayaran_url", "is", null);
    } else if (filter !== "all") {
      return NextResponse.json({ error: "Filter pembayaran tidak valid." }, { status: 400 });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Gagal mengambil data pembayaran:", error);
      return NextResponse.json({ error: "Gagal mengambil data pembayaran." }, { status: 500 });
    }

    const payments = await Promise.all((data ?? []).map(async (payment) => {
      if (!payment.bukti_pembayaran_url) return payment;
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from("bukti-pembayaran")
        .createSignedUrl(payment.bukti_pembayaran_url, 600);
      if (signedError) {
        console.error("Gagal membuat signed URL bukti pembayaran:", signedError);
        return { ...payment, bukti_pembayaran_url: null, proof_error: "Bukti tidak dapat diakses saat ini." };
      }
      return { ...payment, bukti_pembayaran_url: signed.signedUrl };
    }));

    return NextResponse.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    console.error("Error API mengambil pembayaran:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthorizedAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const paymentId = Number(body.paymentId);
    const actions: Record<string, string> = {
      konfirmasi: "approve",
      tolak: "reject",
      upload_ulang: "request_reupload",
    };
    const action = actions[body.action];
    const note = typeof body.catatanAdmin === "string" ? body.catatanAdmin.trim() : "";

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0 || !action) {
      return NextResponse.json({ error: "Data tindakan pembayaran tidak valid." }, { status: 400 });
    }
    if (action !== "approve" && (note.length < 8 || note.length > 500)) {
      return NextResponse.json({ error: "Alasan wajib diisi (8–500 karakter)." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc("review_payment", {
      p_payment_id: paymentId,
      p_action: action,
      p_note: action === "approve" ? null : note,
    });
    if (error) {
      console.error("Gagal memproses keputusan pembayaran:", error);
      const rejected = /tidak dapat|sudah|kedaluwarsa|tidak ditemukan|tidak menunggu/i.test(error.message);
      return NextResponse.json(
        { error: rejected ? error.message : "Gagal menyimpan keputusan pembayaran." },
        { status: rejected ? 409 : 500 },
      );
    }

    const messages: Record<string, string> = {
      approve: "Pembayaran berhasil dikonfirmasi.",
      reject: "Pembayaran berhasil ditolak.",
      request_reupload: "Pelanggan diminta mengupload ulang bukti pembayaran.",
    };
    return NextResponse.json({ success: true, message: messages[action] });
  } catch (error) {
    console.error("Error API verifikasi pembayaran:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
