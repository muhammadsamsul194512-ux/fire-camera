import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
  .from("settings")
  .select(
  "nama_toko, whatsapp, bank, nomor_rekening, nama_pemilik_rekening, gambar_hero_url"
)
  .single();

    if (error) {
      console.error(
        "Gagal mengambil nama toko publik:",
        error
      );

      return NextResponse.json(
        {
          error: "Gagal mengambil nama toko.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
  success: true,
  data: {
    nama_toko: data?.nama_toko || "",
    whatsapp: data?.whatsapp || "",
    bank: data?.bank || "",
    nomor_rekening: data?.nomor_rekening || "",
    nama_pemilik_rekening:
      data?.nama_pemilik_rekening || "",
    gambar_hero_url:
      data?.gambar_hero_url || "",
  },
});

  } catch (error) {
    console.error(
      "Error API pengaturan publik:",
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