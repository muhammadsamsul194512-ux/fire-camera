"use client";

import { useState } from "react";
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

const dosList = [
  "Pahami tutorial yang diberikan (jika belum paham).",
  "Simpan kamera di tempat yang tidak lembab, kering, dan sejuk.",
  "Pasang/lepas memori & baterai dengan hati-hati.",
  "Boleh bertanya kepada admin jika belum paham.",
];

const dontsList = [
  "Jika kamera tidak dipakai, dimatikan terlebih dahulu.",
  "Jangan sampai kamera terbentur/tergores.",
  "Charger kamera sebelum mati, selalu re-check baterai kamera.",
  "Jika ingin membersihkan lensa, pakai kain halus/tisu. Jangan menggunakan bahan yang kasar/jari tangan.",
];

const faqList = [
  {
    q: "Nanti dapet apa aja ya kak?",
    a: "Sesuai kelengkapan camera yaa. Camera, Memori Card, Baterai, Charger, Card Reader, Strap & Pouch",
  },
  {
    q: "Bisa gosend ga kak?",
    a: "Tidak bisa yaa, wajib pick up karena akan cek identitas terlebih dahulu & pengecekan camera",
  },
];

export default function Home() {
  const pengaturan = usePengaturan();
  // State untuk menyimpan indeks FAQ yang sedang terbuka (default terbuka nomor 0)
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

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
              {pengaturan.nama_toko || "Snapiecam"}. Pilih kamera yang kamu butuhkan
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
                <p className="mt-1 text-sm text-zinc-500">Mulai dari 60K</p>
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
                  alt={`Hero ${pengaturan.nama_toko || "Snapiecam"}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-900">
                  <div className="px-6 text-center">
                    <div className="mb-4 text-6xl opacity-30 sm:text-7xl">
                      📷
                    </div>
                    <p className="text-base font-semibold text-zinc-400">
                      {pengaturan.nama_toko || "Snapiecam"}
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

      {/* ABOUT SNAPIECAM */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Bagian Kiri: Gambar about-us.png */}
            <div className="flex-shrink-0 flex items-center justify-center w-full md:w-auto">
              <img
                src="/about-us.png"
                alt="About Snapiecam Camera"
                className="max-h-36 sm:max-h-44 w-auto object-contain rounded-xl"
              />
            </div>

            {/* Garis Pemisah (Desktop only) */}
            <div className="hidden md:block h-32 w-px bg-zinc-800" />

            {/* Bagian Kanan: Judul & Teks About */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                About <span className="text-yellow-400">{pengaturan.nama_toko || "Snapiecam"}</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Welcome to your premier destination for digital camera rentals. We believe that
                every celebration deserves a unique perspective, we help you turn ordinary shots
                into timeless keepsakes, Explore our collection, book your favorite unit, and start
                documenting your story with the authentic texture of the digital era.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CARA SEWA (4 Kolom Menyamping) */}
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

          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
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

      {/* DOS & DON'TS */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 sm:text-sm">
              Panduan Penggunaan
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Dos &amp; Don'ts
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
              Agar pengalaman sewa kamera di {pengaturan.nama_toko || "Snapiecam"} lebih aman dan nyaman, perhatikan beberapa hal berikut:
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* DOS */}
            <div className="rounded-2xl border border-emerald-900/40 bg-[#122218] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                  ✓
                </span>
                <h3 className="text-xl font-bold text-emerald-400">Dos</h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-emerald-100/90">
                {dosList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 text-emerald-400 font-bold">✔</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DON'TS */}
            <div className="rounded-2xl border border-rose-900/40 bg-[#2b1619] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white">
                  ✕
                </span>
                <h3 className="text-xl font-bold text-rose-400">Don'ts</h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-rose-100/90">
                {dontsList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose-400 font-bold">✖</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 sm:text-sm">
              FAQ
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Q &amp; A—Pertanyaan yang Sering Ditanyakan
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqList.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    isOpen
                      ? "border-yellow-500/50 bg-yellow-950/20"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  {/* Tombol Pertanyaan (Q) */}
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors sm:p-6"
                  >
                    <span className="text-base font-bold text-white sm:text-lg">
                      Q : {faq.q}
                    </span>
                    <span className="ml-4 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-yellow-400 font-bold text-sm">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Jawaban (A) - Tampil Saat Diklik */}
                  {isOpen && (
                    <div className="border-t border-yellow-500/20 bg-yellow-900/10 p-5 sm:p-6 pt-4">
                      <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
                        <span className="font-bold text-yellow-400">A : </span>
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
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