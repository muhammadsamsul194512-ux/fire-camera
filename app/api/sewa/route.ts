import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PAYMENT_ACCESS_MAX_AGE_SECONDS,
  buildPaymentRoute,
  createPaymentAccessToken,
  paymentAccessCookieName,
} from "@/lib/payment-access";
import { isValidRequestedQuantity, isValidRentalSchedule, isFutureJakartaSlot } from "@/lib/booking-rules";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nama,
      whatsapp,
      email,
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

    if (!isValidRequestedQuantity(jumlah)) {
      return NextResponse.json(
        {
          error: "Jumlah kamera minimal 1.",
        },
        { status: 400 },
      );
    }

    const waktuAmbil = normalizeTime(jamAmbil);
    const waktuKembali = normalizeTime(jamKembali);
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
      !waktuAmbil ||
      !waktuKembali ||
      !isValidRentalSchedule(tanggalAmbil, waktuAmbil, tanggalKembali, waktuKembali, Number(rentalSettings.rental_open_hour), Number(rentalSettings.rental_close_hour)) ||
      !isFutureJakartaSlot(tanggalAmbil, waktuAmbil)
    ) {
      return NextResponse.json(
        { error: "Pilih slot pengambilan sesuai jam operasional, dengan durasi minimal 24 jam dan jam pengembalian yang sama." },
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
      const diagnosticError = error as typeof error & {
        status?: number;
        statusCode?: string;
      };
      console.error("Gagal membuat pesanan", {
        operation: "buat_pesanan",
        message: error.message,
        code: error.code,
        status: diagnosticError.status,
        statusCode: diagnosticError.statusCode,
        details: error.details,
        hint: error.hint,
      });

      if (error.message?.includes("Kamera tidak tersedia untuk rentang tanggal")) {
        return NextResponse.json(
          {
            error: "Stok kamera tidak cukup untuk jumlah dan periode yang dipilih.",
            code: "INSUFFICIENT_STOCK",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "Gagal membuat pesanan.",
        },
        { status: 500 },
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
        name: paymentAccessCookieName(orderId)!,
        value: createPaymentAccessToken({
          orderId,
          nomorPesanan: hasil.nomor_pesanan,
          whatsapp: String(whatsapp || "").trim(),
          // The access token protects order status/re-upload access and must
          // outlive the initial payment window. The database enforces deadlines.
          expiresAt: new Date(Date.now() + PAYMENT_ACCESS_MAX_AGE_SECONDS * 1000),
        }),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: PAYMENT_ACCESS_MAX_AGE_SECONDS,
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
