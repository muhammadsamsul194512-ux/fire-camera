import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cekAdmin } from "@/lib/admin";
import {
  DATE_FIELDS,
  DATE_PRESETS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getOrderDateRange,
  searchParamsToFilters,
  validateDateFilterParams,
} from "@/lib/admin-filters";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

async function verifyAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const ok = await cekAdmin(user.id);
  return ok ? user : null;
}

const ORDER_SELECT = `
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
      id,
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

function normalizeOrder(order: unknown) {
  if (typeof order !== "object" || order === null || Array.isArray(order)) {
    throw new TypeError("Format data pesanan tidak valid.");
  }
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(order)) {
    fields[key] = Reflect.get(order, key);
  }

  return {
    ...fields,
    customer: fields.customer ?? null,
    detail: Array.isArray(fields.detail) ? fields.detail : [],
    payment: Array.isArray(fields.payment)
      ? (fields.payment[0] ?? null)
      : (fields.payment ?? null),
  };
}

function escapeLikePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function findMatchingCustomerIds(search: string): Promise<number[]> {
  const pattern = quotePostgrestValue(escapeLikePattern(search));
  const { data, error } = await supabaseAdmin
    .from("customer")
    .select("id")
    .or(`nama_lengkap.ilike.${pattern},whatsapp.ilike.${pattern}`);

  if (error) {
    console.error("Gagal mencari pelanggan untuk filter pesanan:", error);
    throw new Error("Gagal mencari pelanggan.");
  }
  return [...new Set((data ?? []).map((customer) => Number(customer.id)).filter(Number.isSafeInteger))];
}

function buildOrderListSelect(paymentStatus: string, cameraId: string) {
  return ORDER_SELECT
    .replace("detail:order_detail (", `detail:order_detail${cameraId ? "!inner" : ""} (`)
    .replace("payment:payment (", `payment:payment${paymentStatus ? "!inner" : ""} (`);
}

function buildCountSelect(paymentStatus: string, cameraId: string) {
  const relations = ["id"];
  if (paymentStatus) relations.push("payment:payment!inner(status)");
  if (cameraId) relations.push("detail:order_detail!inner(camera_id)");
  return relations.join(", ");
}

function orderSearchExpression(search: string, customerIds: number[]) {
  const orderNumber = `nomor_pesanan.ilike.${quotePostgrestValue(escapeLikePattern(search))}`;
  if (customerIds.length === 0) return orderNumber;
  return `${orderNumber},customer_id.in.(${customerIds.join(",")})`;
}

export async function GET(request: Request) {
  try {
    const user = await verifyAdmin(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json(
        { error: "Akses ditolak." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    // ── Single-order detail (unchanged behaviour) ────────────────────────────
    if (idParam !== null) {
      const orderId = Number(idParam);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return NextResponse.json({ error: "ID pesanan tidak valid." }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil detail pesanan:", error);
        return NextResponse.json({ error: "Gagal mengambil detail pesanan." }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: normalizeOrder(data) });
    }

    // ── List with server-side filters, sorting, and pagination ───────────────
    const f = searchParamsToFilters(url.searchParams);
    const rawStatus = url.searchParams.get("status");
    const rawPaymentStatus = url.searchParams.get("paymentStatus");
    const rawDateField = url.searchParams.get("dateField");
    const rawPreset = url.searchParams.get("preset");
    const rawCameraId = url.searchParams.get("cameraId");
    if (rawStatus && !ORDER_STATUSES.includes(rawStatus as (typeof ORDER_STATUSES)[number])) {
      return NextResponse.json({ error: "Status pesanan tidak valid." }, { status: 400 });
    }
    if (rawPaymentStatus && !PAYMENT_STATUSES.includes(rawPaymentStatus as (typeof PAYMENT_STATUSES)[number])) {
      return NextResponse.json({ error: "Status pembayaran tidak valid." }, { status: 400 });
    }
    if (rawDateField && !DATE_FIELDS.some((field) => field.value === rawDateField)) {
      return NextResponse.json({ error: "Kolom tanggal tidak valid." }, { status: 400 });
    }
    if (rawPreset && !DATE_PRESETS.some((preset) => preset.value === rawPreset)) {
      return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
    }
    if (rawCameraId && (!/^\d+$/.test(rawCameraId) || Number(rawCameraId) <= 0)) {
      return NextResponse.json({ error: "Kamera tidak valid." }, { status: 400 });
    }
    const dateError = validateDateFilterParams(url.searchParams, f);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    let customerIds: number[] = [];
    if (f.search) {
      try {
        customerIds = await findMatchingCustomerIds(f.search);
      } catch {
        return NextResponse.json({ error: "Gagal mencari data pelanggan." }, { status: 500 });
      }
    }

    const from = (f.page - 1) * f.pageSize;
    const to = from + f.pageSize - 1;
    const searchExpression = f.search
      ? orderSearchExpression(f.search, customerIds)
      : "";
    const dateRange = getOrderDateRange(f);

    // Embed relations only when a filter needs them, so count and list keep
    // the same parent orders without accidentally excluding unrelated rows.
    const countQuery = supabaseAdmin
      .from("orders")
      .select(buildCountSelect(f.paymentStatus, f.cameraId), { count: "exact", head: true });
    let countQ = countQuery;
    if (f.search) {
      countQ = (customerIds.length
        ? countQ.or(searchExpression)
        : countQ.ilike("nomor_pesanan", escapeLikePattern(f.search))) as typeof countQ;
    }
    if (f.status) countQ = countQ.eq("status", f.status) as typeof countQ;
    if (f.paymentStatus) countQ = countQ.eq("payment.status", f.paymentStatus) as typeof countQ;
    if (f.cameraId) countQ = countQ.eq("detail.camera_id", Number(f.cameraId)) as typeof countQ;
    if (dateRange) {
      countQ = countQ
        .gte(f.dateField, dateRange.start)
        .lt(f.dateField, dateRange.end) as typeof countQ;
    }

    // Data query
    let dataQ = supabaseAdmin
      .from("orders")
      .select(buildOrderListSelect(f.paymentStatus, f.cameraId))
      .order(f.sortField, { ascending: f.sortDir === "asc" })
      .order("id", { ascending: false }) // stable tiebreak
      .range(from, to);

    // Apply shared filters to data query
    if (f.search) {
      dataQ = (customerIds.length
        ? dataQ.or(searchExpression)
        : dataQ.ilike("nomor_pesanan", escapeLikePattern(f.search))) as typeof dataQ;
    }
    if (f.status) dataQ = dataQ.eq("status", f.status) as typeof dataQ;
    if (f.paymentStatus) dataQ = dataQ.eq("payment.status", f.paymentStatus) as typeof dataQ;
    if (f.cameraId) dataQ = dataQ.eq("detail.camera_id", Number(f.cameraId)) as typeof dataQ;
    if (dateRange) {
      dataQ = dataQ
        .gte(f.dateField, dateRange.start)
        .lt(f.dateField, dateRange.end) as typeof dataQ;
    }

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([countQ, dataQ]);

    if (countResult.error) {
      console.error("Gagal menghitung pesanan:", countResult.error);
      return NextResponse.json({ error: "Gagal menghitung data pesanan." }, { status: 500 });
    }
    if (dataResult.error) {
      console.error("Gagal mengambil pesanan:", dataResult.error);
      return NextResponse.json({ error: "Gagal mengambil data pesanan." }, { status: 500 });
    }

    const orders = (dataResult.data || []).map(normalizeOrder);
    const total = countResult.count ?? 0;

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page: f.page,
        pageSize: f.pageSize,
        total,
        totalPages: Math.ceil(total / f.pageSize),
      },
    });
  } catch (err) {
    console.error("Error API mengambil pesanan:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
