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
    const body = await request.json();

    const nomorPesanan = String(
      body.nomorPesanan || ""
    ).trim();

    const whatsapp = String(
      body.whatsapp || ""
    ).trim();

    if (!nomorPesanan || !whatsapp) {
      return NextResponse.json(
        {
          error:
            "Nomor pesanan dan nomor WhatsApp wajib diisi.",
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
          tanggal_ambil,
          jam_ambil,
          tanggal_kembali,
          jam_kembali,
          jumlah_hari,
          total_harga,
          status,
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
  metode,
  bank,
  nomor_rekening,
  nama_pemilik_rekening,
  bukti_pembayaran_url,
  status,
  catatan_admin,
  uploaded_at,
  verified_at
)
          `
        )
        .eq("nomor_pesanan", nomorPesanan)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Gagal mengambil riwayat pesanan:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Terjadi kesalahan saat mengambil data pesanan.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Pesanan tidak ditemukan atau data tidak sesuai.",
        },
        { status: 404 }
      );
    }

    const customer = Array.isArray(order.customer)
      ? order.customer[0]
      : order.customer;

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Data pelanggan untuk pesanan ini tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (customer.whatsapp !== whatsapp) {
      return NextResponse.json(
        {
          error:
            "Nomor pesanan atau nomor WhatsApp tidak sesuai.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
  success: true,
  data: {
    nomor_pesanan: order.nomor_pesanan,
    tanggal_ambil: order.tanggal_ambil,
    jam_ambil: order.jam_ambil,
    tanggal_kembali: order.tanggal_kembali,
    jam_kembali: order.jam_kembali,
    jumlah_hari: order.jumlah_hari,
    total_harga: order.total_harga,
    status: order.status,
    created_at: order.created_at,
    payment: order.payment,

    customer: {
      nama_lengkap: customer.nama_lengkap,
      whatsapp: customer.whatsapp,
      email: customer.email,
    },

    order_detail: order.order_detail,
  },
});
  } catch (error) {
    console.error(
      "Error API riwayat:",
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