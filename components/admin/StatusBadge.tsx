type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
};

const toneStyles: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-zinc-800 text-zinc-200 border border-zinc-700",
  success: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  danger: "bg-red-500/10 text-red-300 border border-red-500/30",
  info: "bg-sky-500/10 text-sky-300 border border-sky-500/30",
  purple: "bg-violet-500/10 text-violet-300 border border-violet-500/30",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${toneStyles[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
