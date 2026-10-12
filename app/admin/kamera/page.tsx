"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/lib/supabase";

type Camera = {
  id: number;
  nama: string;
  brand: string;
  deskripsi: string | null;
  harga_per_hari: number;
  stok: number;
  gambar_url: string | null;
  aktif: boolean;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminKameraPage() {
  const router = useRouter();
  const [kamera, setKamera] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  async function ambilKamera() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/kamera", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const hasil = await response.json();
      if (!response.ok) {
        setError(hasil.error || "Gagal mengambil data kamera.");
        return;
      }

      setKamera(hasil.data || []);
    } catch (error) {
      console.error("Error mengambil kamera:", error);
      setError("Terjadi kesalahan saat mengambil data kamera.");
    } finally {
      setLoading(false);
    }
  }

  async function ubahStatusKamera(item: Camera) {
    const statusBaru = !item.aktif;
    const yakin = window.confirm(
      statusBaru
        ? `Aktifkan kembali kamera "${item.brand} ${item.nama}"?`
        : `Nonaktifkan kamera "${item.brand} ${item.nama}"? Kamera tidak akan ditampilkan kepada pelanggan.`,
    );

    if (!yakin) return;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/kamera/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: item.id, aktif: statusBaru }),
      });

      const hasil = await response.json();
      if (!response.ok) {
        setError(hasil.error || "Gagal mengubah status kamera.");
        return;
      }

      await ambilKamera();
    } catch (error) {
      console.error("Gagal mengubah status kamera:", error);
      setError("Terjadi kesalahan saat mengubah status kamera.");
    }
  }

  useEffect(() => {
    void ambilKamera();
  }, [router]);

  const filteredKamera = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return kamera.filter((item) => {
      const matchesSearch =
        !searchLower ||
        `${item.nama} ${item.brand}`.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.aktif) ||
        (statusFilter === "inactive" && !item.aktif);

      return matchesSearch && matchesStatus;
    });
  }, [kamera, search, statusFilter]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Kelola Kamera</h1>
            <p className="mt-2 text-sm text-gray-400">
              Pantau daftar kamera dan buka detail untuk pengelolaan lanjutan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-yellow-400 hover:text-yellow-400"
            >
              ? Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/kamera/new")}
              className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              + Tambah Kamera
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-950 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau brand kamera..."
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "active" | "inactive",
                  )
                }
                className="rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak aktif</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-200 transition hover:border-yellow-400 hover:text-yellow-400"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              Memuat data kamera...
            </div>
          ) : filteredKamera.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-lg font-semibold text-white">
                Belum ada hasil yang cocok
              </p>
              <p className="mt-2 text-sm">
                Coba ubah pencarian atau filter status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                    <th className="px-6 py-4">Gambar</th>
                    <th className="px-6 py-4">Kamera</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Harga</th>
                    <th className="px-6 py-4">Stok</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKamera.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-900 hover:bg-gray-900/80"
                    >
                      <td className="px-6 py-5 align-middle">
                        {item.gambar_url ? (
                          <img
                            src={item.gambar_url}
                            alt={`${item.brand} ${item.nama}`}
                            className="h-18 w-24 rounded-xl border border-gray-800 object-cover"
                          />
                        ) : (
                          <div className="flex h-18 w-24 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-[10px] text-gray-500">
                            No image
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="font-semibold text-white">
                          {item.nama}
                        </div>
                        {item.deskripsi && (
                          <div className="mt-1 max-w-xs text-xs text-gray-500 line-clamp-2">
                            {item.deskripsi}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5 align-middle text-gray-300">
                        {item.brand}
                      </td>
                      <td className="px-6 py-5 align-middle text-gray-300">
                        {formatRupiah(item.harga_per_hari)}
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span
                          className={
                            item.stok > 0
                              ? "font-semibold text-emerald-400"
                              : "font-semibold text-red-400"
                          }
                        >
                          {item.stok}
                        </span>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <StatusBadge
                          label={item.aktif ? "Aktif" : "Tidak Aktif"}
                          tone={item.aktif ? "success" : "neutral"}
                        />
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/kamera/${item.id}`)
                            }
                            className="rounded-full border border-yellow-400 px-4 py-2 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => ubahStatusKamera(item)}
                            className={
                              item.aktif
                                ? "rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
                                : "rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-white"
                            }
                          >
                            {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
