"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [namaToko, setNamaToko] = useState("");

  useEffect(() => {
  async function cekAksesAdmin() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch(
        "/api/admin/settings",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const hasil = await response.json();

      if (!response.ok) {
        router.replace("/admin/login");
        return;
      }

      if (hasil.data?.nama_toko) {
        setNamaToko(hasil.data.nama_toko);
      }
    } catch (error) {
      console.error(
        "Error mengecek akses admin:",
        error
      );

      router.replace("/admin/login");
    }
  }

  cekAksesAdmin();
}, [router]);
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* NAVBAR */}
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">
              {namaToko}
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm transition hover:border-yellow-400 hover:text-yellow-400"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Admin
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Dashboard Admin
          </h2>

          <p className="mt-3 text-zinc-400">
            Kelola kamera, pesanan, pembayaran, dan pengaturan{" "}
            {namaToko}.
          </p>
        </div>
      </section>

      {/* MENU */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {/* KAMERA */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">
              Kamera
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Kelola Kamera
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Tambah, edit, hapus kamera dan atur stok.
            </p>

            <a
              href="/admin/kamera"
              className="mt-5 inline-block rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Kelola
            </a>
          </div>

          {/* PESANAN */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">
              Pesanan
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Kelola Pesanan
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Lihat dan kelola pesanan pelanggan.
            </p>

            <a
              href="/admin/pesanan"
              className="mt-5 inline-block rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Lihat Pesanan
            </a>
          </div>

          {/* PEMBAYARAN */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">
              Pembayaran
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Verifikasi Pembayaran
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Periksa bukti pembayaran pelanggan.
            </p>

            <a
              href="/admin/pembayaran"
              className="mt-5 inline-block rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Verifikasi
            </a>
          </div>

          {/* PENGATURAN */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">
              Pengaturan
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Pengaturan Toko
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Atur informasi rekening dan informasi bisnis.
            </p>

            <a
              href="/admin/pengaturan"
              className="mt-5 inline-block rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              Pengaturan
            </a>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-sm text-zinc-600">
            © 2026 {namaToko} — Admin
          </p>
        </div>
      </footer>
    </main>
  );
}