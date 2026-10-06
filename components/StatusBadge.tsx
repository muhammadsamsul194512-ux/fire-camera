type StatusConfig = {
  label: string;
  className: string;
};

const orderStatusMap: Record<string, StatusConfig> = {
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    className: "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30",
  },
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    className: "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30",
  },
  dikonfirmasi: {
    label: "Dikonfirmasi",
    className: "bg-green-500/15 text-green-400 border border-green-500/30",
  },
  disewa: {
    label: "Sedang Disewa",
    className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
  selesai: {
    label: "Selesai",
    className: "bg-green-500/15 text-green-400 border border-green-500/30",
  },
  dibatalkan: {
    label: "Dibatalkan",
    className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
  perlu_upload_ulang: {
    label: "Perlu Upload Ulang",
    className: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
};

export function formatStatus(status: string): string {
  return orderStatusMap[status]?.label ?? status;
}

export function getStatusClass(status: string): string {
  return (
    orderStatusMap[status]?.className ??
    "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
  );
}

type Props = {
  status: string;
  size?: "sm" | "md";
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const cls = getStatusClass(status);
  const label = formatStatus(status);
  const padding = size === "sm" ? "px-3 py-0.5 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <span
      className={`inline-block rounded-full font-semibold ${padding} ${cls}`}
    >
      {label}
    </span>
  );
}
