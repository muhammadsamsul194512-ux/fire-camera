"use client";

/**
 * AvailabilityCalendar
 *
 * A reusable calendar component for rental date-range selection.
 * Displays available / unavailable dates, the selected range, today,
 * and guides the user through a two-step pick (start → end).
 *
 * Props
 * ─────
 * tanggalAmbil      "YYYY-MM-DD" | ""   currently selected start date
 * tanggalKembali    "YYYY-MM-DD" | ""   currently selected end date
 * onChangeTanggalAmbil   (v: string) => void
 * onChangeTanggalKembali (v: string) => void
 * unavailableDates  Set<string>   dates that cannot be picked (YYYY-MM-DD)
 * loadingAvailability  boolean    show skeleton if availability data is loading
 */

import { useState, useMemo } from "react";
import { hariIni, formatTanggal, hitungJumlahHari } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for a JS Date */
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" without timezone shift */
function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Names for days-of-week header (Mon first) */
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Indonesian month names */
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Build a 6×7 grid of Date|null for a given year/month (1-based month) */
function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0);
  // Monday = 0 … Sunday = 6
  const startOffset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month - 1, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-4 w-32 rounded bg-zinc-800" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-zinc-800/60" />
        ))}
      </div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export type AvailabilityCalendarProps = {
  tanggalAmbil: string;
  tanggalKembali: string;
  onChangeTanggalAmbil: (v: string) => void;
  onChangeTanggalKembali: (v: string) => void;
  /** Set of YYYY-MM-DD strings that are fully unavailable */
  unavailableDates?: Set<string>;
  loadingAvailability?: boolean;
};

