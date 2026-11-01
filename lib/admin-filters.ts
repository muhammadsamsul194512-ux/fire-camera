/**
 * Admin filter helpers: date-range presets, URL → filter param parsing,
 * and Supabase query builders for the admin pesanan and related pages.
 *
 * All date boundaries are computed in Asia/Jakarta (WIB, UTC+7) and stored
 * as ISO-8601 UTC strings for Supabase timestamptz comparisons.
 */

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last3months"
  | "last6months"
  | "last12months"
  | "custom"
  | "exact";

export type DateField = "created_at" | "tanggal_ambil" | "tanggal_kembali";

export type SortField =
  | "created_at"
  | "tanggal_ambil"
  | "tanggal_kembali"
  | "total_harga";

export type SortDir = "desc" | "asc";

export type PesananFilters = {
  search: string;
  status: string;
  paymentStatus: string;
  cameraId: string;
  datePreset: DatePreset;
  dateField: DateField;
  dateStart: string; // "YYYY-MM-DD" for custom/exact
  dateEnd: string;   // "YYYY-MM-DD" for custom
  sortField: SortField;
  sortDir: SortDir;
  page: number;
  pageSize: number;
};

export const DEFAULT_FILTERS: PesananFilters = {
  search: "",
  status: "",
  paymentStatus: "",
  cameraId: "",
  datePreset: "all",
  dateField: "created_at",
  dateStart: "",
  dateEnd: "",
  sortField: "created_at",
  sortDir: "desc",
  page: 1,
  pageSize: 25,
};

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Semua waktu" },
  { value: "today", label: "Hari ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "last7", label: "7 hari terakhir" },
  { value: "last30", label: "30 hari terakhir" },
  { value: "last3months", label: "3 bulan terakhir" },
  { value: "last6months", label: "6 bulan terakhir" },
  { value: "last12months", label: "12 bulan terakhir" },
  { value: "exact", label: "Tanggal tertentu" },
  { value: "custom", label: "Rentang kustom" },
];

export const DATE_FIELDS: { value: DateField; label: string }[] = [
  { value: "created_at", label: "Tanggal Pesanan" },
  { value: "tanggal_ambil", label: "Tanggal Ambil" },
  { value: "tanggal_kembali", label: "Tanggal Kembali" },
];

export const ORDER_STATUSES = [
  "menunggu_pembayaran",
  "menunggu_verifikasi",
  "dikonfirmasi",
  "disewa",
  "selesai",
  "dibatalkan",
  "ditolak",
  "kedaluwarsa",
] as const;

export const PAYMENT_STATUSES = [
  "menunggu_pembayaran",
  "menunggu_verifikasi",
  "dikonfirmasi",
  "ditolak",
  "perlu_upload_ulang",
  "kedaluwarsa",
] as const;

export const SORT_OPTIONS: { value: `${SortField}:${SortDir}`; label: string }[] = [
  { value: "created_at:desc", label: "Terbaru" },
  { value: "created_at:asc", label: "Terlama" },
  { value: "tanggal_ambil:asc", label: "Tanggal Ambil (A→Z)" },
  { value: "tanggal_ambil:desc", label: "Tanggal Ambil (Z→A)" },
  { value: "tanggal_kembali:asc", label: "Tanggal Kembali (A→Z)" },
  { value: "tanggal_kembali:desc", label: "Tanggal Kembali (Z→A)" },
  { value: "total_harga:desc", label: "Harga Tertinggi" },
  { value: "total_harga:asc", label: "Harga Terendah" },
];

// ─── Jakarta timezone helpers ─────────────────────────────────────────────────

/**
 * Returns the current date parts in Asia/Jakarta as { year, month (1-based), day }.
 */
function nowJakartaParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const f = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]),
  );
  return { year: f.year, month: f.month, day: f.day };
}

/**
 * Convert a "YYYY-MM-DD" date (Jakarta local) to its UTC ISO start-of-day
 * (00:00:00 WIB = 17:00:00 UTC previous day).
 */
export function jakartaDayStartUtc(dateStr: string): string {
  // WIB = UTC+7, so 00:00:00 WIB = previous day at 17:00 UTC
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d) - 7 * 60 * 60 * 1000);
  return utc.toISOString();
}

/**
 * Format a Date to "YYYY-MM-DD" in Jakarta timezone.
 */
