
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

export async function cekAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_user")
    .select("id, role, aktif")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("aktif", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Gagal mengecek admin:",
      error
    );

    return false;
  }

  return !!data;
}