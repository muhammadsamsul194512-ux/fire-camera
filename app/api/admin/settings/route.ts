import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

// ======================================================
// GET
// Mengambil pengaturan toko untuk admin
// ======================================================
export async function GET(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

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
        {
          status: 401,
        }
      );
    }

    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Kamu bukan admin.",
        },
        {
          status: 403,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("settings")
        .select("*")
        .order("id", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Gagal mengambil pengaturan:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data pengaturan.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Error API mengambil pengaturan:",
      error
    );

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// PATCH
// Mengubah pengaturan toko untuk admin
// ======================================================
export async function PATCH(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Kamu harus login sebagai admin.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

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
        {
          status: 401,
        }
      );
    }

    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        {
          error: "Akses ditolak. Kamu bukan admin.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const {
  nama_toko,
  whatsapp,
  alamat,
  bank,
  nomor_rekening,
  nama_pemilik_rekening,
  gambar_hero_url,
} = body;

    if (!nama_toko?.trim()) {
      return NextResponse.json(
        {
          error: "Nama toko wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: settingsLama, error: findError } =
      await supabaseAdmin
        .from("settings")
        .select("id")
        .order("id", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (findError) {
      console.error(
        "Gagal mencari pengaturan:",
        findError
      );

      return NextResponse.json(
        {
          error:
            "Gagal mencari data pengaturan.",
        },
        {
          status: 500,
        }
      );
    }

    if (!settingsLama) {
      return NextResponse.json(
        {
          error: "Data pengaturan belum tersedia.",
        },
        {
          status: 404,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("settings")
        .update({
          nama_toko: nama_toko.trim(),
          whatsapp: whatsapp?.trim() || null,
          alamat: alamat?.trim() || null,
          bank: bank?.trim() || null,
          nomor_rekening:
            nomor_rekening?.trim() || null,
          nama_pemilik_rekening:
  nama_pemilik_rekening?.trim() || null,
gambar_hero_url:
  gambar_hero_url?.trim() || null,
updated_at:
  new Date().toISOString(),
        })
        .eq("id", settingsLama.id)
        .select("*")
        .single();

    if (error) {
      console.error(
        "Gagal mengubah pengaturan:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengubah data pengaturan.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message:
        "Pengaturan berhasil diperbarui.",
    });
  } catch (error) {
    console.error(
      "Error API mengubah pengaturan:",
      error
    );

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}