"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import { supabase } from "@/lib/supabase";
import { getStatusLabel } from "@/lib/status";
import {
  countActiveFilters,
  DATE_FIELDS,
  filtersToApiParams,
  monthToDateRange,
  ORDER_STATUSES,
  SORT_OPTIONS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_FILTERS,
} from "@/lib/admin-filters";
import type { PesananFilters, DatePreset, DateField } from "@/lib/admin-filters";

// ─── Types ────────────────────────────────────────────────────────────────────

type Camera = { id: number; nama: string; brand: string };
type Pesanan = {
  id: number;
  nomor_pesanan: string;
  tanggal_ambil: string;
  jam_ambil: string;
  tanggal_kembali: string;
  jam_kembali: string;
  jumlah_hari: number;
  total_harga: number;
  status: string;
  created_at: string;
  customer?: { nama_lengkap?: string; whatsapp?: string; email?: string | null } | null;
  detail?: Array<{ jumlah?: number; harga_per_hari?: number; subtotal?: number; camera?: Camera | null }> | null;
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTanggal(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDatetime(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-yellow-400" />
      Memuat data pesanan…
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold text-white">
        {hasFilters ? "Tidak ada pesanan yang cocok" : "Belum ada pesanan"}
      </p>
      <p className="mt-2 text-sm text-gray-400">
        {hasFilters
          ? "Coba ubah filter atau kata kunci pencarian."
          : "Pesanan baru akan muncul di sini."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-full border border-gray-700 px-5 py-2 text-sm text-gray-300 hover:border-yellow-400 hover:text-yellow-400"
        >
          Reset semua filter
        </button>
      )}
    </div>
  );
}

