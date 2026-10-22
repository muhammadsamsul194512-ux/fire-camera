export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "purple";

const statusLabels: Record<string, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_verifikasi: "Menunggu Verifikasi",
  dikonfirmasi: "Dikonfirmasi",
  ditolak: "Ditolak",
  perlu_upload_ulang: "Perlu Upload Ulang",
  kedaluwarsa: "Kedaluwarsa",
  expired: "Kedaluwarsa",
  disewa: "Sedang Disewa",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const statusTones: Record<string, StatusTone> = {
  menunggu_pembayaran: "warning",
  menunggu_verifikasi: "warning",
  perlu_upload_ulang: "warning",
  dikonfirmasi: "info",
  ditolak: "danger",
  kedaluwarsa: "neutral",
  expired: "neutral",
  disewa: "purple",
  selesai: "success",
  dibatalkan: "danger",
};

export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return "Status Tidak Diketahui";
  return statusLabels[status] ?? status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("id-ID"));
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  return status ? statusTones[status] ?? "neutral" : "neutral";
}
