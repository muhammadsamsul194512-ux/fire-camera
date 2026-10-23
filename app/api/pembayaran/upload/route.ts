import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  isValidPaymentRouteId,
  verifyPaymentAccessFromCookies,
} from "@/lib/payment-access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

function logOperationError(requestId: string, operation: string, error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error(JSON.stringify({
    requestId,
    operation,
    error: {
      name: value.name ?? (error instanceof Error ? error.name : undefined),
      message: value.message ?? (error instanceof Error ? error.message : String(error)),
      code: value.code,
      status: value.status,
      statusCode: value.statusCode,
      details: value.details,
      hint: value.hint,
    },
  }));
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let operation = "parse_form_data";

  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const orderIdValue = formData.get("orderId")?.toString().trim();

    if (!(file instanceof File) || !isValidPaymentRouteId(orderIdValue)) {
      return NextResponse.json(
        {
          error: "File dan identitas pesanan wajib diisi.",
        },
        { status: 400 },
      );
    }

    // Validasi format file
    const tipeFileDiizinkan = ["image/jpeg", "image/png", "application/pdf"];

    if (!tipeFileDiizinkan.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Format file harus JPG, JPEG, PNG, atau PDF.",
        },
        { status: 400 },
      );
    }

    // Validasi ukuran file
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Ukuran file maksimal 5 MB.",
        },
        { status: 400 },
      );
    }

    operation = "authorize_payment_access";
    const orderId = Number(orderIdValue);
    const cookieStore = await cookies();
    if (!verifyPaymentAccessFromCookies(cookieStore.getAll(), orderId)) {
      return NextResponse.json({ error: "Akses pembayaran tidak valid atau sudah berakhir." }, { status: 401 });
    }

    operation = "lookup_order";
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, nomor_pesanan, status, payment_expires_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      logOperationError(requestId, operation, orderError);

      return NextResponse.json(
        {
          error: `Gagal memeriksa pesanan. Referensi: ${requestId}`,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error: "Pesanan tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (
      order.status === "kedaluwarsa" ||
      order.status === "dibatalkan" ||
      order.status === "selesai"
    ) {
      return NextResponse.json(
        {
          error:
            "Reservasi ini sudah tidak aktif. Silakan cek kembali ketersediaan dan buat pesanan baru.",
        },
        { status: 400 },
      );
    }

    const pathFile = `${order.id}/${randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`;
    // Ubah File menjadi ArrayBuffer
    operation = "read_uploaded_file";
    const arrayBuffer = await file.arrayBuffer();

    // Upload ke Supabase Storage
    operation = "storage_upload";
    const { error: uploadError } = await supabaseAdmin.storage
      .from("bukti-pembayaran")
      .upload(pathFile, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logOperationError(requestId, operation, uploadError);

      return NextResponse.json(
        {
          error: `Gagal mengunggah bukti ke penyimpanan. Referensi: ${requestId}`,
        },
        { status: 500 },
      );
    }

    operation = "save_payment_and_order_status";
    const { error: submitError } = await supabaseAdmin.rpc("submit_payment_proof", {
      p_order_id: order.id,
      p_proof_path: pathFile,
    });
    if (submitError) {
      logOperationError(requestId, operation, submitError);
      operation = "cleanup_uploaded_file";
      const { error: cleanupError } = await supabaseAdmin.storage.from("bukti-pembayaran").remove([pathFile]);
      if (cleanupError) logOperationError(requestId, operation, cleanupError);
      const staleRequest = /tidak dapat|kedaluwarsa|tidak ditemukan|status saat ini|batas waktu/i.test(submitError.message);
      const missingFunction = submitError.code === "PGRST202";
      const responseMessage = missingFunction
        ? "Database Supabase belum menyediakan fungsi penyimpanan bukti pembayaran. Terapkan migration 20261022_atomic_payment_review.sql lalu reload schema cache PostgREST."
        : staleRequest
          ? submitError.message
          : `Gagal menyimpan status pembayaran ke database. Referensi: ${requestId}`;
      return NextResponse.json(
        { error: responseMessage, requestId },
        { status: staleRequest ? 409 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Bukti pembayaran berhasil diupload dan sedang menunggu verifikasi admin.",
    });
  } catch (error) {
    logOperationError(requestId, operation, error);
    const phaseLabels: Record<string, string> = {
      parse_form_data: "membaca form unggahan",
      authorize_payment_access: "memeriksa akses pembayaran",
      lookup_order: "memeriksa pesanan",
      read_uploaded_file: "membaca file unggahan",
      storage_upload: "mengunggah file ke penyimpanan",
      save_payment_and_order_status: "menyimpan status pembayaran",
      cleanup_uploaded_file: "membersihkan file sementara",
    };

    return NextResponse.json(
      {
        error: `Gagal ${phaseLabels[operation] ?? "memproses unggahan"}. Referensi: ${requestId}`,
        requestId,
      },
      { status: 500 },
    );
  }
}
