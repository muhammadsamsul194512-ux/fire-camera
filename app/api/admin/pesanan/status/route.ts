import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function PATCH(request: NextRequest) {
  try {
    // =========================
    // CEK LOGIN ADMIN
    // =========================
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Tidak terautentikasi." },
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
        { error: "Sesi admin tidak valid." },
        { status: 401 }
      );
    }

    // =========================
    // CEK ROLE ADMIN
    // =========================
    const admin = await cekAdmin(user.id);

    if (!admin) {
      return NextResponse.json(
        { error: "Akses ditolak. Kamu bukan admin." },
        { status: 403 }
      );
    }

    // =========================
    // AMBIL DATA REQUEST
    // =========================
    const body = await request.json();

    const orderId = Number(body.orderId);
    const statusBaru = body.status;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId wajib diisi." },
        { status: 400 }
      );
    }

    if (!["disewa", "selesai"].includes(statusBaru)) {
      return NextResponse.json(
        { error: "Status tidak valid." },
        { status: 400 }
      );
    }

    // =========================
    // AMBIL PESANAN
    // =========================
    const { data: pesanan, error: pesananError } =
      await supabaseAdmin
        .from("orders")
        .select("id, nomor_pesanan, status")
        .eq("id", orderId)
        .single();

    if (pesananError || !pesanan) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    // =========================
    // VALIDASI ALUR STATUS
    // =========================

    // Dikonfirmasi -> Disewa
    if (
      statusBaru === "disewa" &&
      pesanan.status !== "dikonfirmasi"
    ) {
      return NextResponse.json(
        {
          error:
            "Pesanan hanya bisa menjadi Disewa jika status sebelumnya Dikonfirmasi.",
        },
        { status: 400 }
      );
    }

    // Disewa -> Selesai
    if (
      statusBaru === "selesai" &&
      pesanan.status !== "disewa"
    ) {
      return NextResponse.json(
        {
          error:
            "Pesanan hanya bisa menjadi Selesai jika status sebelumnya Disewa.",
        },
        { status: 400 }
      );
    }

    // =========================
    // UPDATE STATUS
    // =========================
    const { data: hasil, error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          status: statusBaru,
        })
        .eq("id", orderId)
        .select("id, nomor_pesanan, status")
        .single();

    if (updateError) {
      console.error(
        "Gagal mengubah status pesanan:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengubah status pesanan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Status pesanan berhasil diubah.",
      pesanan: hasil,
    });
  } catch (error) {
    console.error(
      "Error API status pesanan:",
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