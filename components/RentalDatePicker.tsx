"use client";

/**
 * RentalDatePicker
 *
 * A clickable date-range trigger card that opens an AvailabilityCalendar.
 * The entire card is one interactive element — no tiny icon/button to hunt.
 *
 * Props are intentionally identical to the previous RentalDatePicker so
 * all existing callers (catalog, detail, sewa) work without changes.
 *
 * Extra optional props
 * ────────────────────
 * unavailableDates     Set<string>  passed through to the calendar
 * loadingAvailability  boolean      skeleton while availability loads
 * compact              boolean      smaller inline layout (catalog bar)
 */

import { useEffect, useRef, useState } from "react";
import { formatTanggal, hitungJumlahHari } from "@/lib/utils";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

export type RentalDatePickerProps = {
  tanggalAmbil: string;
  tanggalKembali: string;
  onChangeTanggalAmbil: (v: string) => void;
  onChangeTanggalKembali: (v: string) => void;
  unavailableDates?: Set<string>;
  loadingAvailability?: boolean;
  /** Compact variant used in the catalog header bar */
  compact?: boolean;
};

export default function RentalDatePicker({
  tanggalAmbil,
  tanggalKembali,
  onChangeTanggalAmbil,
  onChangeTanggalKembali,
  unavailableDates = new Set(),
  loadingAvailability = false,
  compact = false,
}: RentalDatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);
  const hasRange = tanggalAmbil && tanggalKembali && jumlahHari > 0;
  const pickingEnd = !!(tanggalAmbil && !tanggalKembali);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Trigger card ──────────────────────────────────────────────────────────
  function renderTrigger() {
    if (compact) {
      // Narrow single-row bar used in the catalog page
      return (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`
            group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm
            transition-all duration-150
            ${open
              ? "border-yellow-400 bg-zinc-900 ring-1 ring-yellow-400/30"
              : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-600 hover:bg-zinc-900"
            }
          `}
        >
          {/* Calendar icon */}
          <svg className="h-4 w-4 flex-shrink-0 text-zinc-500 group-hover:text-yellow-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>

          {hasRange ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-white">{formatTanggal(tanggalAmbil)}</span>
              <span className="text-zinc-500">→</span>
              <span className="font-semibold text-white">{formatTanggal(tanggalKembali)}</span>
              <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                {jumlahHari} hari
              </span>
            </span>
          ) : pickingEnd ? (
            <span className="text-zinc-400">
              Dari <span className="font-semibold text-white">{formatTanggal(tanggalAmbil)}</span>
              {" "}— pilih tanggal kembali…
            </span>
          ) : (
            <span className="text-zinc-500">Pilih tanggal sewa…</span>
          )}

          {/* Caret */}
          <svg className={`ml-auto h-4 w-4 flex-shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      );
    }

    // ── Full-size trigger (detail page, sewa page) ─────────────────────────
    return (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          group w-full rounded-2xl border p-4 text-left transition-all duration-150
          ${open
            ? "border-yellow-400 bg-zinc-950 ring-1 ring-yellow-400/20"
            : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
          }
        `}
      >
        {/* Label row */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Periode Sewa
          </p>
          {open ? (
            <span className="text-xs text-yellow-400">Tutup ↑</span>
          ) : (
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition">
              Klik untuk memilih
            </span>
          )}
        </div>

        {/* Date range display */}
        <div className="grid grid-cols-2 gap-3">
          {/* Start date */}
          <div className={`rounded-xl border px-3 py-2.5 transition ${
            tanggalAmbil
              ? "border-yellow-400/30 bg-yellow-400/5"
              : "border-zinc-800 bg-zinc-900"
          }`}>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Tanggal Ambil
            </p>
            {tanggalAmbil ? (
              <p className="text-sm font-bold text-white">{formatTanggal(tanggalAmbil)}</p>
            ) : (
              <p className="text-sm text-zinc-600">Belum dipilih</p>
            )}
          </div>

          {/* Arrow + end date */}
          <div className={`rounded-xl border px-3 py-2.5 transition ${
            tanggalKembali
              ? "border-yellow-400/30 bg-yellow-400/5"
              : pickingEnd
              ? "border-zinc-700 bg-zinc-900 animate-pulse"
              : "border-zinc-800 bg-zinc-900"
          }`}>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Tanggal Kembali
            </p>
            {tanggalKembali ? (
              <p className="text-sm font-bold text-white">{formatTanggal(tanggalKembali)}</p>
            ) : pickingEnd ? (
              <p className="text-sm text-zinc-500">Pilih tanggal…</p>
            ) : (
              <p className="text-sm text-zinc-600">Belum dipilih</p>
            )}
          </div>
        </div>

        {/* Duration pill */}
        {hasRange ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-bold text-yellow-400">
              {jumlahHari} hari sewa
            </span>
            <span className="text-xs text-zinc-600">
              Ambil 08.00 · Kembali 21.00
            </span>
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-600">
            💡 Ambil mulai 08.00, kembali hingga 21.00
          </p>
        )}
      </button>
    );
  }

  // ── Calendar panel ────────────────────────────────────────────────────────
  function renderCalendarPanel() {
    if (!open) return null;

    return (
      <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-black/40">
        <AvailabilityCalendar
          tanggalAmbil={tanggalAmbil}
          tanggalKembali={tanggalKembali}
          onChangeTanggalAmbil={onChangeTanggalAmbil}
          onChangeTanggalKembali={(v) => {
            onChangeTanggalKembali(v);
            // Auto-close once the end date is confirmed
            if (v) setOpen(false);
          }}
          unavailableDates={unavailableDates}
          loadingAvailability={loadingAvailability}
        />

        {/* Clear / Done actions */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={() => {
              onChangeTanggalAmbil("");
              onChangeTanggalKembali("");
            }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition"
          >
            Hapus pilihan
          </button>
          {hasRange && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-300"
            >
              Konfirmasi →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      {renderTrigger()}
      {renderCalendarPanel()}
    </div>
  );
}
