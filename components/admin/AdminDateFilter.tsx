"use client";

import { useEffect, useRef, useState } from "react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { DATE_FIELDS, DATE_PRESETS } from "@/lib/admin-filters";
import type { DateField, DatePreset } from "@/lib/admin-filters";

type AdminDateFilterProps = {
  preset: DatePreset;
  dateField: DateField;
  dateStart: string;
  dateEnd: string;
  onPresetChange: (preset: DatePreset) => void;
  onDateFieldChange: (field: DateField) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function AdminDateFilter({
  preset,
  dateField,
  dateStart,
  dateEnd,
  onPresetChange,
  onDateFieldChange,
  onStartChange,
  onEndChange,
}: AdminDateFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isExact = preset === "exact";
  const isRange = preset === "custom";
  const hasDateSelection = Boolean(dateStart || dateEnd);
  const rangeError = isRange && dateStart && dateEnd && dateEnd < dateStart
    ? "Tanggal akhir tidak boleh sebelum tanggal awal."
    : "";
  const triggerLabel = isExact
    ? dateStart ? formatDate(dateStart) : "Pilih tanggal"
    : dateStart && dateEnd
      ? `${formatDate(dateStart)} → ${formatDate(dateEnd)}`
      : dateStart
        ? `${formatDate(dateStart)} → pilih tanggal akhir`
        : "Pilih rentang tanggal";

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function clearDateFilter() {
    onPresetChange("all");
    onStartChange("");
    onEndChange("");
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={dateField}
          onChange={(event) => onDateFieldChange(event.target.value as DateField)}
          aria-label="Filter berdasarkan kolom tanggal"
          className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
        >
          {DATE_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>{field.label}</option>
          ))}
        </select>

        <select
          value={preset}
          onChange={(event) => onPresetChange(event.target.value as DatePreset)}
          aria-label="Pilih rentang waktu"
          className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
        >
          {DATE_PRESETS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {(isExact || isRange) && (
        <div ref={wrapRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={isExact ? "Pilih tanggal pesanan" : "Pilih rentang tanggal pesanan"}
            aria-expanded={open}
            aria-controls={open ? "admin-order-date-calendar" : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
              open
                ? "border-yellow-400 bg-zinc-900 ring-1 ring-yellow-400/30"
                : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-600"
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0 text-zinc-500 group-hover:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
            <span className={hasDateSelection ? "font-semibold text-white" : "text-zinc-400"}>
              {triggerLabel}
            </span>
            <span className={`ml-auto text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
              ▾
            </span>
          </button>

          {open && (
            <div
              id="admin-order-date-calendar"
              className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-black/40"
            >
              <AvailabilityCalendar
                tanggalAmbil={dateStart}
                tanggalKembali={isRange ? dateEnd : ""}
                onChangeTanggalAmbil={onStartChange}
                onChangeTanggalKembali={onEndChange}
                selectionMode={isExact ? "filter-exact" : "filter-range"}
                allowPastDates
              />
              {isRange && dateStart && !dateEnd && (
                <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                  Pilih tanggal akhir untuk membuat rentang. Jika dibiarkan kosong, filter hanya mencakup tanggal awal.
                </p>
              )}
              {rangeError && (
                <p role="alert" className="mt-3 text-xs text-red-400">{rangeError}</p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="text-xs text-zinc-400 transition hover:text-white"
                >
                  Hapus filter tanggal
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-300"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {preset !== "all" && !isExact && !isRange && (
        <p className="text-xs text-zinc-400">
          Rentang: {DATE_PRESETS.find((option) => option.value === preset)?.label}
        </p>
      )}
    </div>
  );
}
