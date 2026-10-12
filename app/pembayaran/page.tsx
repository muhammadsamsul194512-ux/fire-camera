"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePengaturan } from "@/hooks/usePengaturan";

export default function PembayaranLegacyPage() {
  const pengaturan = usePengaturan();
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyOrderNumber = searchParams.get("pesanan")?.trim();
  const legacyOrderId = searchParams.get("id")?.trim();
  const [error, setError] = useState("");

  useEffect(() => {
    async function resolveRoute() {
      if (legacyOrderId) {
        router.replace(`/pembayaran/${legacyOrderId}`);
        return;
      }

      if (!legacyOrderNumber) {
        setError("Nomor pesanan tidak ditemukan.");
        return;
      }

      try {
        const res = await fetch(
          `/api/pembayaran/status?pesanan=${encodeURIComponent(legacyOrderNumber)}`,
        );
        const hasil = await res.json();

        if (!res.ok || !hasil?.data?.id) {
          setError(hasil?.error || "Pesanan tidak ditemukan.");
          return;
        }

        router.replace(`/pembayaran/${hasil.data.id}`);
      } catch {
        setError("Terjadi kesalahan saat membuka halaman pembayaran.");
      }
    }

    resolveRoute();
  }, [legacyOrderId, legacyOrderNumber, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} />
      <main className="flex flex-1 items-center justify-center px-6 py-20 text-center">
        <div className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          {error ? (
            <>
              <p className="text-xl font-bold text-red-300">
                Halaman pembayaran tidak valid
              </p>
              <p className="mt-2 text-sm text-zinc-400">{error}</p>
              <Link
                href="/riwayat"
                className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black hover:bg-yellow-300 transition"
              >
                Cek Status Pesanan
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
              <p className="mt-4 text-lg font-semibold">
                Mengarahkan ke halaman pembayaran…
              </p>
            </>
          )}
        </div>
      </main>
      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}
