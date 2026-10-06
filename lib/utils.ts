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
 * Calculate rental duration in whole days (calendar days).
 * Uses fixed pickup/return times defined by the store.
 */
export const JAM_AMBIL = "08:00";
export const JAM_KEMBALI = "21:00";

export function hitungJumlahHari(
  tanggalAmbil: string,
  tanggalKembali: string
): number {
  if (!tanggalAmbil || !tanggalKembali) return 0;
  const mulai = new Date(`${tanggalAmbil}T${JAM_AMBIL}`);
  const kembali = new Date(`${tanggalKembali}T${JAM_KEMBALI}`);
  const selisihMs = kembali.getTime() - mulai.getTime();
  if (selisihMs <= 0) return 0;
  return Math.ceil(selisihMs / (1000 * 60 * 60 * 24));
}
