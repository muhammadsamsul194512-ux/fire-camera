
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function PATCH(request: Request) {
  try {
    // 1. Ambil access token dari header Authorization
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

    // 2. Verifikasi token dan ambil user
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

    // 3. Cek apakah user adalah admin aktif
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

    // 4. Ambil ID pesanan
    const body = await request.json();

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "ID pesanan tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    // 5. Cari pesanan
    const { data: order, error: findError } =
      await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .single();

    if (findError || !order) {
      return NextResponse.json(
        {
          error: "Pesanan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 6. Cegah pembatalan status akhir
    if (
      order.status === "selesai" ||
      order.status === "dibatalkan" ||
      order.status === "ditolak"
    ) {
      return NextResponse.json(
        {
          error: `Pesanan sudah berstatus ${order.status}.`,
        },
        { status: 400 }
      );
    }

    // 7. Batalkan pesanan
    const { error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          status: "dibatalkan",
        })
        .eq("id", orderId);

    if (updateError) {
      console.error(
        "Gagal membatalkan pesanan:",
        updateError
      );

      return NextResponse.json(
        {
          error: "Gagal membatalkan pesanan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil dibatalkan.",
    });
  } catch (error) {
    console.error(
      "Error API pembatalan pesanan:",
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