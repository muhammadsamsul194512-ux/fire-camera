"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

type Camera = {
  id: number;
  nama: string;
  brand: string;
  deskripsi: string | null;
  harga_per_hari: number;
  stok: number;
  gambar_url: string | null;
};

type StokStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "tersedia"; stok: number }
  | { status: "habis" }
  | { status: "error"; message: string };

export default function KameraDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pengaturan = usePengaturan();
  const kameraId = params.id as string;

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [errorCamera, setErrorCamera] = useState("");

  const [tanggalAmbil, setTanggalAmbil] = useState(
    searchParams.get("tanggalAmbil") || ""
  );
  const [tanggalKembali, setTanggalKembali] = useState(
    searchParams.get("tanggalKembali") || ""
  );

  const [stokStatus, setStokStatus] = useState<StokStatus>({ status: "idle" });
  const [retryKey, setRetryKey] = useState(0);

  // ── Load camera ──────────────────────────────────────────────
  useEffect(() => {
    async function loadCamera() {
      const { data, error } = await supabase
        .from("camera")
        .select("id, nama, brand, deskripsi, harga_per_hari, stok, gambar_url")
        .eq("id", kameraId)
        .eq("aktif", true)
        .maybeSingle();

      if (error || !data) {
        setErrorCamera("Kamera tidak ditemukan.");
      } else {
        setCamera(data);
      }
      setLoadingCamera(false);
    }
    loadCamera();
  }, [kameraId]);

  // ── Check availability ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function cek() {
      if (!tanggalAmbil || !tanggalKembali) {
        setStokStatus({ status: "idle" });
        return;
      }
      if (hitungJumlahHari(tanggalAmbil, tanggalKembali) <= 0) {
        setStokStatus({ status: "idle" });
        return;
      }

      setStokStatus({ status: "loading" });
      try {
        const p = new URLSearchParams({
          kameraId,
          tanggalAmbil,
          jamAmbil: JAM_AMBIL,
          tanggalKembali,
          jamKembali: JAM_KEMBALI,
        });
        const res = await fetch(`/api/kamera/stok?${p}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStokStatus({
            status: "error",
            message: json.error || "Gagal mengecek ketersediaan.",
          });
          return;
        }
        const stok = Number(json.stokTersedia);
        setStokStatus(
          stok > 0 ? { status: "tersedia", stok } : { status: "habis" }
        );
      } catch {
        if (!cancelled)
          setStokStatus({
            status: "error",
            message: "Gagal mengecek ketersediaan.",
          });
      }
    }
    cek();
    return () => {
      cancelled = true;
    };
  }, [kameraId, tanggalAmbil, tanggalKembali, retryKey]);

  const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);
  const totalHarga = camera ? jumlahHari * camera.harga_per_hari : 0;
  const datesValid = jumlahHari > 0;
  // Only allow proceeding when availability is confirmed or not yet checked (idle).
  // Do NOT allow proceeding while loading or when known unavailable.
  const canProceed =
    datesValid &&
    (stokStatus.status === "tersedia" ||
      stokStatus.status === "idle" ||
      stokStatus.status === "error");

  // Retry: increment retryKey to force the availability useEffect to re-run
  function retryStok() {
    setRetryKey((k) => k + 1);
  }

  function buildSewaUrl(): string {
    const p = new URLSearchParams({ kameraId });
    if (tanggalAmbil) p.set("tanggalAmbil", tanggalAmbil);
    if (tanggalKembali) p.set("tanggalKembali", tanggalKembali);
    return `/sewa?${p}`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/kamera" />

      <main className="flex-1">
        {/* ── Loading ─────────────────────────────────────── */}
        {loadingCamera && (
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
            <p className="text-zinc-400">Memuat data kamera…</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────── */}
        {!loadingCamera && errorCamera && (
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-4xl">
              📷
            </div>
            <p className="mt-4 text-lg font-semibold text-red-400">
              {errorCamera}
            </p>
            <Link
              href="/kamera"
              className="mt-6 inline-block rounded-full bg-yellow-400 px-8 py-3 font-semibold text-black hover:bg-yellow-300 transition"
            >
              Lihat Semua Kamera
            </Link>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────── */}
        {!loadingCamera && camera && (
          <>
            {/* ── HERO BANNER ─────────────────────────────── */}
            <div className="relative w-full overflow-hidden border-b border-zinc-800 bg-zinc-900">
              {camera.gambar_url ? (
                <>
                  {/* blurred background fill */}
                  <div
                    className="absolute inset-0 scale-110"
                    style={{
                      backgroundImage: `url(${camera.gambar_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "blur(28px) brightness(0.25) saturate(0.4)",
                    }}
                  />
                  {/* sharp centred image */}
                  <div className="relative mx-auto flex max-w-5xl items-center justify-center px-6 py-10">
                    <img
                      src={camera.gambar_url}
                      alt={`${camera.brand} ${camera.nama}`}
                      className="max-h-[340px] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-9xl">
                  📷
                </div>
              )}
            </div>

            {/* ── BACK LINK ───────────────────────────────── */}
            <div className="mx-auto max-w-5xl px-6 pt-7">
              <Link
                href="/kamera"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-yellow-400 transition"
              >
                ← Kembali ke Daftar Kamera
              </Link>
            </div>

            {/* ── MAIN GRID ───────────────────────────────── */}
            <div className="mx-auto grid max-w-5xl gap-10 px-6 py-8 lg:grid-cols-5">
              {/* LEFT — camera info */}
              <div className="lg:col-span-3 space-y-8">
                {/* Title & price */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                    {camera.brand}
                  </p>
                  <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">
                    {camera.nama}
                  </h1>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-yellow-400">
                      {formatRupiah(camera.harga_per_hari)}
                    </span>
                    <span className="text-zinc-400">/ hari</span>
                  </div>
                </div>

                {/* Quick facts strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Merek
                    </p>
                    <p className="mt-1 text-sm font-semibold">{camera.brand}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Stok
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {camera.stok} unit
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Harga / Hari
                    </p>
                    <p className="mt-1 text-sm font-semibold text-yellow-400">
                      {formatRupiah(camera.harga_per_hari)}
                    </p>
                  </div>
                </div>

                {/* Description / specs */}
                {camera.deskripsi && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-400">
                      Deskripsi &amp; Spesifikasi
                    </h2>
                    <p className="whitespace-pre-line leading-7 text-zinc-300">
                      {camera.deskripsi}
                    </p>
                  </div>
                )}

                {/* Sample photos — placeholder until admin populates */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-400">
                    Foto Contoh Hasil
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex aspect-square items-center justify-center rounded-xl bg-zinc-800/60"
                      >
                        <svg
                          className="h-8 w-8 text-zinc-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M3.75 9h16.5m-16.5 2.25h.008v.008H3.75V11.25z"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-600">
                    Foto contoh hasil akan segera tersedia.
                  </p>
                </div>
              </div>

              {/* RIGHT — booking panel */}
              <div className="lg:col-span-2">
                <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <h2 className="text-lg font-bold">Mulai Sewa</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pilih tanggal untuk melihat harga dan ketersediaan.
                  </p>

                  {/* Date picker */}
                  <div className="mt-5">
                    <RentalDatePicker
                      tanggalAmbil={tanggalAmbil}
                      tanggalKembali={tanggalKembali}
                      onChangeTanggalAmbil={(v) => {
                        setTanggalAmbil(v);
                        if (tanggalKembali && v >= tanggalKembali)
                          setTanggalKembali("");
                      }}
                      onChangeTanggalKembali={setTanggalKembali}
                    />
                  </div>

                  {/* Availability status */}
                  {datesValid && (
                    <div className="mt-4">
                      {stokStatus.status === "loading" && (
                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-3">
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400 flex-shrink-0" />
                          <span className="text-sm text-zinc-400">
                            Mengecek ketersediaan…
                          </span>
                        </div>
                      )}

                      {stokStatus.status === "tersedia" && (
                        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                          <span className="text-green-400 font-bold">✓</span>
                          <span className="text-sm font-semibold text-green-400">
                            Tersedia
                            {stokStatus.stok <= 2
                              ? ` — tersisa ${stokStatus.stok} unit`
                              : ""}
                          </span>
                        </div>
                      )}

                      {stokStatus.status === "habis" && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                          <p className="font-semibold text-red-400">
                            × Tidak tersedia untuk tanggal ini
                          </p>
                          <p className="mt-1 text-xs text-red-300">
                            Coba pilih tanggal lain.
                          </p>
                        </div>
                      )}

                      {stokStatus.status === "error" && (
                        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
                          <p className="text-sm text-yellow-400">
                            Tidak dapat mengecek ketersediaan. Coba lagi.
                          </p>
                          <button
                            type="button"
                            onClick={retryStok}
                            className="mt-2 text-xs font-semibold text-yellow-400 underline hover:text-yellow-300 transition"
                          >
                            Coba lagi →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price breakdown */}
                  {datesValid && (
                    <div className="mt-5 space-y-2 border-t border-zinc-800 pt-5 text-sm">
                      <div className="flex justify-between text-zinc-400">
                        <span>
                          {formatRupiah(camera.harga_per_hari)} ×{" "}
                          {jumlahHari} hari
                        </span>
                        <span className="font-semibold text-white">
                          {formatRupiah(totalHarga)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-800 pt-2">
                        <span className="font-bold">Estimasi Total</span>
                        <span className="text-lg font-bold text-yellow-400">
                          {formatRupiah(totalHarga)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Harga final dikonfirmasi saat pemesanan.
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-6">
                    {stokStatus.status === "habis" ? (
                      <>
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-full bg-zinc-800 px-5 py-3 font-semibold text-zinc-500"
                        >
                          Tidak Tersedia
                        </button>
                        <p className="mt-2 text-center text-xs text-zinc-500">
                          Ubah tanggal di atas untuk mencoba periode lain.
                        </p>
                      </>
                    ) : !datesValid ? (
                      <>
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-full bg-zinc-800 px-5 py-3 font-semibold text-zinc-500"
                        >
                          Pilih Tanggal Terlebih Dahulu
                        </button>
                        <p className="mt-2 text-center text-xs text-zinc-500">
                          Pilih tanggal ambil dan kembali untuk melanjutkan.
                        </p>
                      </>
                    ) : (
                      <Link
                        href={buildSewaUrl()}
                        className="block w-full rounded-full bg-yellow-400 px-5 py-3 text-center font-semibold text-black transition hover:bg-yellow-300"
                      >
                        Pesan Sekarang →
                      </Link>
                    )}
                  </div>

                  {/* Dates summary under CTA */}
                  {datesValid && canProceed && (
                    <div className="mt-4 rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs text-zinc-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Tanggal ambil</span>
                        <span className="text-zinc-300">
                          {formatTanggal(tanggalAmbil)}, pukul 08.00
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tanggal kembali</span>
                        <span className="text-zinc-300">
                          {formatTanggal(tanggalKembali)}, pukul 21.00
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}
