"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePengaturan } from "@/hooks/usePengaturan";

export default function KritikSaranPage() {
  const router = useRouter();
  const pengaturan = usePengaturan();
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState("");
  const [error, setError] = useState("");

  const namaTokoAktif = pengaturan.nama_toko || "Snapiecam";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSukses("");

    try {
      const { error: dbError } = await supabase
        .from("kritik_saran")
        .insert([{ nama, kontak, pesan }]);

      if (dbError) {
        setError(dbError.message || "Gagal mengirim kritik dan saran. Silakan coba lagi.");
        return;
      }

      setSukses("Terima kasih! Kritik dan saran Anda berhasil dikirim.");
      setNama("");
      setKontak("");
      setPesan("");
    } catch (err: any) {
      setError("Terjadi kesalahan pada server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            {namaTokoAktif}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Kritik &amp; Saran</h1>
          <p className="mt-2 text-sm text-gray-400">
            Masukan Anda sangat berharga bagi kami. Tuliskan kritik atau saran Anda untuk membantu meningkatkan layanan kami.
          </p>
        </div>

        {sukses && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {sukses}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-950 p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama Anda..."
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nomor WhatsApp
            </label>
            <input
              type="text"
              required
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              placeholder="Contoh: 08123456789"
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kritik / Saran
            </label>
            <textarea
              required
              rows={4}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tuliskan masukan Anda di sini..."
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              Kembali ke Beranda
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Masukan"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}