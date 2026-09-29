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
// POST
// Menambah kamera baru
// ======================================================
export async function POST(request: Request) {
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
      nama,
      brand,
      deskripsi,
      harga_per_hari,
      stok,
      aktif,
    } = body;

    if (!nama?.trim() || !brand?.trim()) {
      return NextResponse.json(
        {
          error: "Nama dan brand kamera wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof harga_per_hari !== "number" ||
      harga_per_hari < 0
    ) {
      return NextResponse.json(
        {
          error: "Harga kamera tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof stok !== "number" ||
      stok < 0 ||
      !Number.isInteger(stok)
    ) {
      return NextResponse.json(
        {
          error: "Stok kamera tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("camera")
        .insert({
          nama: nama.trim(),
          brand: brand.trim(),
          deskripsi:
            deskripsi?.trim() || null,
          harga_per_hari,
          stok,
          gambar_url: null,
          aktif:
            typeof aktif === "boolean"
              ? aktif
              : true,
        })
        .select("*")
        .single();

    if (error) {
      console.error(
        "Gagal menambah kamera:",
        error
      );

      return NextResponse.json(
        {
          error: "Gagal menambah kamera.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      kamera: data,
      message: "Kamera berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "Error API tambah kamera:",
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
// Mengubah kamera
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
      id,
      nama,
      brand,
      deskripsi,
      harga_per_hari,
      stok,
      aktif,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID kamera tidak ditemukan.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nama?.trim() || !brand?.trim()) {
      return NextResponse.json(
        {
          error: "Nama dan brand kamera wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof harga_per_hari !== "number" ||
      harga_per_hari < 0
    ) {
      return NextResponse.json(
        {
          error: "Harga kamera tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof stok !== "number" ||
      stok < 0 ||
      !Number.isInteger(stok)
    ) {
      return NextResponse.json(
        {
          error: "Stok kamera tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (typeof aktif !== "boolean") {
      return NextResponse.json(
        {
          error: "Status kamera tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from("camera")
        .update({
          nama: nama.trim(),
          brand: brand.trim(),
          deskripsi:
            deskripsi?.trim() || null,
          harga_per_hari,
          stok,
          aktif,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
      console.error(
        "Gagal mengubah kamera:",
        error
      );

      return NextResponse.json(
        {
          error: "Gagal mengubah kamera.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      kamera: data,
      message: "Data kamera berhasil diubah.",
    });
  } catch (error) {
    console.error(
      "Error API ubah kamera:",
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