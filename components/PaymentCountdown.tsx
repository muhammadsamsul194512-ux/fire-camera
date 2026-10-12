"use client";

import { useEffect, useMemo, useState } from "react";

function formatCountdownText(ms: number) {
  const safeMs = Number.isFinite(ms) ? Math.max(ms, 0) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} hari ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PaymentCountdown({
  deadline,
  expiredLabel = "Kadaluarsa",
  className = "",
  showLabel = true,
}: {
  deadline?: string | null;
  expiredLabel?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const intervalId = window.setInterval(updateNow, 1000);

    const handleVisibility = () => updateNow();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const parsedDeadline = useMemo(() => {
    if (!deadline) return null;

    const value = new Date(deadline);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [deadline]);

  if (!parsedDeadline) {
    return showLabel ? <span className={className}>-</span> : null;
  }

  const remainingMs = Math.max(parsedDeadline.getTime() - now, 0);
  const isExpired = remainingMs <= 0;

  return (
    <span className={className} aria-live="polite">
      {isExpired ? expiredLabel : formatCountdownText(remainingMs)}
    </span>
  );
}
