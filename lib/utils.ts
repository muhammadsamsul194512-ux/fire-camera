import { calculateRentalDays } from "@/lib/rental-duration";

/** Shared utility: format Rupiah */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format date string "YYYY-MM-DD" → "10 Okt 2026" */
export function formatTanggal(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today's date as "YYYY-MM-DD" */
export function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hariIniJakarta(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

/**
 * Add N days to a "YYYY-MM-DD" string.
 * Returns "YYYY-MM-DD".
 */
export function tambahHari(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Calculate chargeable rental days using the shared, exclusive return-date
 * convention. Time validity is enforced by the availability and booking APIs.
 */
export function getPickupSlots(openHour = 8, closeHour = 20): string[] {
  if (!Number.isInteger(openHour) || !Number.isInteger(closeHour) || openHour < 0 || closeHour > 20 || closeHour < openHour) return [];
  return Array.from({ length: closeHour - openHour + 1 }, (_, index) => `${String(openHour + index).padStart(2, "0")}:00`);
}

export function hitungJumlahHari(
  tanggalAmbil: string,
  tanggalKembali: string
): number {
  return calculateRentalDays(tanggalAmbil, tanggalKembali);
}
