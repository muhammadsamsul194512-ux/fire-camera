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
// 1. METHOD GET: Ambil daftar kamera
// ======================================================
export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Kamu harus login sebagai admin." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Session login tidak valid." },
        { status: 401 }
      );
    }

    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Akses ditolak. Kamu bukan admin." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("camera")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Gagal mengambil kamera:", error);
      return NextResponse.json(
        { error: "Gagal mengambil data kamera." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Error API mengambil kamera:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

// ======================================================
// 2. METHOD DELETE: Hapus kamera berdasarkan ID
// ======================================================
export async function DELETE(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Kamu harus login sebagai admin." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Session login tidak valid." },
        { status: 401 }
      );
    }

    const isAdmin = await cekAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Akses ditolak. Kamu bukan admin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID kamera tidak ditemukan." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("camera")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Gagal menghapus kamera:", error);
      return NextResponse.json(
        { error: error.message || "Gagal menghapus kamera dari database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kamera berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("Error API menghapus kamera:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}