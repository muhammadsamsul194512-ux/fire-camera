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
          error:
            "Akses ditolak. Silakan login sebagai admin.",
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
    // AMBIL FILE
    // =========================

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "File gambar belum dipilih.",
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
    // NAMA FILE
    // =========================

    const ekstensi =
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const namaFile =
      `hero/${Date.now()}.${ekstensi}`;

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
        "Gagal upload gambar Hero:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengupload gambar Hero: " +
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

    const gambarHeroUrl =
      publicUrlData.publicUrl;

    // =========================
    // SIMPAN URL KE SETTINGS
    // =========================

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("settings")
        .select("id")
        .order("id", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (settingsError || !settings) {
      console.error(
        "Gagal mencari settings:",
        settingsError
      );

      return NextResponse.json(
        {
          error:
            "Gambar berhasil diupload, tetapi data pengaturan tidak ditemukan.",
        },
        { status: 500 }
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("settings")
        .update({
          gambar_hero_url: gambarHeroUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

    if (updateError) {
      console.error(
        "Gagal menyimpan URL gambar Hero:",
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
      gambarHeroUrl,
    });
  } catch (error) {
    console.error(
      "Error API upload gambar Hero:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan saat mengupload gambar Hero.",
      },
      { status: 500 }
    );
  }
}