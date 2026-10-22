import { getStatusLabel, getStatusTone } from "@/lib/status";

export function formatStatus(status: string): string {
  return getStatusLabel(status);
}

export function getStatusClass(status: string): string {
  const styles: Record<string, string> = {
    warning: "bg-yellow-400/10 text-yellow-300 border border-yellow-400/30",
    info: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    purple: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    success: "bg-green-500/15 text-green-300 border border-green-500/30",
    danger: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    neutral: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
  };
  return styles[getStatusTone(status)] ?? styles.neutral;
}

type Props = {
  status: string;
  size?: "sm" | "md";
};

export default function StatusBadge({ status, size = "md" }: Props) {
  const cls = getStatusClass(status);
  const label = getStatusLabel(status);
  const padding = size === "sm" ? "px-3 py-0.5 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <span
      className={`inline-block rounded-full font-semibold ${padding} ${cls}`}
    >
      {label}
    </span>
  );
}
