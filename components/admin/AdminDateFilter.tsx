"use client";

import { useEffect, useId, useRef, useState } from "react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import {
  dateRangeToMonthValue,
  DATE_FIELDS,
  DATE_PRESETS,
  monthToDateRange,
} from "@/lib/admin-filters";
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
  onMonthChange: (month: string) => void;
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

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return "";
  const monthName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, month - 1, 1)));
  return `${monthName} ${String(year).padStart(4, "0")}`;
}

function getJakartaMonth() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
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
  onMonthChange,
}: AdminDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [monthViewYear, setMonthViewYear] = useState(0);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const monthWrapRef = useRef<HTMLDivElement>(null);
  const monthTriggerRef = useRef<HTMLButtonElement>(null);
  const monthOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const monthLabelId = useId();
  const monthValueId = useId();
  const monthPopoverId = useId();
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
  const monthValue = isRange ? dateRangeToMonthValue(dateStart, dateEnd) : "";
  const selectedMonthLabel = monthValue ? formatMonth(monthValue) : "";
  const monthValueParts = monthValue.split("-").map(Number);

  function handlePresetChange(value: DatePreset) {
    onPresetChange(value);
    if (value === "all") {
      onStartChange("");
      onEndChange("");
    }
  }

  function handleMonthChange(value: string) {
    if (!value) {
      onMonthChange("");
      return;
    }
    if (monthToDateRange(value)) onMonthChange(value);
  }

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

  useEffect(() => {
    if (!monthOpen) return;
    monthOptionRefs.current[activeMonthIndex]?.focus();

    function handleOutsidePointerDown(event: PointerEvent) {
      if (monthWrapRef.current && !monthWrapRef.current.contains(event.target as Node)) {
        setMonthOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMonthOpen(false);
        monthTriggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeMonthIndex, monthOpen]);

  function clearDateFilter() {
    handlePresetChange("all");
    setOpen(false);
  }

  function toggleMonthMenu() {
    if (monthOpen) {
      setMonthOpen(false);
      return;
    }

    const current = getJakartaMonth();
    const dateStartParts = dateStart.split("-").map(Number);
    const selectedYear = dateStartParts[0] || current.year;
    const selectedMonth = monthValueParts[1]
      || dateStartParts[1]
      || (selectedYear === current.year ? current.month : 1);
    setMonthViewYear(selectedYear);
    setActiveMonthIndex(selectedMonth - 1);
    setMonthOpen(true);
  }

  function selectMonth(month: number) {
    const value = `${String(monthViewYear).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    handleMonthChange(value);
    setMonthOpen(false);
    monthTriggerRef.current?.focus();
  }

  function moveMonthFocus(index: number) {
    const nextIndex = Math.max(0, Math.min(11, index));
    setActiveMonthIndex(nextIndex);
    monthOptionRefs.current[nextIndex]?.focus();
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
          onChange={(event) => handlePresetChange(event.target.value as DatePreset)}
          aria-label="Pilih rentang waktu"
          className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
        >
          {DATE_PRESETS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div
        ref={monthWrapRef}
        className={`relative ${monthOpen ? "z-50" : "z-10"}`}
      >
        <span id={monthLabelId} className="mb-1 block text-xs text-zinc-400">
          Bulan Cepat · {DATE_FIELDS.find((field) => field.value === dateField)?.label}
        </span>
        <button
          ref={monthTriggerRef}
          type="button"
          onClick={toggleMonthMenu}
          aria-haspopup="dialog"
          aria-expanded={monthOpen}
          aria-controls={monthOpen ? monthPopoverId : undefined}
          aria-labelledby={`${monthLabelId} ${monthValueId}`}
          className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-zinc-900/80 px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 ${
            monthOpen
              ? "border-yellow-400 ring-1 ring-yellow-400/30"
              : "border-zinc-800 hover:border-zinc-600 active:border-yellow-400"
          }`}
        >
          <span
            id={monthValueId}
            className={selectedMonthLabel ? "font-medium capitalize text-white" : "text-zinc-400"}
          >
            {selectedMonthLabel || "Pilih bulan"}
          </span>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${monthOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 011.06 0L10 11.19l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {monthOpen && (
          <div
            id={monthPopoverId}
            role="dialog"
            aria-label="Pilih bulan cepat"
            className="absolute left-0 top-full z-[60] mt-2 w-full min-w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-black/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                disabled={monthViewYear <= 1}
                onClick={() => setMonthViewYear((year) => year - 1)}
                aria-label="Tahun sebelumnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹
              </button>
              <p className="text-sm font-semibold text-white">{monthViewYear}</p>
              <button
                type="button"
                disabled={monthViewYear >= 9999}
                onClick={() => setMonthViewYear((year) => year + 1)}
                aria-label="Tahun berikutnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ›
              </button>
            </div>
            <div role="group" aria-label={`Bulan tahun ${monthViewYear}`} className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const monthText = new Intl.DateTimeFormat("id-ID", {
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(2000, index, 1)));
                const value = `${String(monthViewYear).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
                const isSelected = monthValue === value;

                return (
                  <button
                    key={month}
                    ref={(element) => { monthOptionRefs.current[index] = element; }}
                    type="button"
                    tabIndex={activeMonthIndex === index ? 0 : -1}
                    aria-label={`Pilih ${formatMonth(value)}`}
                    aria-pressed={isSelected}
                    onClick={() => selectMonth(month)}
                    onKeyDown={(event) => {
                      switch (event.key) {
                        case "ArrowRight":
                          event.preventDefault();
                          moveMonthFocus((index + 1) % 12);
                          break;
                        case "ArrowLeft":
                          event.preventDefault();
                          moveMonthFocus((index + 11) % 12);
                          break;
                        case "ArrowDown":
                          event.preventDefault();
                          moveMonthFocus((index + 3) % 12);
                          break;
                        case "ArrowUp":
                          event.preventDefault();
                          moveMonthFocus((index + 9) % 12);
                          break;
                        case "Home":
                          event.preventDefault();
                          moveMonthFocus(0);
                          break;
                        case "End":
                          event.preventDefault();
                          moveMonthFocus(11);
                          break;
                      }
                    }}
                    className={`min-h-10 rounded-lg border px-2 py-2 text-sm capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 ${
                      isSelected
                        ? "border-yellow-400 bg-yellow-400/10 font-semibold text-yellow-300"
                        : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {monthText}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
