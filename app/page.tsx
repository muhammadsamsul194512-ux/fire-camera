"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePengaturan } from "@/hooks/usePengaturan";

export default function Home() {
  const pengaturan = usePengaturan();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/" />

      {/* HERO */}
      <section id="beranda" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">

          {/* Hero text */}
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
              Rental Kamera Profesional
            </p>

            <h2 className="max-w-2xl text-5xl font-bold leading-tight md:text-6xl">
              Sewa Kamera
              <span className="block text-yellow-400">Mudah &amp; Terjangkau</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Abadikan setiap momen spesialmu bersama{" "}
              {pengaturan.nama_toko || "kami"}. Pilih kamera yang kamu butuhkan
              dan pesan dengan mudah.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/kamera"
                className="rounded-full bg-yellow-400 px-7 py-3 font-semibold text-black transition hover:bg-yellow-300"
              >
                Lihat Kamera
              </Link>
              <a
                href="#cara-sewa"
                className="rounded-full border border-zinc-700 px-7 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400"
              >
                Cara Sewa
              </a>
            </div>

            <div className="mt-10 flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold">Harga</p>
                <p className="text-sm text-zinc-500">Mulai dari terjangkau</p>
              </div>
              <div className="h-10 w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-bold">Mudah</p>
                <p className="text-sm text-zinc-500">Proses pemesanan</p>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-yellow-400/10 blur-3xl" />
            <div className="relative h-[420px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              {pengaturan.gambar_hero_url ? (
                <img
                  src={pengaturan.gambar_hero_url}
                  alt={`Hero ${pengaturan.nama_toko}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-900">
                  <div className="text-center px-6">
                    <div className="mb-4 text-7xl opacity-30">📷</div>
                    <p className="text-base font-semibold text-zinc-400">
                      {pengaturan.nama_toko || "Fire Camera"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">Rental Kamera Profesional</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CARA SEWA */}
      <section id="cara-sewa" className="border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
              Mudah &amp; Cepat
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Cara Menyewa Kamera
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-500">
              Proses penyewaan dibuat sederhana agar kamu bisa mendapatkan
              kamera tanpa proses yang rumit.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {[
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
                text: "Transfer sesuai total dan upload bukti pembayaran.",
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
                <p className="text-3xl font-bold text-yellow-400">{step.number}</p>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{step.text}</p>
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
              <h3 className="mt-4 text-xl font-semibold">Proses Mudah</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Pesan kamera dengan proses sederhana dan jelas.
              </p>
            </div>
            <div>
              <div className="text-3xl">💰</div>
              <h3 className="mt-4 text-xl font-semibold">Harga Terjangkau</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Harga sewa mulai dari Rp50.000 per kamera per hari.
              </p>
            </div>
            <div>
              <div className="text-3xl">🛡️</div>
              <h3 className="mt-4 text-xl font-semibold">Stok Terjamin</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Sistem memeriksa ketersediaan kamera sebelum pemesanan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CEK PESANAN */}
      <section id="riwayat" className="border-t border-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
            Pesanan
          </p>
          <h2 className="mt-2 text-3xl font-bold">Cek Status Pesanan</h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Pantau status pesanan dan penyewaan kamera dengan mudah menggunakan
            nomor pesanan dan nomor WhatsApp kamu.
          </p>
          <Link
            href="/riwayat"
            className="mt-8 inline-block rounded-full bg-yellow-400 px-7 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            Cek Pesanan
          </Link>
        </div>
      </section>

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}
