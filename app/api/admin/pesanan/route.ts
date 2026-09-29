
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function GET(request: Request) {
  try {
    // Ambil access token dari header Authorization
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    // Verifikasi token dan ambil user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Session login tidak valid.",
        },
        { status: 401 }
      );
    }

    // Cek apakah user terdaftar sebagai admin aktif
    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak. Kamu bukan admin.",
        },
        { status: 403 }
      );
    }

    // Ambil data pesanan menggunakan secret key
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        nomor_pesanan,
        tanggal_ambil,
        jam_ambil,
        tanggal_kembali,
        jam_kembali,
        jumlah_hari,
        total_harga,
        status,
        created_at,
        customer:customer_id (
          nama_lengkap,
          whatsapp,
          email
        ),
        detail:order_detail (
          jumlah,
          harga_per_hari,
          subtotal,
          camera:camera_id (
            nama,
            brand
          )
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Gagal mengambil pesanan:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data pesanan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error(
      "Error API mengambil pesanan:",
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