export function toJakartaYMD(date: Date): string {
  const { year, month, day } = nowJakartaParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Preset boundary calculator ───────────────────────────────────────────────

export type DateRange = { start: string; end: string } | null;

/**
 * Return the next Jakarta calendar date as YYYY-MM-DD.
 */
export function nextJakartaDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return toJakartaYMD(new Date(Date.UTC(year, month - 1, day + 1)));
}

/**
 * Compute the start and exclusive end for a given preset, relative to `now`.
 * Returns null for "all", "custom", and "exact" (caller handles those).
 * Both boundaries are UTC ISO strings for timestamptz comparisons.
 */
export function presetToUtcRange(preset: DatePreset, now = new Date()): DateRange {
  const { year, month, day } = nowJakartaParts(now);

  const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateMonthsBefore = (monthsBack: number) => {
    const targetMonth = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
    const targetYear = targetMonth.getUTCFullYear();
    const targetMonthIndex = targetMonth.getUTCMonth();
    const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
    const targetDay = Math.min(day, lastDay);
    return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
  };

  switch (preset) {
    case "today":
      return {
        start: jakartaDayStartUtc(todayStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };

    case "yesterday": {
      const yDate = new Date(Date.UTC(year, month - 1, day - 1));
      const yStr = toJakartaYMD(new Date(yDate.getTime() - 7 * 60 * 60 * 1000));
      return {
        start: jakartaDayStartUtc(yStr),
        end: jakartaDayStartUtc(nextJakartaDate(yStr)),
      };
    }

    case "last7": {
      const startDate = new Date(Date.UTC(year, month - 1, day - 6));
      const startStr = toJakartaYMD(new Date(startDate.getTime() - 7 * 60 * 60 * 1000));
      return {
        start: jakartaDayStartUtc(startStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };
    }

    case "last30": {
      const startDate = new Date(Date.UTC(year, month - 1, day - 29));
      const startStr = toJakartaYMD(new Date(startDate.getTime() - 7 * 60 * 60 * 1000));
      return {
        start: jakartaDayStartUtc(startStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };
    }

    case "last3months": {
      const startStr = dateMonthsBefore(3);
      return {
        start: jakartaDayStartUtc(startStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };
    }
    case "last6months": {
      const startStr = dateMonthsBefore(6);
      return {
        start: jakartaDayStartUtc(startStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };
    }
    case "last12months": {
      const startStr = dateMonthsBefore(12);
      return {
        start: jakartaDayStartUtc(startStr),
        end: jakartaDayStartUtc(nextJakartaDate(todayStr)),
      };
    }

    default:
      return null;
  }
}

/**
 * Returns a filter range in the format expected by the selected column:
 * UTC instants for created_at and date strings for rental date columns.
 */
export function getOrderDateRange(
  filters: Pick<PesananFilters, "datePreset" | "dateField" | "dateStart" | "dateEnd">,
  now = new Date(),
): DateRange {
  if (filters.datePreset === "all") return null;

  if (filters.datePreset === "exact" || filters.datePreset === "custom") {
    if (!isValidYMD(filters.dateStart)) return null;
    const lastDate = filters.datePreset === "exact"
      ? filters.dateStart
      : filters.dateEnd || filters.dateStart;
    if (!isValidYMD(lastDate) || lastDate < filters.dateStart) return null;

    const endDate = nextJakartaDate(lastDate);
    if (filters.dateField === "created_at") {
      return {
        start: jakartaDayStartUtc(filters.dateStart),
        end: jakartaDayStartUtc(endDate),
      };
    }
    return { start: filters.dateStart, end: endDate };
  }

  const range = presetToUtcRange(filters.datePreset, now);
  if (!range || filters.dateField === "created_at") return range;
  return {
    start: toJakartaYMD(new Date(range.start)),
    end: toJakartaYMD(new Date(range.end)),
  };
}

function isValidYMD(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateDateFilterParams(
  params: URLSearchParams,
  filters: PesananFilters,
): string | null {
  if (filters.datePreset !== "exact" && filters.datePreset !== "custom") return null;

  const rawStart = params.get("from");
  const rawEnd = params.get("to");
  if (filters.datePreset === "exact" && (!rawStart || !isValidYMD(rawStart))) {
    return "Tanggal tertentu tidak valid.";
  }
  if (filters.datePreset === "custom" && !rawStart) {
    return "Tanggal awal wajib dipilih.";
  }
  if (rawStart && !isValidYMD(rawStart)) return "Tanggal awal tidak valid.";
  if (rawEnd && !isValidYMD(rawEnd)) return "Tanggal akhir tidak valid.";
  if (rawStart && rawEnd && rawEnd < rawStart) {
    return "Tanggal akhir tidak boleh sebelum tanggal awal.";
  }
  return null;
}

// ─── URL ↔ filter params ──────────────────────────────────────────────────────

const VALID_DATE_FIELDS = new Set<string>(["created_at", "tanggal_ambil", "tanggal_kembali"]);
const VALID_SORT_FIELDS = new Set<string>(["created_at", "tanggal_ambil", "tanggal_kembali", "total_harga"]);
const VALID_SORT_DIRS = new Set<string>(["asc", "desc"]);
const VALID_PRESETS = new Set<string>(["all", "today", "yesterday", "last7", "last30", "last3months", "last6months", "last12months", "custom", "exact"]);
const VALID_STATUSES = new Set<string>([...ORDER_STATUSES]);
const VALID_PAYMENT_STATUSES = new Set<string>([...PAYMENT_STATUSES]);
const VALID_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function safeYMD(v: string | null): string {
  return v && VALID_DATE_RE.test(v) && isValidYMD(v) ? v : "";
}

export function searchParamsToFilters(params: URLSearchParams): PesananFilters {
  const datePreset = (VALID_PRESETS.has(params.get("preset") ?? "") ? params.get("preset") : "all") as DatePreset;
  const dateField = (VALID_DATE_FIELDS.has(params.get("dateField") ?? "") ? params.get("dateField") : "created_at") as DateField;
  const sortRaw = params.get("sort") ?? "created_at:desc";
  const [rawSortField, rawSortDir] = sortRaw.split(":");
  const sortField = (VALID_SORT_FIELDS.has(rawSortField) ? rawSortField : "created_at") as SortField;
  const sortDir = (VALID_SORT_DIRS.has(rawSortDir) ? rawSortDir : "desc") as SortDir;
  const rawStatus = params.get("status") ?? "";
  const rawPaymentStatus = params.get("paymentStatus") ?? "";
  const rawPage = Number(params.get("page") ?? "1");
  const rawPageSize = Number(params.get("pageSize") ?? "25");

  return {
    search: (params.get("q") ?? "").slice(0, 200),
    status: VALID_STATUSES.has(rawStatus) ? rawStatus : "",
    paymentStatus: VALID_PAYMENT_STATUSES.has(rawPaymentStatus) ? rawPaymentStatus : "",
    cameraId: (params.get("cameraId") ?? "").replace(/\D/g, "").slice(0, 10),
    datePreset,
    dateField,
    dateStart: safeYMD(params.get("from")),
    dateEnd: safeYMD(params.get("to")),
    sortField,
    sortDir,
    page: Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1,
    pageSize: ([10, 25, 50] as number[]).includes(rawPageSize) ? rawPageSize : 25,
  };
}

export function countActiveFilters(f: PesananFilters): number {
  let n = 0;
  if (f.search) n++;
  if (f.status) n++;
  if (f.paymentStatus) n++;
  if (f.cameraId) n++;
  if (f.datePreset !== "all") n++;
  return n;
}

export function filtersToApiParams(f: PesananFilters): string {
  const params = new URLSearchParams();
  if (f.search) params.set("q", f.search);
  if (f.status) params.set("status", f.status);
  if (f.paymentStatus) params.set("paymentStatus", f.paymentStatus);
  if (f.cameraId) params.set("cameraId", f.cameraId);
  if (f.datePreset !== "all") params.set("preset", f.datePreset);
  if (f.dateField !== "created_at") params.set("dateField", f.dateField);
  if (f.dateStart) params.set("from", f.dateStart);
  if (f.dateEnd) params.set("to", f.dateEnd);
  if (f.sortField !== "created_at" || f.sortDir !== "desc") {
    params.set("sort", `${f.sortField}:${f.sortDir}`);
  }
  if (f.page !== 1) params.set("page", String(f.page));
  if (f.pageSize !== 25) params.set("pageSize", String(f.pageSize));
  return params.toString();
}
