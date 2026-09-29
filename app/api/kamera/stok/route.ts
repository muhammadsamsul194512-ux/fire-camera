import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const kameraId = searchParams.get("kameraId");
    const tanggalAmbil = searchParams.get("tanggalAmbil");
    const jamAmbil = searchParams.get("jamAmbil");
    const tanggalKembali = searchParams.get("tanggalKembali");
    const jamKembali = searchParams.get("jamKembali");

    if (
      !kameraId ||
      !tanggalAmbil ||
      !jamAmbil ||
      !tanggalKembali ||
      !jamKembali
    ) {
      return NextResponse.json(
        {
          error: "Data waktu penyewaan belum lengkap.",
        },
        { status: 400 }
      );
    }

    const waktuAmbil = `${tanggalAmbil} ${jamAmbil}`;
    const waktuKembali = `${tanggalKembali} ${jamKembali}`;

    if (waktuKembali <= waktuAmbil) {
      return NextResponse.json(
        {
          error:
            "Waktu pengembalian harus setelah waktu pengambilan.",
        },
        { status: 400 }
      );
    }

    // =========================
    // AMBIL DATA KAMERA
    // =========================

    const { data: camera, error: cameraError } =
      await supabaseAdmin
        .from("camera")
        .select("id, nama, stok, aktif")
        .eq("id", kameraId)
        .eq("aktif", true)
        .single();

    if (cameraError || !camera) {
      return NextResponse.json(
        {
          error: "Kamera tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // =========================
    // CARI PESANAN YANG BENTROK
    // =========================

    const { data: orderDetails, error: orderError } =
      await supabaseAdmin
        .from("order_detail")
        .select(
          `
          jumlah,
          orders!inner (
            tanggal_ambil,
            jam_ambil,
            tanggal_kembali,
            jam_kembali,
            status
          )
        `
        )
        .eq("camera_id", camera.id)
        .in("orders.status", [
          "menunggu_pembayaran",
          "menunggu_verifikasi",
          "dikonfirmasi",
          "disewa",
        ]);

    if (orderError) {
      console.error(
        "Gagal mengambil data pesanan:",
        orderError
      );

      return NextResponse.json(
        {
          error: "Gagal mengecek stok kamera.",
        },
        { status: 500 }
      );
    }

    let stokTerpakai = 0;

    for (const detail of orderDetails || []) {
      const order = Array.isArray(detail.orders)
        ? detail.orders[0]
        : detail.orders;

      if (!order) continue;

      const mulaiOrder =
        `${order.tanggal_ambil} ${order.jam_ambil}`;

      const selesaiOrder =
        `${order.tanggal_kembali} ${order.jam_kembali}`;

      const bentrok =
        mulaiOrder < waktuKembali &&
        selesaiOrder > waktuAmbil;

      if (bentrok) {
        stokTerpakai += Number(detail.jumlah) || 0;
      }
    }

    const stokTersedia = Math.max(
      Number(camera.stok) - stokTerpakai,
      0
    );

    return NextResponse.json({
      success: true,
      kameraId: camera.id,
      nama: camera.nama,
      stokTotal: Number(camera.stok),
      stokTerpakai,
      stokTersedia,
    });
  } catch (error) {
    console.error(
      "Error API cek stok:",
      error
    );

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}