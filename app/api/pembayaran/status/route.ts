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

    const nomorPesanan = searchParams
      .get("pesanan")
      ?.trim();

    if (!nomorPesanan) {
      return NextResponse.json(
        {
          error: "Nomor pesanan wajib diisi.",
        },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          nomor_pesanan,
          total_harga,
          status,
          payment (
            id,
            status,
            catatan_admin,
            uploaded_at,
            verified_at,
            bukti_pembayaran_url
          )
          `
        )
        .eq("nomor_pesanan", nomorPesanan)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Gagal mengambil status pembayaran:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Terjadi kesalahan saat mengambil status pembayaran.",
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

    const payment = Array.isArray(order.payment)
      ? order.payment[0]
      : order.payment;

    return NextResponse.json({
      success: true,
      data: {
        nomor_pesanan: order.nomor_pesanan,
        total_harga: order.total_harga,
        status_pesanan: order.status,
        payment: payment || null,
      },
    });
  } catch (error) {
    console.error(
      "Error API status pembayaran:",
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