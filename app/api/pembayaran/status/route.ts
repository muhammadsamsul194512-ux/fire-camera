import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { PAYMENT_ACCESS_COOKIE, isValidPaymentRouteId, verifyPaymentAccessToken, verifyPaymentAccessTokenForOrderNumber } from "@/lib/payment-access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const orderIdParam = searchParams.get("orderId")?.trim();
    const nomorPesanan = searchParams.get("pesanan")?.trim();

    if (!orderIdParam && !nomorPesanan) {
      return NextResponse.json(
        {
          error: "Identitas pesanan wajib diisi.",
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const paymentToken = cookieStore.get(PAYMENT_ACCESS_COOKIE)?.value;
    const hasValidIdentity = orderIdParam
      ? isValidPaymentRouteId(orderIdParam) && verifyPaymentAccessToken(paymentToken, Number(orderIdParam))
      : verifyPaymentAccessTokenForOrderNumber(paymentToken, nomorPesanan);
    if (!hasValidIdentity) {
      return NextResponse.json({ error: "Akses pembayaran tidak valid atau sudah berakhir." }, { status: 401 });
    }

    const orderId = orderIdParam ? Number(orderIdParam) : null;

    const { data: order, error: orderError } =
      orderId && Number.isFinite(orderId)
        ? await supabaseAdmin
            .from("orders")
            .select(
              `
              id,
              nomor_pesanan,
              total_harga,
              status,
              payment_expires_at,
              expired_at,
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
            .eq("id", orderId)
            .maybeSingle()
        : await supabaseAdmin
            .from("orders")
            .select(
              `
              id,
              nomor_pesanan,
              total_harga,
              status,
              payment_expires_at,
              expired_at,
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
            .eq("nomor_pesanan", nomorPesanan)
            .maybeSingle();

    if (orderError) {
      console.error("Gagal mengambil status pembayaran:", orderError);

      return NextResponse.json(
        {
          error: "Terjadi kesalahan saat mengambil status pembayaran.",
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
      ? order.payment[0]
      : order.payment;

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        nomor_pesanan: order.nomor_pesanan,
        total_harga: order.total_harga,
        status_pesanan: order.status,
        payment_expires_at: order.payment_expires_at || null,
        expired_at: order.expired_at || null,
        payment: payment || null,
      },
    });
  } catch (error) {
    console.error("Error API status pembayaran:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
