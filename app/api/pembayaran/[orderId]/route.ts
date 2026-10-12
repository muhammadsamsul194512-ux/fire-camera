import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  PAYMENT_ACCESS_COOKIE,
  isValidPaymentRouteId,
  verifyPaymentAccessToken,
} from "@/lib/payment-access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;

    if (!isValidPaymentRouteId(orderId)) {
      return NextResponse.json(
        {
          error: "ID pesanan tidak valid.",
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const paymentToken = cookieStore.get(PAYMENT_ACCESS_COOKIE)?.value;

    if (!paymentToken) {
      return NextResponse.json(
        {
          error: "Akses pembayaran tidak valid atau sudah berakhir.",
        },
        { status: 401 },
      );
    }

    if (!verifyPaymentAccessToken(paymentToken, Number(orderId))) {
      return NextResponse.json(
        {
          error: "Akses pembayaran tidak valid atau sudah berakhir.",
        },
        { status: 401 },
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          nomor_pesanan,
          tanggal_ambil,
          jam_ambil,
          tanggal_kembali,
          jam_kembali,
          jumlah_hari,
          total_harga,
          status,
          payment_expires_at,
          expired_at,
          created_at,
          customer:customer_id (
            id,
            nama_lengkap,
            whatsapp,
            email
          ),
          order_detail (
            id,
            jumlah,
            harga_per_hari,
            subtotal,
            camera:camera_id (
              id,
              nama,
              brand,
              gambar_url
            )
          ),
          payment (
            id,
            status,
            catatan_admin,
            uploaded_at,
            verified_at,
            bukti_pembayaran_url,
            expires_at
          )
        `,
      )
      .eq("id", Number(orderId))
      .maybeSingle();

    if (orderError) {
      console.error("Gagal mengambil detail pembayaran:", orderError);
      return NextResponse.json(
        {
          error: "Gagal mengambil detail pembayaran.",
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

    const payment = Array.isArray(order.payment)
      ? (order.payment[0] ?? null)
      : (order.payment ?? null);

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        nomor_pesanan: order.nomor_pesanan,
        tanggal_ambil: order.tanggal_ambil,
        jam_ambil: order.jam_ambil,
        tanggal_kembali: order.tanggal_kembali,
        jam_kembali: order.jam_kembali,
        jumlah_hari: order.jumlah_hari,
        total_harga: order.total_harga,
        status: order.status,
        payment_expires_at: order.payment_expires_at || null,
        expired_at: order.expired_at || null,
        created_at: order.created_at,
        customer: Array.isArray(order.customer)
          ? (order.customer[0] ?? null)
          : (order.customer ?? null),
        order_detail: Array.isArray(order.order_detail)
          ? order.order_detail
          : [],
        payment,
      },
    });
  } catch (error) {
    console.error("Error API detail pembayaran:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