function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Hapus filter: ${label}`}
        className="ml-0.5 rounded-full hover:text-yellow-100"
      >
        ×
      </button>
    </span>
  );
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function PaginationBar({
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  pagination: Pagination;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const { page, pageSize, total, totalPages } = pagination;
  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to   = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  if (totalPages !== null && totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (totalPages !== null) {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-800 px-5 py-4 text-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <span>{total > 0 ? `${from}–${to} dari ${total} pesanan` : "0 pesanan"}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Baris per halaman"
          className="rounded-lg border border-gray-700 bg-black px-2 py-1 text-xs text-white outline-none focus:border-yellow-400"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} per halaman</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹ Prev
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                p === page
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : "border-gray-700 text-gray-300 hover:border-yellow-400 hover:text-yellow-400"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={totalPages === null || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

// ─── Date preset label lookup ─────────────────────────────────────────────────

const DATE_PRESETS_LABEL: Record<string, string> = {
  today:        "Hari ini",
  yesterday:    "Kemarin",
  last7:        "7 hari terakhir",
  last30:       "30 hari terakhir",
  last3months:  "3 bulan terakhir",
  last6months:  "6 bulan terakhir",
  last12months: "12 bulan terakhir",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPesananPage() {
  const router = useRouter();

  const [draft,   setDraft]   = useState<PesananFilters>({ ...DEFAULT_FILTERS });
  const [applied, setApplied] = useState<PesananFilters>({ ...DEFAULT_FILTERS });

  const [pesanan,    setPesanan]    = useState<Pesanan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 25, total: 0, totalPages: null,
  });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filterError, setFilterError] = useState("");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Load cameras (once) ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadCameras() {
      try {
        const { data, error: cameraQueryError } = await supabase
          .from("camera")
          .select("id, nama, brand")
          .order("brand")
          .order("nama");
        if (cameraQueryError) {
          console.error("Gagal memuat daftar kamera:", cameraQueryError);
          setCameraError("Gagal memuat daftar kamera untuk filter.");
          return;
        }
        setCameras(data ?? []);
      } catch (cameraLoadError) {
        console.error("Gagal memuat daftar kamera:", cameraLoadError);
        setCameraError("Terjadi kesalahan saat memuat daftar kamera.");
      }
    }
    void loadCameras();
  }, []);

  const fetchRef = useRef(0);

  const fetchOrders = useCallback(async (filters: PesananFilters) => {
    const fetchId = ++fetchRef.current;
    setLoading(true);
    setError("");

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      const qs = filtersToApiParams(filters);
      const res = await fetch(`/api/admin/pesanan${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json() as { data?: Pesanan[]; pagination?: Pagination; error?: string };

      if (fetchId !== fetchRef.current) return;

      if (!res.ok) {
        setError(result.error ?? "Gagal mengambil data pesanan.");
        return;
      }

      setPesanan(Array.isArray(result.data) ? result.data : []);
      if (result.pagination) setPagination(result.pagination);
    } catch (e) {
      if (fetchId !== fetchRef.current) return;
      console.error("Gagal mengambil pesanan:", e);
      setError("Terjadi kesalahan saat mengambil data pesanan.");
    } finally {
      if (fetchId === fetchRef.current) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchOrders(applied);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  function setDraftField<K extends keyof PesananFilters>(key: K, value: PesananFilters[K]) {
    setFilterError("");
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleMonthChange(month: string) {
    setFilterError("");
    if (!month) {
      setDraft((prev) => ({
        ...prev,
        datePreset: "all",
        dateStart: "",
        dateEnd: "",
      }));
      return;
    }

    const range = monthToDateRange(month);
    if (!range) return;
    setDraft((prev) => ({
      ...prev,
      datePreset: "custom",
      dateStart: range.start,
      dateEnd: range.end,
    }));
  }

  function applyFilters() {
    if ((draft.datePreset === "custom" || draft.datePreset === "exact") && !draft.dateStart) {
      setFilterError(draft.datePreset === "custom"
        ? "Pilih tanggal awal untuk rentang kustom."
        : "Pilih tanggal tertentu.");
      return;
    }
    if (draft.datePreset === "custom" && draft.dateStart && draft.dateEnd
        && draft.dateEnd < draft.dateStart) {
      setFilterError("Tanggal akhir tidak boleh sebelum tanggal awal.");
      return;
    }
    setFilterError("");
    setError("");
    setApplied({ ...draft, page: 1 });
  }

  function resetFilters() {
    setFilterError("");
    setDraft({ ...DEFAULT_FILTERS });
    setApplied({ ...DEFAULT_FILTERS });
  }

  function handlePageChange(page: number) {
    setFilterError("");
    const next = { ...applied, page };
    setApplied(next);
    setDraft(next);
  }

  function handlePageSizeChange(pageSize: number) {
    setFilterError("");
    const next = { ...applied, pageSize, page: 1 };
    setApplied(next);
    setDraft(next);
  }

  function handleSortChange(value: string) {
    setFilterError("");
    const [sortField, sortDir] = value.split(":") as [PesananFilters["sortField"], PesananFilters["sortDir"]];
    const next = { ...applied, sortField, sortDir, page: 1 };
    setApplied(next);
    setDraft(next);
  }

  const activeCount = countActiveFilters(applied);
  const hasFilters  = activeCount > 0;

  function removeAppliedFilter(patch: Partial<PesananFilters>) {
    setFilterError("");
    const next = { ...applied, ...patch, page: 1 };
    setApplied(next);
    setDraft(next);
  }

  const CRITERIA_KEYS: (keyof PesananFilters)[] = [
    "search", "status", "cameraId",
    "datePreset", "dateField", "dateStart", "dateEnd",
  ];
  const isDirty = CRITERIA_KEYS.some((k) => draft[k] !== applied[k]);

  const selectClass =
    "rounded-xl border border-gray-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Kelola Pesanan</h1>
            <p className="mt-2 text-sm text-gray-400">
              Cari, filter, dan kelola semua pesanan penyewaan kamera.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:border-yellow-400 hover:text-yellow-400"
          >
            Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
            <button
              type="button"
              onClick={() => void fetchOrders(applied)}
              className="ml-3 underline hover:text-red-200"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Filter panel ── */}
        <section className="mb-5 rounded-2xl border border-gray-800 bg-gray-950 p-4 md:p-5 space-y-4">
          {filterError && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {filterError}
            </p>
          )}

          {/* Row 1: Search + sort */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                value={draft.search}
                onChange={(e) => setDraftField("search", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                placeholder="Cari nomor pesanan / pelanggan / WhatsApp…"
                aria-label="Cari pesanan"
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
              />
            </div>

            <select
              value={`${applied.sortField}:${applied.sortDir}`}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Urutan"
              className={selectClass}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                showAdvanced
                  ? "border-yellow-400 text-yellow-400"
                  : "border-gray-700 text-gray-300 hover:border-yellow-400 hover:text-yellow-400"
              }`}
            >
              Filter lanjutan
              {activeCount > 0 && (
                <span className="ml-1.5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Quick status pills */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDraftField("status", "")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !draft.status
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              Semua status
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraftField("status", draft.status === s ? "" : s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  draft.status === s
                    ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {getStatusLabel(s)}
              </button>
            ))}
          </div>

          {/* Advanced filter panel */}
          {showAdvanced && (
            <div className="border-t border-gray-800 pt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {/* Date filter */}
              <div className="xl:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Filter Tanggal
                </p>
                <AdminDateFilter
                  preset={draft.datePreset}
                  dateField={draft.dateField}
                  dateStart={draft.dateStart}
                  dateEnd={draft.dateEnd}
                  onPresetChange={(v) => setDraftField("datePreset", v as DatePreset)}
                  onDateFieldChange={(v) => setDraftField("dateField", v as DateField)}
                  onStartChange={(v) => setDraftField("dateStart", v)}
                  onEndChange={(v) => setDraftField("dateEnd", v)}
                  onMonthChange={handleMonthChange}
                />
              </div>

              {/* Camera filter */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kamera
                </p>
                <select
                  value={draft.cameraId}
                  onChange={(e) => setDraftField("cameraId", e.target.value)}
                  aria-label="Filter kamera"
                  className="w-full rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                >
                  <option value="">Semua kamera</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.brand} {c.nama}
                    </option>
                  ))}
                </select>
                {cameraError && (
                  <p role="alert" className="mt-2 text-xs text-red-400">{cameraError}</p>
                )}
              </div>

              {/* Page size */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Baris per halaman
                </p>
                <select
                  value={applied.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  aria-label="Baris per halaman"
                  className="w-full rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s} per halaman</option>
                  ))}
                </select>
              </div>

            </div>
          )}

          {/* Apply / Reset row */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-3">
            <button
              type="button"
              onClick={applyFilters}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                isDirty
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "border border-gray-700 text-gray-400 hover:border-yellow-400 hover:text-yellow-400"
              }`}
            >
              Terapkan Filter
            </button>

            {(hasFilters || isDirty) && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-400 hover:border-red-500/50 hover:text-red-400"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {applied.search && (
                <ActiveFilterPill
                  label={`Pencarian: "${applied.search}"`}
                  onRemove={() => removeAppliedFilter({ search: "" })}
                />
              )}
              {applied.status && (
                <ActiveFilterPill
                  label={`Status: ${getStatusLabel(applied.status)}`}
                  onRemove={() => removeAppliedFilter({ status: "" })}
                />
              )}
              {applied.cameraId && (
                <ActiveFilterPill
                  label={`Kamera: ${cameras.find((c) => String(c.id) === applied.cameraId)?.nama ?? applied.cameraId}`}
                  onRemove={() => removeAppliedFilter({ cameraId: "" })}
                />
              )}
              {applied.datePreset !== "all" && (
                <ActiveFilterPill
                  label={`${DATE_FIELDS.find((field) => field.value === applied.dateField)?.label ?? "Tanggal"}: ${
                    applied.datePreset === "exact"
                      ? applied.dateStart ? formatTanggal(applied.dateStart) : "—"
                      : applied.datePreset === "custom"
                        ? applied.dateStart && !applied.dateEnd
                          ? `${formatTanggal(applied.dateStart)} (satu hari; rentang belum lengkap)`
                          : `${applied.dateStart ? formatTanggal(applied.dateStart) : "—"} → ${applied.dateEnd ? formatTanggal(applied.dateEnd) : "—"}`
                        : (DATE_PRESETS_LABEL[applied.datePreset] ?? applied.datePreset)
                  }`}
                  onRemove={() => removeAppliedFilter({ datePreset: "all", dateStart: "", dateEnd: "" })}
                />
              )}
            </div>
          )}
        </section>

        {/* ── Table ── */}
        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div role="status" className="py-16 text-center text-sm text-gray-400">
              Hasil pesanan tidak ditampilkan karena filter gagal diproses.
            </div>
          ) : pesanan.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                      <th className="px-6 py-4">Pesanan</th>
                      <th className="px-6 py-4">Pelanggan</th>
                      <th className="px-6 py-4">Kamera</th>
                      <th className="px-6 py-4">Periode Sewa</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pesanan.map((item) => {
                      const details = Array.isArray(item.detail) ? item.detail : [];
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-900 hover:bg-gray-900/80"
                        >
                          <td className="px-6 py-5 align-middle">
                            <div className="font-semibold text-white">{item.nomor_pesanan}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatDatetime(item.created_at)}
                            </div>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <div className="font-medium text-white">
                              {item.customer?.nama_lengkap || "-"}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {item.customer?.whatsapp || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <div className="space-y-1 text-sm text-gray-300">
                              {details.length === 0 ? (
                                <div>-</div>
                              ) : (
                                details.map((d, idx) => (
                                  <div key={`${item.id}-${idx}`}>
                                    {d.camera?.brand || "-"} {d.camera?.nama || "-"}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-5 align-middle text-sm text-gray-300">
                            <div>
                              {formatTanggal(item.tanggal_ambil)} – {formatTanggal(item.tanggal_kembali)}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{item.jumlah_hari} hari</div>
                          </td>

                          <td className="px-6 py-5 align-middle font-semibold text-yellow-300">
                            {formatRupiah(item.total_harga)}
                          </td>

                          <td className="px-6 py-5 align-middle">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="px-6 py-5 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => router.push(`/admin/pesanan/${item.id}`)}
                              className="rounded-full border border-yellow-400 px-4 py-2 text-xs font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                pagination={pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}