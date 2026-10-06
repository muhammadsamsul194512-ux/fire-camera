"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import { usePengaturan } from "@/hooks/usePengaturan";
import { formatRupiah, formatTanggal } from "@/lib/utils";

type Pesanan = {
  nomor_pesanan: string;
  tanggal_ambil: string;
  jam_ambil: string;
  tanggal_kembali: string;
  jam_kembali: string;
  jumlah_hari: number;
  total_harga: number;
  status: string;
  created_at: string;
  customer: {
    nama_lengkap: string;
    whatsapp: string;
    email: string | null;
  };
  order_detail: Array<{
    id: number;
    jumlah: number;
    harga_per_hari: number;
    subtotal: number;
    camera: { id: number; nama: string; brand: string; gambar_url: string | null } | null;
  }>;
  payment:
    | {
        id: number;
        status: string;
        catatan_admin: string | null;
        bukti_pembayaran_url: string | null;
        uploaded_at: string | null;
        verified_at: string | null;
      }
    | Array<{
        id: number;
        status: string;
        catatan_admin: string | null;
        bukti_pembayaran_url: string | null;
        uploaded_at: string | null;
        verified_at: string | null;
      }>
    | null;
};

export default function RiwayatPage() {
  const pengaturan = usePengaturan();
  const [nomorPesanan, setNomorPesanan] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pesanan, setPesanan] = useState<Pesanan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cekPesanan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPesanan(null);

    try {
      const res = await fetch("/api/riwayat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorPesanan, whatsapp }),
      });
      const hasil = await res.json();
      if (!res.ok) {
        setError(hasil.error || "Pesanan tidak ditemukan.");
        return;
      }
      setPesanan(hasil.data);
    } catch {
      setError("Terjadi kesalahan saat mengecek pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const payment = Array.isArray(pesanan?.payment)
    ? pesanan?.payment[0]
    : pesanan?.payment;

  const inputClass =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white text-sm outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/30";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} activeHref="/riwayat" />

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-3xl px-6 py-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Pesanan
          </p>
          <h1 className="mt-2 text-4xl font-bold">Cek Status Pesanan</h1>
          <p className="mt-3 text-zinc-400">
            Masukkan nomor pesanan dan nomor WhatsApp yang digunakan saat memesan.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="mx-auto w-full max-w-2xl px-6 py-12">
        <form onSubmit={cekPesanan} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nomor Pesanan
            </label>
            <input
              type="text"
              value={nomorPesanan}
              onChange={(e) => setNomorPesanan(e.target.value)}
              placeholder="Contoh: ORD-20260928-001"
              className={inputClass}
              required
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium">
              Nomor WhatsApp
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Contoh: 081234567890"
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Mencari Pesanan…" : "Cek Pesanan"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/30 p-5">
            <p className="font-semibold text-red-400">Pesanan tidak ditemukan</p>
            <p className="mt-1 text-sm text-red-300">{error}</p>
          </div>
        )}
      </section>

      {/* RESULT */}
      {pesanan && (
        <section className="mx-auto w-full max-w-2xl px-6 pb-14">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-zinc-500">Nomor Pesanan</p>
                <p className="mt-1 text-xl font-bold">{pesanan.nomor_pesanan}</p>
              </div>
              <StatusBadge status={pesanan.status} />
            </div>

            {/* Customer */}
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Data Pelanggan
              </p>
              <p className="mt-2 font-semibold">{pesanan.customer.nama_lengkap}</p>
              <p className="mt-1 text-sm text-zinc-400">
                WhatsApp: {pesanan.customer.whatsapp}
              </p>
              {pesanan.customer.email && (
                <p className="mt-0.5 text-sm text-zinc-400">
                  Email: {pesanan.customer.email}
                </p>
              )}
            </div>

            {/* Schedule */}
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Jadwal Penyewaan
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-zinc-500">Tanggal Ambil</p>
                  <p className="mt-0.5 font-semibold">
                    {formatTanggal(pesanan.tanggal_ambil)}, pukul {pesanan.jam_ambil}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Tanggal Kembali</p>
                  <p className="mt-0.5 font-semibold">
                    {formatTanggal(pesanan.tanggal_kembali)}, pukul {pesanan.jam_kembali}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm">
                <span className="text-zinc-500">Lama sewa: </span>
                <span className="font-semibold">{pesanan.jumlah_hari} hari</span>
              </p>
            </div>

            {/* Cameras */}
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Kamera yang Disewa
              </p>
              <div className="mt-3 space-y-3">
                {pesanan.order_detail.map((detail) => (
                  <div
                    key={detail.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">
                        {detail.camera?.nama || "Kamera"}
                      </p>
                      <p className="text-zinc-500">{detail.camera?.brand || ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{detail.jumlah} unit</p>
                      <p className="text-zinc-500">{formatRupiah(detail.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 border-t border-zinc-800 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="font-bold">Total Pembayaran</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatRupiah(Number(pesanan.total_harga))}
              </p>
            </div>

            {/* Payment status */}
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status Pembayaran
              </p>
              {payment ? (
                <div className="mt-2">
                  <StatusBadge status={payment.status} size="sm" />
                  {payment.catatan_admin && (
                    <div className="mt-3 rounded-xl bg-zinc-950 px-4 py-3">
                      <p className="text-xs text-zinc-500">Catatan Admin</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {payment.catatan_admin}
                      </p>
                    </div>
                  )}
                  {payment.uploaded_at && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Bukti pembayaran sudah diunggah.
                    </p>
                  )}
                  {/* Link to payment page if pending */}
                  {(payment.status === "menunggu_pembayaran" ||
                    payment.status === "menunggu_verifikasi" ||
                    payment.status === "ditolak" ||
                    payment.status === "perlu_upload_ulang") && (
                    <Link
                      href={`/pembayaran?pesanan=${encodeURIComponent(pesanan.nomor_pesanan)}&total=${pesanan.total_harga}`}
                      className="mt-4 inline-block rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
                    >
                      Upload Bukti Pembayaran →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">
                  Belum ada data pembayaran.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}
