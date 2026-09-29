"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function KameraPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [namaToko, setNamaToko] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [tanggalAmbil, setTanggalAmbil] = useState("");
const [jamAmbil, setJamAmbil] = useState("");
const [tanggalKembali, setTanggalKembali] = useState("");
const [jamKembali, setJamKembali] = useState("");

const [stokTersedia, setStokTersedia] = useState<
  Record<number, number>
>({});

  useEffect(() => {
    async function getCameras() {
      const { data, error } = await supabase
        .from("camera")
        .select(
          "id, nama, brand, deskripsi, harga_per_hari, stok, gambar_url"
        )
        .eq("aktif", true)
        .order("id", { ascending: true });

      if (error) {
        console.error(error);
        setError("Gagal mengambil data kamera.");
      } else {
        setCameras(data || []);
      }

      setLoading(false);
    }

    async function ambilNamaToko() {
      try {
        const response = await fetch("/api/pengaturan");

        const result = await response.json();

        if (!response.ok) {
          console.error(
            "Gagal mengambil nama toko:",
            result
          );
          return;
        }

        if (result.data?.nama_toko) {
          setNamaToko(result.data.nama_toko);
        }
      } catch (error) {
        console.error(
          "Error mengambil nama toko:",
          error
        );
      }
    }

        getCameras();
    ambilNamaToko();
  }, []);

  useEffect(() => {
    async function cekSemuaStok() {
      if (
        !tanggalAmbil ||
        !jamAmbil ||
        !tanggalKembali ||
        !jamKembali
      ) {
        setStokTersedia({});
        return;
      }

      const waktuAmbil = `${tanggalAmbil}T${jamAmbil}`;
const waktuKembali = `${tanggalKembali}T${jamKembali}`;

if (waktuKembali <= waktuAmbil) {
  setStokTersedia({});
  return;
}

      const hasilStok: Record<number, number> = {};

      await Promise.all(
        cameras.map(async (camera) => {
          try {
            const params = new URLSearchParams({
              kameraId: String(camera.id),
              tanggalAmbil,
              jamAmbil,
              tanggalKembali,
              jamKembali,
            });

            const response = await fetch(
              `/api/kamera/stok?${params.toString()}`
            );

            const data = await response.json();

            if (response.ok) {
              hasilStok[camera.id] = Number(
                data.stokTersedia
              );
            }
          } catch (error) {
            console.error(
              `Gagal mengecek stok kamera ${camera.nama}:`,
              error
            );
          }
        })
      );

      setStokTersedia(hasilStok);
    }

    cekSemuaStok();
  }, [
    cameras,
    tanggalAmbil,
    jamAmbil,
    tanggalKembali,
    jamKembali,
  ]);

  function formatRupiah(harga: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(harga);
  }

  function getStatus(stok: number) {
    if (stok <= 0) {
      return {
        text: "Stok Habis",
        className: "bg-red-500/10 text-red-400",
      };
    }

    if (stok <= 2) {
      return {
        text: `Tersisa ${stok}`,
        className: "bg-yellow-500/10 text-yellow-400",
      };
    }

    return {
      text: `Tersedia ${stok}`,
      className: "bg-green-500/10 text-green-400",
    };
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-bold"
          >
            {namaToko}
          </Link>

          <div className="flex gap-6 text-sm text-zinc-300">
            <Link
              href="/"
              className="hover:text-yellow-400"
            >
              Beranda
            </Link>

            <Link
              href="/kamera"
              className="text-yellow-400"
            >
              Daftar Kamera
            </Link>

            <Link
              href="/sewa"
              className="hover:text-yellow-400"
            >
              Sewa
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-400">
          Koleksi Kamera
        </p>

        <div className="mb-8 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:grid-cols-2 lg:grid-cols-4">
  <div>
    <label className="mb-2 block text-sm text-zinc-400">
      Tanggal Ambil
    </label>
    <input
      type="date"
      value={tanggalAmbil}
      onChange={(e) => setTanggalAmbil(e.target.value)}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm text-zinc-400">
      Jam Ambil
    </label>
    <input
      type="time"
      value={jamAmbil}
      onChange={(e) => setJamAmbil(e.target.value)}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm text-zinc-400">
      Tanggal Kembali
    </label>
    <input
      type="date"
      value={tanggalKembali}
      onChange={(e) => setTanggalKembali(e.target.value)}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
    />
  </div>

  <div>
    <label className="mb-2 block text-sm text-zinc-400">
      Jam Kembali
    </label>
    <input
      type="time"
      value={jamKembali}
      onChange={(e) => setJamKembali(e.target.value)}
      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
    />
  </div>
</div>

        <h1 className="text-4xl font-bold md:text-5xl">
          Daftar Kamera
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Pilih kamera yang sesuai dengan kebutuhanmu
          dan cek ketersediaan stok sebelum melakukan
          penyewaan.
        </p>
      </section>

      {/* Loading */}
      {loading && (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            Memuat data kamera...
          </div>
        </section>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        </section>
      )}

      {/* Camera List */}
      {!loading && !error && (
        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => {
            const waktuSudahDipilih =
  tanggalAmbil &&
  jamAmbil &&
  tanggalKembali &&
  jamKembali;

const waktuValid =
  waktuSudahDipilih &&
  `${tanggalKembali}T${jamKembali}` >
    `${tanggalAmbil}T${jamAmbil}`;

const stokUntukWaktu =
  waktuValid
    ? (stokTersedia[camera.id] ?? camera.stok)
    : camera.stok;

const status = getStatus(stokUntukWaktu);

            return (
              <article
                key={camera.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
              >
                {/* Gambar Kamera */}
<div className="h-52 overflow-hidden bg-zinc-800">
  {camera.gambar_url ? (
    <img
      src={camera.gambar_url}
      alt={`${camera.brand} ${camera.nama}`}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-6xl">
      📷
    </div>
  )}
</div>

                <div className="p-6">
                  <div className="mb-2 text-sm text-yellow-400">
                    {camera.brand}
                  </div>

                  <h2 className="text-2xl font-bold">
                    {camera.nama}
                  </h2>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">
                    {camera.deskripsi}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Harga sewa
                      </p>

                      <p className="font-semibold text-yellow-400">
                        {formatRupiah(
                          camera.harga_per_hari
                        )}
                        <span className="text-xs text-zinc-500">
                          {" "}
                          / hari
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
  <span
    className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
  >
    {status.text}
  </span>

  {waktuValid && (
    <p className="mt-2 text-xs text-zinc-500">
      Untuk waktu yang dipilih
    </p>
  )}
</div>
                  </div>

                  {tanggalAmbil &&
  jamAmbil &&
  tanggalKembali &&
  jamKembali && (
    <p className="mt-3 text-xs text-zinc-500">
      Stok berdasarkan waktu penyewaan yang dipilih.
    </p>
  )}

                  <div className="mt-6 flex gap-3">
                    <Link
  href={`/sewa?kameraId=${camera.id}&tanggalAmbil=${tanggalAmbil}&jamAmbil=${jamAmbil}&tanggalKembali=${tanggalKembali}&jamKembali=${jamKembali}`}
                      className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                        stokUntukWaktu > 0
  ? "bg-yellow-400 text-black hover:bg-yellow-300"
  : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                      }`}
                      onClick={(e) => {
                        if (stokUntukWaktu <= 0) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {stokUntukWaktu > 0
  ? "Sewa Sekarang"
  : "Stok Habis"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Empty */}
      {!loading &&
        !error &&
        cameras.length === 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-20">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-400">
              Belum ada kamera yang tersedia.
            </div>
          </section>
        )}
    </main>
  );
}