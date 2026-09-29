import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function POST(request: Request) {
  try {
    // =========================
    // CEK LOGIN ADMIN
    // =========================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Silakan login sebagai admin.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Sesi admin tidak valid.",
        },
        { status: 401 }
      );
    }

    const admin = await cekAdmin(user.id);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Kamu tidak memiliki akses admin.",
        },
        { status: 403 }
      );
    }

    // =========================
    // AMBIL DATA UPLOAD
    // =========================

    const formData = await request.formData();

    const file = formData.get("file");
    const kameraId = formData.get("kameraId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "File gambar belum dipilih.",
        },
        { status: 400 }
      );
    }

    if (!kameraId) {
      return NextResponse.json(
        {
          error: "ID kamera tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    // =========================
    // VALIDASI FILE
    // =========================

    const tipeYangDiizinkan = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tipeYangDiizinkan.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Format gambar harus JPG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    // Maksimal 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Ukuran gambar maksimal 5 MB.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CEK KAMERA
    // =========================

    const { data: camera, error: cameraError } =
      await supabaseAdmin
        .from("camera")
        .select("id")
        .eq("id", kameraId)
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
    // NAMA FILE
    // =========================

    const ekstensi =
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const namaFile =
      `${kameraId}/${Date.now()}.${ekstensi}`;

    // =========================
    // UPLOAD KE STORAGE
    // =========================

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("kamera")
        .upload(namaFile, buffer, {
          contentType: file.type,
          upsert: true,
        });

    if (uploadError) {
      console.error(
        "Gagal upload gambar:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengupload gambar: " +
            uploadError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // AMBIL URL PUBLIK
    // =========================

    const { data: publicUrlData } =
      supabaseAdmin.storage
        .from("kamera")
        .getPublicUrl(namaFile);

    const gambarUrl =
      publicUrlData.publicUrl;

    // =========================
    // SIMPAN URL KE DATABASE
    // =========================

    const { error: updateError } =
      await supabaseAdmin
        .from("camera")
        .update({
          gambar_url: gambarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", kameraId);

    if (updateError) {
      console.error(
        "Gagal menyimpan URL gambar:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Gambar berhasil diupload, tetapi URL gagal disimpan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gambarUrl,
    });
  } catch (error) {
    console.error(
      "Error API upload gambar:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan saat mengupload gambar.",
      },
      { status: 500 }
    );
  }
}