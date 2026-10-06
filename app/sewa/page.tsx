"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RentalDatePicker from "@/components/RentalDatePicker";
import { usePengaturan } from "@/hooks/usePengaturan";
import {
  formatRupiah,
  formatTanggal,
  hitungJumlahHari,
  JAM_AMBIL,
  JAM_KEMBALI,
} from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type KameraOption = {
  id: number;
  nama: string;
  brand: string;
  harga_per_hari: number;
  stok: number;
  gambar_url: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline date-edit panel (toggled by the "Ubah" link)
// ─────────────────────────────────────────────────────────────────────────────
function DateEditPanel({
  tanggalAmbil,
  tanggalKembali,
  onSave,
  onCancel,
}: {
  tanggalAmbil: string;
  tanggalKembali: string;
  onSave: (ambil: string, kembali: string) => void;
  onCancel: () => void;
}) {
  const [localAmbil, setLocalAmbil] = useState(tanggalAmbil);
  const [localKembali, setLocalKembali] = useState(tanggalKembali);
  const days = hitungJumlahHari(localAmbil, localKembali);

  return (
    <div className="mt-3 rounded-xl border border-yellow-400/30 bg-zinc-950 p-4">
      <RentalDatePicker
        tanggalAmbil={localAmbil}
        tanggalKembali={localKembali}
        onChangeTanggalAmbil={(v) => {
          setLocalAmbil(v);
          if (localKembali && v >= localKembali) setLocalKembali("");
        }}
        onChangeTanggalKembali={setLocalKembali}
      />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={days <= 0}
          onClick={() => onSave(localAmbil, localKembali)}
          className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
        >
          Simpan Tanggal
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page content (needs useSearchParams so wrapped in Suspense below)
// ─────────────────────────────────────────────────────────────────────────────
function SewaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pengaturan = usePengaturan();

  // Pre-fill from URL params
  const kameraIdFromUrl = searchParams.get("kameraId") || "";
  const tanggalAmbilFromUrl = searchParams.get("tanggalAmbil") || "";
  const tanggalKembaliFromUrl = searchParams.get("tanggalKembali") || "";

  // ── Camera list (needed to resolve id → object) ──────────────
  const [daftarKamera, setDaftarKamera] = useState<KameraOption[]>([]);
  const [loadingKamera, setLoadingKamera] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("camera")
        .select("id, nama, brand, harga_per_hari, stok, gambar_url")
        .eq("aktif", true)
        .order("id", { ascending: true });
      setDaftarKamera(data || []);
      setLoadingKamera(false);
    }
    load();
  }, []);

  // ── Selections (camera + dates) ───────────────────────────────
  const [kameraId, setKameraId] = useState(kameraIdFromUrl);
  const [tanggalAmbil, setTanggalAmbil] = useState(tanggalAmbilFromUrl);
  const [tanggalKembali, setTanggalKembali] = useState(tanggalKembaliFromUrl);
  const [jumlah, setJumlah] = useState(1);

  // Inline date-edit toggle
  const [editingDates, setEditingDates] = useState(
    !tanggalAmbilFromUrl || !tanggalKembaliFromUrl
  );

  // ── Customer form fields ──────────────────────────────────────
  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Derived ───────────────────────────────────────────────────
  const kameraTerpilih = useMemo(
    () => daftarKamera.find((c) => String(c.id) === String(kameraId)) ?? null,
    [daftarKamera, kameraId]
  );

  // Clamp jumlah at render time (derived — no effect needed)
  const jumlahEfektif =
    kameraTerpilih && kameraTerpilih.stok > 0
      ? Math.min(jumlah, kameraTerpilih.stok)
      : jumlah;

  const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);
  const hargaPerHari = kameraTerpilih?.harga_per_hari ?? 0;
  const totalHarga = jumlahHari * jumlahEfektif * hargaPerHari;
  const datesValid = jumlahHari > 0;

  // ── Submission ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nama.trim()) { setError("Nama lengkap wajib diisi."); return; }
    if (!whatsapp.trim()) { setError("Nomor WhatsApp wajib diisi."); return; }
    if (!kameraId) { setError("Silakan pilih kamera terlebih dahulu."); return; }
    if (!tanggalAmbil || !tanggalKembali) {
      setError("Tanggal pengambilan dan pengembalian wajib diisi.");
      return;
    }
    if (jumlahHari <= 0) {
      setError("Tanggal kembali harus setelah tanggal ambil.");
      return;
    }
    if (jumlahEfektif < 1) { setError("Jumlah kamera minimal 1."); return; }
    if (!kameraTerpilih) { setError("Data kamera tidak ditemukan."); return; }

    try {
      setLoading(true);

      const res = await fetch("/api/sewa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          whatsapp,
          email,
          kamera: kameraTerpilih.nama,
          kameraId: kameraTerpilih.id,
          tanggalAmbil,
          jamAmbil: JAM_AMBIL,
          tanggalKembali,
          jamKembali: JAM_KEMBALI,
          jumlah: jumlahEfektif,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan.");
        return;
      }

      router.push(
        `/pembayaran?pesanan=${encodeURIComponent(data.nomorPesanan)}&total=${data.totalHarga}`
      );
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white text-sm outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30";

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/sewa" />

      {/* PAGE HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-400">
            Pemesanan
          </p>
          <h1 className="mt-1.5 text-3xl font-bold">Tinjau &amp; Pesan</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Periksa pilihan kamera dan tanggal sewa, lalu lengkapi data diri
            untuk melanjutkan ke pembayaran.
          </p>
        </div>
      </section>

      {/* BREADCRUMB PROGRESS */}
      <div className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center gap-0 px-6 py-3 text-xs">
          <Link href="/kamera" className="text-zinc-500 hover:text-yellow-400 transition">
            Pilih Kamera
          </Link>
          <span className="mx-2 text-zinc-700">›</span>
          <span className="font-semibold text-yellow-400">Tinjau &amp; Pesan</span>
          <span className="mx-2 text-zinc-700">›</span>
          <span className="text-zinc-600">Pembayaran</span>
        </div>
      </div>

      {/* FORM BODY */}
      <section className="flex-1">
        <form onSubmit={handleSubmit}>
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-3">

            {/* ── LEFT — review sections + customer form ──── */}
            <div className="space-y-6 lg:col-span-2">

              {/* ─ SECTION 1: Camera selection ─ */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Kamera yang Dipilih</h2>
                  <Link
                    href="/kamera"
                    className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition"
                  >
                    Ubah →
                  </Link>
                </div>

                {loadingKamera ? (
                  <div className="mt-4 flex items-center gap-3 text-sm text-zinc-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
                    Memuat…
                  </div>
                ) : kameraTerpilih ? (
                  /* ─ Camera is already selected (happy path) ─ */
                  <div className="mt-4 flex gap-4">
                    {kameraTerpilih.gambar_url ? (
                      <img
                        src={kameraTerpilih.gambar_url}
                        alt={kameraTerpilih.nama}
                        className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-3xl">
                        📷
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
                        {kameraTerpilih.brand}
                      </p>
                      <p className="text-base font-bold leading-snug">
                        {kameraTerpilih.nama}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatRupiah(kameraTerpilih.harga_per_hari)} / hari
                      </p>
                      {kameraTerpilih.stok > 1 && (
                        <p className="mt-0.5 text-xs text-zinc-600">
                          Stok: {kameraTerpilih.stok} unit
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ─ No camera selected — show selector ─ */
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-zinc-500">
                      Belum ada kamera dipilih. Pilih dari daftar atau gunakan
                      selector di bawah.
                    </p>
                    <select
                      value={kameraId}
                      onChange={(e) => {
                        setKameraId(e.target.value);
                        setJumlah(1);
                      }}
                      className={inputClass}
                    >
                      <option value="">— Pilih kamera —</option>
                      {daftarKamera.map((cam) => (
                        <option key={cam.id} value={String(cam.id)}>
                          {cam.brand} {cam.nama} —{" "}
                          {formatRupiah(cam.harga_per_hari)}/hari
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/kamera"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition"
                    >
                      ← Lihat semua kamera
                    </Link>
                  </div>
                )}

                {/* Quantity (only when stok > 1) */}
                {kameraTerpilih && kameraTerpilih.stok > 1 && (
                  <div className="mt-5 border-t border-zinc-800 pt-5">
                    <label className="mb-1.5 block text-sm font-medium">
                      Jumlah Kamera
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={kameraTerpilih.stok}
                      value={jumlahEfektif}
                      onChange={(e) =>
                        setJumlah(
                          Math.min(
                            kameraTerpilih.stok,
                            Math.max(1, Number(e.target.value))
                          )
                        )
                      }
                      className={`${inputClass} max-w-[120px]`}
                    />
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Maksimal {kameraTerpilih.stok} unit.
                    </p>
                  </div>
                )}
              </div>

              {/* ─ SECTION 2: Dates ─ */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Periode Sewa</h2>
                  {!editingDates && (
                    <button
                      type="button"
                      onClick={() => setEditingDates(true)}
                      className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition"
                    >
                      Ubah →
                    </button>
                  )}
                </div>

                {datesValid && !editingDates ? (
                  /* ─ Dates confirmed — show as locked summary ─ */
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
                      <span className="text-zinc-500">Tanggal ambil</span>
                      <span className="font-semibold">
                        {formatTanggal(tanggalAmbil)},{" "}
                        <span className="text-zinc-400 font-normal">pukul 08.00</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
                      <span className="text-zinc-500">Tanggal kembali</span>
                      <span className="font-semibold">
                        {formatTanggal(tanggalKembali)},{" "}
                        <span className="text-zinc-400 font-normal">pukul 21.00</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-yellow-400/15 bg-yellow-400/5 px-4 py-3 text-sm">
                      <span className="text-yellow-400">Durasi sewa</span>
                      <span className="font-bold text-yellow-400">
                        {jumlahHari} hari
                      </span>
                    </div>
                  </div>
                ) : (
                  /* ─ No valid dates or editing mode ─ */
                  <>
                    {!datesValid && !editingDates && (
                      <p className="mt-3 text-sm text-zinc-500">
                        Belum ada tanggal dipilih.
                      </p>
                    )}
                    <DateEditPanel
                      tanggalAmbil={tanggalAmbil}
                      tanggalKembali={tanggalKembali}
                      onSave={(a, k) => {
                        setTanggalAmbil(a);
                        setTanggalKembali(k);
                        setEditingDates(false);
                      }}
                      onCancel={() => setEditingDates(false)}
                    />
                  </>
                )}
              </div>

              {/* ─ SECTION 3: Customer data ─ */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-7">
                <h2 className="text-base font-bold">Data Penyewa</h2>

                <div className="mt-5 space-y-5">
                  {/* Nama */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Nama Lengkap <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama lengkap sesuai KTP"
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Nomor WhatsApp <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className={inputClass}
                      required
                    />
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Digunakan untuk mengecek status pesanan.
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Email{" "}
                      <span className="text-zinc-500 font-normal">(opsional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT — order summary + submit ──────────── */}
            <div>
              <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-bold">Ringkasan Pesanan</h2>

                {/* Camera preview thumbnail */}
                {kameraTerpilih?.gambar_url ? (
                  <img
                    src={kameraTerpilih.gambar_url}
                    alt={kameraTerpilih.nama}
                    className="mt-4 h-32 w-full rounded-xl object-cover"
                  />
                ) : kameraTerpilih ? (
                  <div className="mt-4 flex h-32 items-center justify-center rounded-xl bg-zinc-800 text-5xl">
                    📷
                  </div>
                ) : null}

                {/* Summary rows */}
                <div className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Penyewa</span>
                    <span className="text-right">{nama || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Kamera</span>
                    <span className="text-right font-medium">
                      {kameraTerpilih
                        ? `${kameraTerpilih.brand} ${kameraTerpilih.nama}`
                        : "—"}
                    </span>
                  </div>
                  {jumlahEfektif > 1 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-500">Jumlah</span>
                      <span>{jumlahEfektif} unit</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Periode</span>
                    <span className="text-right">
                      {tanggalAmbil && tanggalKembali
                        ? `${formatTanggal(tanggalAmbil)} – ${formatTanggal(tanggalKembali)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Durasi</span>
                    <span>{jumlahHari > 0 ? `${jumlahHari} hari` : "—"}</span>
                  </div>

                  {/* Price breakdown */}
                  {jumlahHari > 0 && hargaPerHari > 0 && (
                    <div className="border-t border-zinc-800 pt-3 space-y-2">
                      <div className="flex justify-between text-zinc-400">
                        <span>
                          {formatRupiah(hargaPerHari)}
                          {jumlahEfektif > 1 ? ` × ${jumlahEfektif}` : ""} × {jumlahHari} hari
                        </span>
                        <span className="font-semibold text-white">
                          {formatRupiah(totalHarga)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-3 flex items-end justify-between gap-2">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-bold text-yellow-400">
                      {jumlahHari > 0 && hargaPerHari > 0
                        ? formatRupiah(totalHarga)
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full rounded-full bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Memproses…" : "Lanjut ke Pembayaran →"}
                </button>

                <p className="mt-3 text-center text-xs text-zinc-600">
                  Ketersediaan dikonfirmasi saat pemesanan diproses.
                </p>
              </div>
            </div>

          </div>
        </form>
      </section>

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}

export default function SewaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
        </div>
      }
    >
      <SewaContent />
    </Suspense>
  );
}
