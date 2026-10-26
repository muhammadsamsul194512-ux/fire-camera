import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasRentalOverlap, reservesInventory, isValidRentalSchedule, isFutureJakartaSlot } from "@/lib/booking-rules";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeTime(value: string) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function comparableDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

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

    const waktuAmbilNormalized = normalizeTime(jamAmbil);
    const waktuKembaliNormalized = normalizeTime(jamKembali);
    const { data: rentalSettings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("rental_open_hour, rental_close_hour")
      .single();
    if (settingsError || !rentalSettings) {
      return NextResponse.json({ error: "Pengaturan jadwal sewa belum tersedia." }, { status: 503 });
    }

    if (
      !isValidDate(tanggalAmbil) ||
      !isValidDate(tanggalKembali) ||
      !waktuAmbilNormalized ||
      !waktuKembaliNormalized ||
      !isValidRentalSchedule(tanggalAmbil, waktuAmbilNormalized, tanggalKembali, waktuKembaliNormalized, Number(rentalSettings.rental_open_hour), Number(rentalSettings.rental_close_hour)) ||
      !isFutureJakartaSlot(tanggalAmbil, waktuAmbilNormalized)
    ) {
      return NextResponse.json(
        { error: "Tanggal atau waktu penyewaan tidak valid." },
        { status: 400 },
      );
    }

    const waktuAmbil = comparableDateTime(tanggalAmbil, waktuAmbilNormalized);
    const waktuKembali = comparableDateTime(tanggalKembali, waktuKembaliNormalized);

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

    const buildOrderDetailsQuery = (includeReuploadDeadline: boolean) =>
      supabaseAdmin
        .from("order_detail")
        .select(
          `
          jumlah,
          orders!inner (
            tanggal_ambil,
            jam_ambil,
            tanggal_kembali,
            jam_kembali,
            status,
            payment_expires_at,
            payment (${includeReuploadDeadline ? "status, reupload_expires_at" : "status"})
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

    let { data: orderDetails, error: orderError } = await buildOrderDetailsQuery(true);
    const missingReuploadDeadline = orderError?.code === "42703"
      && orderError.message.includes("reupload_expires_at");
    if (missingReuploadDeadline) {
      // Keep availability checks working against databases before the
      // replacement-deadline migration is applied. Such requests conservatively
      // reserve stock until the migrated expiration job releases the order.
      ({ data: orderDetails, error: orderError } = await buildOrderDetailsQuery(false));
    }

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
    const now = Date.now();

    for (const detail of orderDetails || []) {
      const order = Array.isArray(detail.orders)
        ? detail.orders[0]
        : detail.orders;

      if (!order) continue;

      const payment = (Array.isArray(order.payment) ? order.payment[0] : order.payment) as
        | { status?: string; reupload_expires_at?: string | null }
        | null;
      if (!reservesInventory(order.status, order.payment_expires_at, new Date(now), payment?.status, payment?.reupload_expires_at)) {
        continue;
      }

      const bentrok = hasRentalOverlap(
        order.tanggal_ambil,
        order.jam_ambil,
        order.tanggal_kembali,
        order.jam_kembali,
        tanggalAmbil,
        waktuAmbilNormalized,
        tanggalKembali,
        waktuKembaliNormalized,
      );

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