export default function AvailabilityCalendar({
  tanggalAmbil,
  tanggalKembali,
  onChangeTanggalAmbil,
  onChangeTanggalKembali,
  unavailableDates = new Set(),
  loadingAvailability = false,
}: AvailabilityCalendarProps) {
  const today = hariIni();
  const todayDate = parseYMD(today);

  // Which month is the calendar showing?
  const [viewYear, setViewYear] = useState(() => {
    const base = tanggalAmbil ? parseYMD(tanggalAmbil) : todayDate;
    return base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const base = tanggalAmbil ? parseYMD(tanggalAmbil) : todayDate;
    return base.getMonth() + 1; // 1-based
  });

  // Two-step pick: after picking start, next click sets end
  // We also track the "hover" date to preview range
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const cells = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Don't allow navigating before the current month
  const canGoPrev =
    viewYear > todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth > todayDate.getMonth() + 1);

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  // ── range-contains-unavailable check ───────────────────────────────────────
  // If the user drags a range over an unavailable date, the end is invalid.
  function rangeHasBlock(start: string, end: string): boolean {
    if (!start || !end) return false;
    const s = parseYMD(start);
    const e = parseYMD(end);
    const d = new Date(s);
    d.setDate(d.getDate() + 1); // don't check start itself
    while (d < e) {
      if (unavailableDates.has(toYMD(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  // ── click handler ──────────────────────────────────────────────────────────
  function handleClick(dateStr: string) {
    const isUnavail = unavailableDates.has(dateStr);
    if (isUnavail) return;
    if (dateStr < today) return;

    if (!tanggalAmbil || (tanggalAmbil && tanggalKembali)) {
      // Start fresh: set start, clear end
      onChangeTanggalAmbil(dateStr);
      onChangeTanggalKembali("");
      setHoverDate(null);
      return;
    }

    // Second click — set end
    if (dateStr <= tanggalAmbil) {
      // Clicked before or on start: restart
      onChangeTanggalAmbil(dateStr);
      onChangeTanggalKembali("");
      setHoverDate(null);
      return;
    }

    // Check range doesn't cross blocked dates
    if (rangeHasBlock(tanggalAmbil, dateStr)) {
      // Invalid: restart selection from this date
      onChangeTanggalAmbil(dateStr);
      onChangeTanggalKembali("");
      setHoverDate(null);
      return;
    }

    onChangeTanggalKembali(dateStr);
    setHoverDate(null);
  }

  // ── visual state per cell ──────────────────────────────────────────────────
  type DayState =
    | "past"
    | "unavailable"
    | "start"
    | "end"
    | "in-range"
    | "hover-range"
    | "today"
    | "available";

  function getDayState(dateStr: string): DayState {
    if (dateStr < today) return "past";
    if (unavailableDates.has(dateStr)) return "unavailable";

    if (tanggalAmbil && dateStr === tanggalAmbil) return "start";
    if (tanggalKembali && dateStr === tanggalKembali) return "end";

    // In confirmed range
    if (tanggalAmbil && tanggalKembali && dateStr > tanggalAmbil && dateStr < tanggalKembali)
      return "in-range";

    // Hover preview range (only when start is set, end not yet)
    if (tanggalAmbil && !tanggalKembali && hoverDate && dateStr > tanggalAmbil && dateStr <= hoverDate) {
      // Don't show if range would be blocked
      if (!rangeHasBlock(tanggalAmbil, hoverDate)) return "hover-range";
    }

    if (dateStr === today) return "today";
    return "available";
  }

  const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);
  const pickingEnd = !!(tanggalAmbil && !tanggalKembali);

  // ── hover on a date — preview range ────────────────────────────────────────
  function handleMouseEnter(dateStr: string) {
    if (!pickingEnd) return;
    if (dateStr <= tanggalAmbil) { setHoverDate(null); return; }
    if (unavailableDates.has(dateStr)) { setHoverDate(null); return; }
    setHoverDate(dateStr);
  }

  // ── cell class builder ─────────────────────────────────────────────────────
  function cellClass(dateStr: string, state: DayState): string {
    const base =
      "relative flex items-center justify-center rounded-lg text-sm font-medium transition-all select-none";

    // Size varies by screen – handled by the grid wrapper
    const size = "h-9 w-full";

    switch (state) {
      case "past":
        return `${base} ${size} text-zinc-700 cursor-default`;
      case "unavailable":
        return `${base} ${size} text-zinc-700 cursor-not-allowed line-through`;
      case "start":
        return `${base} ${size} bg-yellow-400 text-black font-bold cursor-pointer rounded-r-none`;
      case "end":
        return `${base} ${size} bg-yellow-400 text-black font-bold cursor-pointer rounded-l-none`;
      case "in-range":
        return `${base} ${size} bg-yellow-400/15 text-yellow-200 cursor-pointer rounded-none`;
      case "hover-range":
        return `${base} ${size} bg-yellow-400/10 text-zinc-300 cursor-pointer rounded-none`;
      case "today":
        return `${base} ${size} text-yellow-400 cursor-pointer hover:bg-zinc-800 ring-1 ring-yellow-400/40`;
      case "available":
        return `${base} ${size} text-zinc-200 cursor-pointer hover:bg-zinc-700/60`;
    }
    // Keep TS happy – unreachable
    return `${base} ${size}`;
  }

  // ── special edge: when start === end, both rounded ─────────────────────────
  // (single-day would be jumlahHari=0, so it can't really happen, but handle it)

  return (
    <div className="select-none">
      {/* ── Month nav header ─────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          disabled={!canGoPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-default disabled:opacity-25"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-white">
          {BULAN[viewMonth - 1]} {viewYear}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Bulan berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          ›
        </button>
      </div>

      {/* ── Instruction hint ─────────────────────────────────────────── */}
      <p className="mb-3 text-center text-xs text-zinc-500">
        {!tanggalAmbil
          ? "Pilih tanggal pengambilan"
          : pickingEnd
          ? "Pilih tanggal pengembalian"
          : null}
      </p>

      {/* ── Day-of-week headers ───────────────────────────────────────── */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {HARI.map((h) => (
          <div key={h} className="py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {h}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      {loadingAvailability ? (
        <Skeleton />
      ) : (
        <div
          className="grid grid-cols-7 gap-0.5"
          onMouseLeave={() => setHoverDate(null)}
        >
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} />;
            }
            const dateStr = toYMD(date);
            const state = getDayState(dateStr);
            const isStart = state === "start";
            const isEnd = state === "end";
            const isSingleStart = isStart && !tanggalKembali;

            // round both sides when it's a lone start (no end yet)
            const extraRound = isSingleStart ? "rounded-lg" : "";

            return (
              <button
                key={dateStr}
                type="button"
                disabled={state === "past" || state === "unavailable"}
                onClick={() => handleClick(dateStr)}
                onMouseEnter={() => handleMouseEnter(dateStr)}
                className={`${cellClass(dateStr, state)} ${extraRound}`}
                aria-label={dateStr}
                aria-pressed={isStart || isEnd}
                aria-disabled={state === "past" || state === "unavailable"}
              >
                {/* Today dot */}
                {dateStr === today && state !== "start" && state !== "end" && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-yellow-400" />
                )}
                {date.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Range summary ─────────────────────────────────────────────── */}
      {tanggalAmbil && tanggalKembali && jumlahHari > 0 && (
        <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-400">
            {jumlahHari} hari sewa
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatTanggal(tanggalAmbil)} → {formatTanggal(tanggalKembali)}
            &nbsp;· Ambil 08.00, kembali 21.00
          </p>
        </div>
      )}

      {/* ── Picking-end hint ──────────────────────────────────────────── */}
      {tanggalAmbil && !tanggalKembali && (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-500">
          Tanggal ambil: <span className="font-semibold text-zinc-300">{formatTanggal(tanggalAmbil)}</span>.
          Sekarang pilih tanggal kembali.
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────── */}
      {unavailableDates.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="h-3 w-3 rounded-sm bg-yellow-400" />
            Dipilih
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="h-3 w-3 rounded-sm bg-yellow-400/15" />
            Rentang sewa
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="h-3 w-3 rounded-sm bg-zinc-800 line-through text-zinc-600 text-[9px] flex items-center justify-center">×</span>
            Tidak tersedia
          </span>
        </div>
      )}
    </div>
  );
}
