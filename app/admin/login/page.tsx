"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [namaToko, setNamaToko] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      } catch (error) {
        console.error(
          "Error mengambil pengaturan:",
          error
        );
      }
    }

    ambilPengaturan();
  }, []);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setError("Email atau password salah.");
        return;
      }

      router.push("/admin");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* LOGO */}
          <div className="text-center">
            <a
              href="/"
              className="text-3xl font-bold tracking-wider"
            >
              {namaToko}
            </a>

            <p className="mt-3 text-sm text-zinc-500">
              Admin Panel
            </p>
          </div>

          {/* LOGIN CARD */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
            <h1 className="text-2xl font-bold">
              Login Admin
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Masuk untuk mengelola {namaToko}.
            </p>

            <form
              onSubmit={handleLogin}
              className="mt-7 space-y-5"
            >

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@firecamera.com"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400"
                />
              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Memproses..."
                  : "Login Admin"}
              </button>
            </form>

            <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
              <a
                href="/"
                className="text-sm text-zinc-500 transition hover:text-yellow-400"
              >
                ← Kembali ke Beranda
              </a>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}