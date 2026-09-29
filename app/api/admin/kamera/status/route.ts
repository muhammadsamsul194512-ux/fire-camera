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
// ======================================================
// 1. Cek token login
// ======================================================
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

// ======================================================
// 2. Cek apakah token valid
// ======================================================
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

// ======================================================
// 3. Cek apakah user benar-benar admin
// ======================================================
const isAdmin = await cekAdmin(user.id);

if (!isAdmin) {
  return NextResponse.json(
    {
      error:
        "Akses ditolak. Kamu bukan admin.",
    },
    {
      status: 403,
    }
  );
}

// ======================================================
// 4. Ambil data dari request
// ======================================================
const body = await request.json();

const { id, aktif } = body;

if (!id || typeof aktif !== "boolean") {
  return NextResponse.json(
    {
      error:
        "Data status kamera tidak lengkap.",
    },
    {
      status: 400,
    }
  );
}

// ======================================================
// 5. Ubah status kamera
// ======================================================
const { data, error } = await supabaseAdmin
  .from("camera")
  .update({
    aktif,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id)
  .select("id, nama, brand, aktif")
  .single();

if (error) {
  console.error(
    "Gagal mengubah status kamera:",
    error
  );

  return NextResponse.json(
    {
      error:
        "Gagal mengubah status kamera.",
    },
    {
      status: 500,
    }
  );
}

// ======================================================
// 6. Berhasil
// ======================================================
return NextResponse.json({
  success: true,
  kamera: data,
});


} catch (error) {
console.error(
"Error API status kamera:",
error
);


return NextResponse.json(
  {
    error:
      "Terjadi kesalahan pada server.",
  },
  {
    status: 500,
  }
);


}
}
