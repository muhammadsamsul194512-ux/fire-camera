"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePengaturan } from "@/hooks/usePengaturan";

const langkahSewa = [
  {
    number: "01",
    title: "Pilih Kamera",
    text: "Jelajahi koleksi dan pilih kamera yang kamu butuhkan.",
  },
  {
    number: "02",
    title: "Tentukan Tanggal",
    text: "Pilih tanggal ambil dan kembali. Durasi dihitung otomatis.",
  },
  {
    number: "03",
    title: "Lakukan Pembayaran",
    text: "Transfer sesuai total dan unggah bukti pembayaran.",
  },
  {
    number: "04",
    title: "Ambil Kamera",
    text: "Datang ke lokasi dan tunjukkan bukti penyewaan.",
  },
];

const keunggulan = [
  {
    icon: "⚡",
    title: "Proses Mudah",
    text: "Pesan kamera dengan proses sederhana dan jelas.",
  },
  {
    icon: "💰",
    title: "Harga Terjangkau",
    text: "Harga sewa mulai dari Rp50.000 per kamera per hari.",
  },
  {
    icon: "🛡️",
    title: "Stok Terjamin",
    text: "Sistem memeriksa ketersediaan kamera sebelum pemesanan.",
  },
];

export default function Home() {
  const pengaturan = usePengaturan();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-zinc-950 text-white">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/" />

      {/* HERO */}
      <section id="beranda" className="relative">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-12 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-12 md:py-24 lg:py-28">
          {/* Teks utama */}
          <div className="min-w-0">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400 sm:text-sm sm:tracking-[0.3em]">
              Rental Kamera Profesional
            </p>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Sewa Kamera
              <span className="mt-1 block text-yellow-400">
                Mudah &amp; Terjangkau
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:mt-6 sm:text-lg sm:leading-8">
              Abadikan setiap momen spesialmu bersama{" "}
              {pengaturan.nama_toko || "kami"}. Pilih kamera yang kamu butuhkan
              dan pesan dengan mudah.
            </p>

            {/* Tombol responsif */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/kamera"
                className="inline-flex w-full items-center justify-center rounded-full bg-yellow-400 px-7 py-3.5 text-center font-semibold text-black transition hover:bg-yellow-300 sm:w-auto"
              >
                Lihat Kamera
              </Link>

              <a
                href="#cara-sewa"
                className="inline-flex w-full items-center justify-center rounded-full border border-zinc-700 px-7 py-3.5 text-center font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400 sm:w-auto"
              >
                Cara Sewa
              </a>
            </div>

            {/* Informasi harga */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-10 sm:gap-8">
              <div>
                <p className="text-xl font-bold sm:text-2xl">Harga</p>
                <p className="mt-1 text-sm text-zinc-500">Mulai dari 50K</p>
              </div>

              <div className="hidden h-10 w-px bg-zinc-800 sm:block" />

              <div>
                <p className="text-xl font-bold sm:text-2xl">Mudah</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Proses pemesanan
                </p>
              </div>
            </div>
          </div>

          {/* Gambar utama */}
          <div className="relative min-w-0">
            <div className="absolute inset-0 rounded-3xl bg-yellow-400/10 blur-3xl" />

            <div className="relative h-[260px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 sm:h-[360px] sm:rounded-3xl md:h-[420px]">
              {pengaturan.gambar_hero_url ? (
                <img
                  src={pengaturan.gambar_hero_url}
                  alt={`Hero ${pengaturan.nama_toko || "Fire Camera"}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-900">
                  <div className="px-6 text-center">
                    <div className="mb-4 text-6xl opacity-30 sm:text-7xl">
                      📷
                    </div>
                    <p className="text-base font-semibold text-zinc-400">
                      {pengaturan.nama_toko || "Fire Camera"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Rental Kamera Profesional
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CARA SEWA */}
      <section id="cara-sewa" className="border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 sm:text-sm">
              Mudah &amp; Cepat
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Cara Menyewa Kamera
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
              Proses penyewaan dibuat sederhana agar kamu bisa mendapatkan
              kamera tanpa proses yang rumit.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {langkahSewa.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
              >
                <p className="text-3xl font-bold text-yellow-400">
                  {step.number}
                </p>

                <h3 className="mt-4 text-lg font-semibold sm:mt-5">
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
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-10">
            {keunggulan.map((item) => (
              <div key={item.title} className="min-w-0">
                <div className="text-3xl" aria-hidden="true">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-lg font-semibold sm:text-xl">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CEK STATUS PESANAN */}
      <section id="riwayat" className="border-t border-zinc-900">
        <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 sm:text-sm">
            Pesanan
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Cek Status Pesanan
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
            Pantau status pesanan dan penyewaan kamera dengan mudah menggunakan
            nomor pesanan dan nomor WhatsApp kamu.
          </p>

          <Link
            href="/riwayat"
            className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-yellow-400 px-7 py-3.5 text-center font-semibold text-black transition hover:bg-yellow-300 sm:mt-8 sm:w-auto"
          >
            Cek Pesanan
          </Link>
        </div>
      </section>

      <Footer
        namaToko={pengaturan.nama_toko}
        whatsapp={pengaturan.whatsapp}
      />
    </div>
  );
}