import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        { status: 401 },
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Session login tidak valid.",
        },
        { status: 401 },
      );
    }

    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Kamu bukan admin.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const orderIdParam = searchParams.get("id");
    const orderId = orderIdParam ? Number(orderIdParam) : null;

    if (orderIdParam && Number.isNaN(orderId)) {
      return NextResponse.json(
        {
          error: "ID pesanan tidak valid.",
        },
        { status: 400 },
      );
    }

    const selectQuery = `
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
      ),
      payment:payment (
        id,
        status,
        metode,
        bank,
        bukti_pembayaran_url,
        uploaded_at,
        verified_at,
        reupload_expires_at,
        created_at
      )
    `;

    if (orderId !== null) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(selectQuery)
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil detail pesanan:", error);
        return NextResponse.json(
          {
            error: "Gagal mengambil detail pesanan.",
          },
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            error: "Pesanan tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...data,
          customer: data.customer ?? null,
          detail: Array.isArray(data.detail) ? data.detail : [],
          payment: Array.isArray(data.payment)
            ? (data.payment[0] ?? null)
            : (data.payment ?? null),
        },
      });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(selectQuery)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Gagal mengambil pesanan:", error);
      return NextResponse.json(
        {
          error: "Gagal mengambil data pesanan.",
        },
        { status: 500 },
      );
    }

    const normalizedData = (data || []).map((order) => ({
      ...order,
      customer: order.customer ?? null,
      detail: Array.isArray(order.detail) ? order.detail : [],
      payment: Array.isArray(order.payment)
        ? (order.payment[0] ?? null)
        : (order.payment ?? null),
    }));

    return NextResponse.json({
      success: true,
      data: normalizedData,
    });
  } catch (error) {
    console.error("Error API mengambil pesanan:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    );
  }
}
