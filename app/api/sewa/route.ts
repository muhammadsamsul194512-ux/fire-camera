import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PAYMENT_ACCESS_COOKIE,
  buildPaymentRoute,
  createPaymentAccessToken,
} from "@/lib/payment-access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nama,
      whatsapp,
      email,
      kamera,
      kameraId,
      tanggalAmbil,
      jamAmbil,
      tanggalKembali,
      jamKembali,
      jumlah,
    } = body;

    // =========================
    // VALIDASI DATA
    // =========================

    if (
      !nama ||
      !whatsapp ||
      !kameraId ||
      !tanggalAmbil ||
      !jamAmbil ||
      !tanggalKembali ||
      !jamKembali ||
      !jumlah
    ) {
      return NextResponse.json(
        {
          error: "Data penyewaan belum lengkap.",
        },
        { status: 400 },
      );
    }

    const jumlahKamera = Number(jumlah);

    if (!Number.isInteger(jumlahKamera) || jumlahKamera < 1) {
      return NextResponse.json(
        {
          error: "Jumlah kamera minimal 1.",
        },
        { status: 400 },
      );
    }

    // =========================
    // CARI KAMERA
    // =========================

    const { data: camera, error: cameraError } = await supabaseAdmin
      .from("camera")
      .select("id, nama, brand, aktif")
      .eq("id", kameraId)
      .eq("aktif", true)
      .single();

    if (cameraError || !camera) {
      console.error("Gagal menemukan kamera:", cameraError);

      return NextResponse.json(
        {
          error: "Kamera tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    // =========================
    // BUAT PESANAN
    // =========================
    // Semua pengecekan stok,
    // perhitungan harga,
    // penyimpanan customer,
    // order,
    // detail order,
    // dan payment
    // dilakukan dalam satu transaksi
    // di database.

    const { data, error } = await supabaseAdmin.rpc("buat_pesanan", {
      p_nama: nama,
      p_whatsapp: whatsapp,
      p_email: email || null,
      p_camera_id: camera.id,
      p_tanggal_ambil: tanggalAmbil,
      p_jam_ambil: jamAmbil,
      p_tanggal_kembali: tanggalKembali,
      p_jam_kembali: jamKembali,
      p_jumlah: jumlahKamera,
    });

    if (error) {
      console.error("Gagal membuat pesanan:", error);

      return NextResponse.json(
        {
          error: error.message || "Gagal membuat pesanan.",
        },
        { status: 400 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: "Pesanan tidak berhasil dibuat.",
        },
        { status: 500 },
      );
    }

    const hasil = data[0];

    const { data: createdOrder, error: createdOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, nomor_pesanan, payment_expires_at")
      .eq("nomor_pesanan", hasil.nomor_pesanan)
      .maybeSingle();

    if (createdOrderError) {
      console.error(
        "Gagal mengambil order yang baru dibuat:",
        createdOrderError,
      );
    }

    const response = NextResponse.json({
      success: true,
      orderId: createdOrder?.id ?? null,
      nomorPesanan: hasil.nomor_pesanan,
      totalHarga: Number(hasil.total_harga),
      jumlahHari: hasil.jumlah_hari,
      paymentRoute: buildPaymentRoute(createdOrder?.id ?? 0),
    });

    const orderId = createdOrder?.id ?? null;

    if (orderId && createdOrder?.payment_expires_at) {
      response.cookies.set({
        name: PAYMENT_ACCESS_COOKIE,
        value: createPaymentAccessToken({
          orderId,
          nomorPesanan: hasil.nomor_pesanan,
          whatsapp: String(whatsapp || "").trim(),
          expiresAt: createdOrder.payment_expires_at,
        }),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.max(
          60,
          Math.ceil(
            (new Date(createdOrder.payment_expires_at).getTime() - Date.now()) /
              1000,
          ),
        ),
      });
    }

    return response;
  } catch (error) {
    console.error("Error API sewa:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
