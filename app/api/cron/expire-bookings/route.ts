import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
const cronSecret = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorizationHeader = request.headers.get("authorization");
  const xCronSecret = request.headers.get("x-cron-secret");
  const expected = cronSecret ? `Bearer ${cronSecret}` : null;

  if (
    expected &&
    authorizationHeader !== expected &&
    xCronSecret !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      { error: "Supabase configuration is missing." },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

  const { data, error } = await supabaseAdmin.rpc("expire_unpaid_bookings");

  if (error) {
    console.error("Failed to expire unpaid bookings:", error);
    return NextResponse.json(
      { error: "Failed to process expired bookings." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    count: Array.isArray(data) ? data.length : 0,
    expired: data || [],
  });
}

export async function POST(request: Request) {
  return GET(request);
}
