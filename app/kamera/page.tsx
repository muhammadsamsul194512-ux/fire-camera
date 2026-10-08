"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RentalDatePicker from "@/components/RentalDatePicker";
import { usePengaturan } from "@/hooks/usePengaturan";
import { useBookingStore } from "@/lib/booking-store";
import {
  formatRupiah,
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

type StokState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: Record<number, number> }
  | { status: "error"; message: string };

export default function KameraPage() {
  const pengaturan = usePengaturan();
  const setBooking = useBookingStore((state) => state.setBooking);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [errorCameras, setErrorCameras] = useState("");

  const [tanggalAmbil, setTanggalAmbil] = useState("");
  const [tanggalKembali, setTanggalKembali] = useState("");

  const [stokState, setStokState] = useState<StokState>({ status: "idle" });

  // Load cameras once on mount
  useEffect(() => {
    async function loadCameras() {
      const { data, error } = await supabase
        .from("camera")
        .select("id, nama, brand, deskripsi, harga_per_hari, stok, gambar_url")
        .eq("aktif", true)
        .order("id", { ascending: true });

      if (error) {
        setErrorCameras("Gagal memuat daftar kamera. Silakan coba lagi.");
      } else {
        setCameras(data || []);
      }
      setLoadingCameras(false);
    }
    loadCameras();
  }, []);

  // Check availability whenever valid dates are set
  const cekStok = useCallback(async () => {
    if (!tanggalAmbil || !tanggalKembali) {
      setStokState({ status: "idle" });
      return;
    }
    const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);
    if (jumlahHari <= 0) {
      setStokState({ status: "idle" });
      return;
    }

    setStokState({ status: "loading" });

    try {
      const results = await Promise.all(
        cameras.map(async (cam) => {
          const params = new URLSearchParams({
            kameraId: String(cam.id),
            tanggalAmbil,
            jamAmbil: JAM_AMBIL,
            tanggalKembali,
            jamKembali: JAM_KEMBALI,
          });
          const res = await fetch(`/api/kamera/stok?${params}`);
          const json = await res.json();
          return {
            id: cam.id,
            stok: res.ok ? Number(json.stokTersedia) : cam.stok,
          };
        }),
      );

      const map: Record<number, number> = {};
      results.forEach((r) => {
        map[r.id] = r.stok;
      });
      setStokState({ status: "done", data: map });
    } catch {
      setStokState({
        status: "error",
        message: "Gagal mengecek ketersediaan. Silakan coba lagi.",
      });
    }
  }, [cameras, tanggalAmbil, tanggalKembali]);

  useEffect(() => {
    async function run() {
      await cekStok();
    }
    run();
  }, [cekStok]);

  // Derived data
  const datesSelected = !!(
    tanggalAmbil &&
    tanggalKembali &&
    hitungJumlahHari(tanggalAmbil, tanggalKembali) > 0
  );

  function getStok(cam: Camera): number {
    if (stokState.status === "done") return stokState.data[cam.id] ?? cam.stok;
    return cam.stok;
  }

  function buildSewaUrl(): string {
    return "/sewa";
  }

  function setSelectedBooking(cam: Camera) {
    setBooking({
      cameraId: String(cam.id),
      tanggalAmbil,
      tanggalKembali,
    });
  }

  function canBookCamera(cam: Camera): boolean {
    return Boolean(
      datesSelected && stokState.status === "done" && getStok(cam) > 0,
    );
  }

  function buildDetailUrl(cam: Camera): string {
    const params = new URLSearchParams();
    if (tanggalAmbil) params.set("tanggalAmbil", tanggalAmbil);
    if (tanggalKembali) params.set("tanggalKembali", tanggalKembali);
    const qs = params.toString();
    return `/kamera/${cam.id}${qs ? `?${qs}` : ""}`;
  }

  // Split cameras into available and unavailable when dates are chosen
  const camerasAvailable = datesSelected
    ? cameras.filter((c) => getStok(c) > 0)
    : cameras;
  const camerasUnavailable = datesSelected
    ? cameras.filter((c) => getStok(c) <= 0)
    : [];

  const jumlahHari = hitungJumlahHari(tanggalAmbil, tanggalKembali);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/kamera" />

      {/* PAGE HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-yellow-400">
            Koleksi Kamera
          </p>
          <h1 className="text-4xl font-bold md:text-5xl">Daftar Kamera</h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Pilih tanggal sewa untuk melihat ketersediaan, atau langsung
            jelajahi koleksi kamera kami.
          </p>
        </div>
      </section>

      {/* DATE PICKER */}
      <section className="border-b border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <RentalDatePicker
            tanggalAmbil={tanggalAmbil}
            tanggalKembali={tanggalKembali}
            onChangeTanggalAmbil={(v) => {
              setTanggalAmbil(v);
              if (tanggalKembali && v >= tanggalKembali) setTanggalKembali("");
            }}
            onChangeTanggalKembali={setTanggalKembali}
            loadingAvailability={stokState.status === "loading"}
            compact
          />
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* Loading cameras */}
        {loadingCameras && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
            <p className="text-zinc-400">Memuat daftar kamera…</p>
          </div>
        )}

        {/* Error loading cameras */}
        {!loadingCameras && errorCameras && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-red-400 font-semibold">Gagal memuat kamera</p>
            <p className="mt-2 text-sm text-red-300">{errorCameras}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full bg-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-400 transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty catalog */}
        {!loadingCameras && !errorCameras && cameras.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-4xl mb-4">📷</p>
            <p className="font-semibold text-zinc-300">
              Belum ada kamera tersedia.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Silakan kembali lagi nanti.
            </p>
          </div>
        )}

        {!loadingCameras && !errorCameras && cameras.length > 0 && (
          <>
            {/* Availability checking */}
            {stokState.status === "loading" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400 flex-shrink-0" />
                <p className="text-sm text-zinc-400">
                  Mengecek ketersediaan kamera…
                </p>
              </div>
            )}

            {stokState.status === "error" && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-sm text-red-400">{stokState.message}</p>
                <button
                  onClick={cekStok}
                  className="flex-shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Summary when dates are selected */}
            {datesSelected && stokState.status === "done" && (
              <div className="mb-6">
                {camerasAvailable.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                    <p className="text-sm text-zinc-400">
                      <span className="font-semibold text-green-400">
                        {camerasAvailable.length} kamera tersedia
                      </span>{" "}
                      untuk {jumlahHari} hari yang kamu pilih.
                    </p>
                    <button
                      onClick={() => {
                        setTanggalAmbil("");
                        setTanggalKembali("");
                      }}
                      className="ml-auto flex-shrink-0 text-xs text-zinc-600 hover:text-zinc-400 transition"
                    >
                      Hapus filter
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-6 py-6 text-center">
                    <p className="text-2xl mb-3">📅</p>
                    <p className="font-semibold text-yellow-400">
                      Semua kamera sedang disewa untuk tanggal ini.
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Coba pilih tanggal lain untuk melihat ketersediaan.
                    </p>
                    <button
                      onClick={() => {
                        setTanggalAmbil("");
                        setTanggalKembali("");
                      }}
                      className="mt-4 inline-block rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
                    >
                      Lihat Semua Kamera
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Available cameras */}
            {camerasAvailable.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {camerasAvailable.map((camera) => {
                  const stok = getStok(camera);
                  const isChecked = stokState.status === "done";
                  const canBook = canBookCamera(camera);
                  const total =
                    jumlahHari > 0 ? jumlahHari * camera.harga_per_hari : null;

                  return (
                    <article
                      key={camera.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700"
                    >
                      {/* Image */}
                      <Link href={buildDetailUrl(camera)}>
                        <div className="h-48 overflow-hidden bg-zinc-800">
                          {camera.gambar_url ? (
                            <img
                              src={camera.gambar_url}
                              alt={`${camera.brand} ${camera.nama}`}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl">
                              📷
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex flex-1 flex-col p-5">
                        {/* Brand + name */}
                        <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                          {camera.brand}
                        </p>
                        <Link href={buildDetailUrl(camera)}>
                          <h2 className="mt-1 text-xl font-bold hover:text-yellow-400 transition">
                            {camera.nama}
                          </h2>
                        </Link>

                        {camera.deskripsi && (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400 flex-1">
                            {camera.deskripsi}
                          </p>
                        )}

                        {/* Price + availability */}
                        <div className="mt-4 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-xs text-zinc-500">Harga sewa</p>
                            <p className="font-semibold text-yellow-400">
                              {formatRupiah(camera.harga_per_hari)}
                              <span className="text-xs text-zinc-500">
                                {" "}
                                / hari
                              </span>
                            </p>
                            {total !== null && (
                              <p className="mt-0.5 text-xs text-zinc-400">
                                Estimasi {jumlahHari} hari:{" "}
                                <span className="font-semibold text-white">
                                  {formatRupiah(total)}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            {isChecked ? (
                              stok <= 0 ? (
                                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                                  Habis
                                </span>
                              ) : stok <= 2 ? (
                                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                                  Tersisa {stok}
                                </span>
                              ) : (
                                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                                  ✓ Tersedia
                                </span>
                              )
                            ) : (
                              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
                                {camera.stok} unit
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4 flex gap-2">
                          <Link
                            href={canBook ? buildSewaUrl() : "#"}
                            onClick={(e) => {
                              if (!canBook) {
                                e.preventDefault();
                                return;
                              }
                              setSelectedBooking(camera);
                            }}
                            aria-disabled={!canBook}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                              canBook
                                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                                : "pointer-events-none cursor-not-allowed bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {!datesSelected
                              ? "Pilih Tanggal"
                              : stokState.status === "loading"
                                ? "Memeriksa…"
                                : stok <= 0
                                  ? "Tidak Tersedia"
                                  : "Sewa Sekarang"}
                          </Link>
                          <Link
                            href={buildDetailUrl(camera)}
                            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
                          >
                            Detail
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Unavailable cameras (dimmed, below available) */}
            {datesSelected && camerasUnavailable.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Tidak tersedia untuk tanggal ini (
                    {camerasUnavailable.length})
                  </p>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {camerasUnavailable.map((camera) => (
                    <article
                      key={camera.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/40 opacity-50"
                    >
                      <div className="h-40 overflow-hidden bg-zinc-800/50">
                        {camera.gambar_url ? (
                          <img
                            src={camera.gambar_url}
                            alt={`${camera.brand} ${camera.nama}`}
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            📷
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          {camera.brand}
                        </p>
                        <h2 className="mt-0.5 text-base font-bold text-zinc-500">
                          {camera.nama}
                        </h2>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="text-xs text-zinc-600">
                            {formatRupiah(camera.harga_per_hari)}
                            <span> / hari</span>
                          </p>
                          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                            Tidak tersedia
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}
