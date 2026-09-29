import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
supabaseUrl,
supabaseSecretKey
);

export async function GET(request: Request) {
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
      error: "Akses ditolak. Kamu bukan admin.",
    },
    {
      status: 403,
    }
  );
}

// ======================================================
// 4. Ambil SEMUA kamera
// ======================================================
const { data, error } = await supabaseAdmin
  .from("camera")
  .select("*")
  .order("id", {
    ascending: true,
  });

if (error) {
  console.error(
    "Gagal mengambil kamera:",
    error
  );

  return NextResponse.json(
    {
      error: "Gagal mengambil data kamera.",
    },
    {
      status: 500,
    }
  );
}

return NextResponse.json({
  success: true,
  data: data || [],
});


} catch (error) {
console.error(
"Error API mengambil kamera:",
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
