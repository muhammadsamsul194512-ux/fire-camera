"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


export default function Home() {
  const [namaToko, setNamaToko] = useState("");
  const [gambarHeroUrl, setGambarHeroUrl] = useState("");
    

      

  useEffect(() => {
    async function ambilPengaturan() {
      try {
        const response = await fetch("/api/pengaturan");

        const hasil = await response.json();

        if (!response.ok) {
          console.error(
            "Gagal mengambil pengaturan:",
            hasil
          );
          return;
        }

        if (hasil.data?.nama_toko) {
          setNamaToko(hasil.data.nama_toko);
        }
        if (hasil.data?.gambar_hero_url) {
  setGambarHeroUrl(hasil.data.gambar_hero_url);
}
      } catch (error) {
        console.error(
          "Error mengambil pengaturan:",
          error
        );
      }
    }

    ambilPengaturan();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      
      {/* NAVBAR */}
      <nav className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          
          {/* LOGO */}
          <div>
            <h1 className="text-2xl font-bold tracking-wider">
              {namaToko}
            </h1>
          </div>

          {/* MENU */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#beranda"
              className="text-sm text-white transition hover:text-yellow-400"
            >
              Beranda
            </a>

            <a
              href="/kamera"
              className="text-sm text-zinc-300 transition hover:text-yellow-400"
            >
              Daftar Kamera
            </a>

            <a
              href="#cara-sewa"
              className="text-sm text-zinc-300 transition hover:text-yellow-400"
            >
              Cara Sewa
            </a>

            <a
              href="#riwayat"
              className="text-sm text-zinc-300 transition hover:text-yellow-400"
            >
              Riwayat Pesanan
            </a>

            <a
              href="/admin/login"
              className="rounded-full border border-yellow-400 px-5 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
            >
              Login Admin
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="beranda"
        className="relative overflow-hidden"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">

          {/* HERO TEXT */}
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
              Rental Kamera Profesional
            </p>

            <h2 className="max-w-2xl text-5xl font-bold leading-tight md:text-6xl">
              Sewa Kamera
              <span className="block text-yellow-400">
                Mudah & Terjangkau
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Abadikan setiap momen spesialmu bersama {namaToko}.
              Pilih kamera yang kamu butuhkan dan pesan dengan mudah.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/kamera"
                className="rounded-full bg-yellow-400 px-7 py-3 font-semibold text-black transition hover:bg-yellow-300"
              >
                Lihat Kamera
              </a>

              <a
                href="#cara-sewa"
                className="rounded-full border border-zinc-700 px-7 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400"
              >
                Cara Sewa
              </a>
            </div>

            <div className="mt-10 flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold">Rp50K</p>
                <p className="text-sm text-zinc-500">
                  Mulai / hari
                </p>
              </div>

              <div className="h-10 w-px bg-zinc-800"></div>

              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-zinc-500">
                  Siap disewa
                </p>
              </div>
            </div>
          </div>

          {/* CAMERA VISUAL */}
          <div className="relative">
  <div className="absolute inset-0 rounded-3xl bg-yellow-400/10 blur-3xl"></div>

  <div className="relative h-[420px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
    {gambarHeroUrl ? (
      <img
        src={gambarHeroUrl}
        alt={`Hero ${namaToko || "FIRE CAMERA"}`}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-6 text-9xl">
            📷
          </div>

          <p className="text-xl font-semibold">
            Kamera Profesional
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Gambar Hero belum tersedia
          </p>
        </div>
      </div>
    )}
  </div>
</div>

        </div>
      </section>

      

      {/* CARA SEWA */}
      <section
        id="cara-sewa"
        className="border-t border-zinc-900"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
              Mudah & Cepat
            </p>

            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Cara Menyewa Kamera
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-zinc-500">
              Proses penyewaan kamera dibuat sederhana agar kamu
              bisa mendapatkan kamera tanpa proses yang rumit.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">

            {[
              {
                number: "01",
                title: "Pilih Kamera",
                text: "Pilih kamera yang ingin kamu gunakan.",
              },
              {
                number: "02",
                title: "Tentukan Tanggal",
                text: "Tentukan tanggal pengambilan dan pengembalian.",
              },
              {
                number: "03",
                title: "Lakukan Pembayaran",
                text: "Transfer sesuai total pembayaran dan upload bukti.",
              },
              {
                number: "04",
                title: "Ambil Kamera",
                text: "Datang ke lokasi dan tunjukkan bukti penyewaan.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-3xl font-bold text-yellow-400">
                  {step.number}
                </p>

                <h3 className="mt-5 text-lg font-semibold">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {step.text}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section className="border-t border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-6 py-20">

          <div className="grid gap-8 md:grid-cols-3">

            <div>
              <div className="text-3xl">⚡</div>

              <h3 className="mt-4 text-xl font-semibold">
                Proses Mudah
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Pesan kamera dengan proses yang sederhana dan jelas.
              </p>
            </div>

            <div>
              <div className="text-3xl">💰</div>

              <h3 className="mt-4 text-xl font-semibold">
                Harga Terjangkau
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Harga sewa mulai dari Rp50.000 per kamera per hari.
              </p>
            </div>

            <div>
              <div className="text-3xl">🛡️</div>

              <h3 className="mt-4 text-xl font-semibold">
                Stok Terjamin
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Sistem akan memeriksa ketersediaan kamera sebelum pemesanan.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* RIWAYAT */}
      <section
        id="riwayat"
        className="border-t border-zinc-900"
      >
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
            Pesanan
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Cek Riwayat Pesanan
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Pantau status pesanan dan penyewaan kamera kamu
            dengan mudah.
          </p>

          <a
  href="/riwayat"
  className="mt-8 inline-block rounded-full bg-yellow-400 px-7 py-3 font-semibold text-black transition hover:bg-yellow-300"
>
  Cek Pesanan
</a>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-xl font-bold">
              {namaToko}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Rental kamera profesional dan terpercaya.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            <p>Senin - Minggu | 08.00 - 21.00</p>

            <p className="mt-1">
              WhatsApp: Nomor akan diatur oleh admin
            </p>
          </div>

          <p className="text-sm text-zinc-600">
            © 2026 {namaToko}
          </p>

        </div>
      </footer>

    </main>
  );
}