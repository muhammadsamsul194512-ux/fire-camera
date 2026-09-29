import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const nomorPesanan = formData
      .get("nomorPesanan")
      ?.toString()
      .trim();

    if (!file || !nomorPesanan) {
      return NextResponse.json(
        {
          error:
            "File dan nomor pesanan wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Validasi format file
    const tipeFileDiizinkan = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!tipeFileDiizinkan.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Format file harus JPG, JPEG, PNG, atau PDF.",
        },
        { status: 400 }
      );
    }

    // Validasi ukuran file
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Ukuran file maksimal 5 MB.",
        },
        { status: 400 }
      );
    }

    // Cari pesanan
    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select("id, nomor_pesanan")
        .eq("nomor_pesanan", nomorPesanan)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Gagal mencari pesanan:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Terjadi kesalahan saat mencari pesanan.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error: "Pesanan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // Ambil data pembayaran
    const { data: payment, error: paymentGetError } =
      await supabaseAdmin
        .from("payment")
        .select(
          "id, status, bukti_pembayaran_url"
        )
        .eq("order_id", order.id)
        .maybeSingle();

    if (paymentGetError) {
      console.error(
        "Gagal mengambil data pembayaran:",
        paymentGetError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data pembayaran.",
        },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Data pembayaran untuk pesanan ini tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // Hanya izinkan upload jika:
    // 1. Belum pernah upload
    // 2. Admin meminta upload ulang
    // 3. Admin menolak pembayaran
    const statusBolehUpload = [
  "menunggu_pembayaran",
  "menunggu_verifikasi",
  "ditolak",
  "perlu_upload_ulang",
];

    if (!statusBolehUpload.includes(payment.status)) {
      return NextResponse.json(
        {
          error:
            "Bukti pembayaran tidak dapat diupload pada status pembayaran saat ini.",
        },
        { status: 400 }
      );
    }

    // Nama file baru
    const namaFile = `${Date.now()}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "-"
    )}`;

    const pathFile = `${order.id}/${namaFile}`;

    // Ubah File menjadi ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload ke Supabase Storage
    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("bukti-pembayaran")
        .upload(pathFile, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Gagal upload file:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengupload bukti pembayaran.",
        },
        { status: 500 }
      );
    }

    // Update data pembayaran
    const { error: paymentError } =
      await supabaseAdmin
        .from("payment")
        .update({
          bukti_pembayaran_url: pathFile,
          uploaded_at: new Date().toISOString(),
          status: "menunggu_verifikasi",
          catatan_admin: null,
          verified_at: null,
        })
        .eq("id", payment.id);

    if (paymentError) {
      console.error(
        "Gagal memperbarui pembayaran:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "File berhasil diupload, tetapi data pembayaran gagal diperbarui.",
        },
        { status: 500 }
      );
    }
    // Update status pesanan menjadi menunggu verifikasi
const { error: orderUpdateError } =
  await supabaseAdmin
    .from("orders")
    .update({
      status: "menunggu_verifikasi",
    })
    .eq("id", order.id);

if (orderUpdateError) {
  console.error(
    "Gagal memperbarui status pesanan:",
    orderUpdateError
  );

  return NextResponse.json(
    {
      error:
        "Bukti pembayaran berhasil diupload, tetapi status pesanan gagal diperbarui.",
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,
      message:
        "Bukti pembayaran berhasil diupload dan sedang menunggu verifikasi admin.",
    });
  } catch (error) {
    console.error(
      "Error API upload pembayaran:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}