"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/lib/supabase";

type Pesanan = {
  id: number;
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
  } | null;
  detail: Array<{
    jumlah: number;
    harga_per_hari: number;
    subtotal: number;
    camera: {
      nama: string;
      brand: string;
    } | null;
  }>;
};

const statusLabelMap: Record<string, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_verifikasi: "Menunggu Verifikasi",
  dikonfirmasi: "Dikonfirmasi",
  disewa: "Disewa",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  ditolak: "Ditolak",
};

const statusToneMap: Record<
  string,
  "neutral" | "warning" | "success" | "danger" | "info" | "purple"
> = {
  menunggu_pembayaran: "warning",
  menunggu_verifikasi: "warning",
  dikonfirmasi: "info",
  disewa: "purple",
  selesai: "success",
  dibatalkan: "neutral",
  ditolak: "danger",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminPesananPage() {
  const router = useRouter();
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function ambilPesanan() {
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

      const response = await fetch("/api/admin/pesanan", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Gagal mengambil data pesanan.");
        return;
      }

      setPesanan(result.data || []);
    } catch (error) {
      console.error("Gagal mengambil pesanan:", error);
      setError("Terjadi kesalahan saat mengambil data pesanan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void ambilPesanan();
  }, [router]);

  const filteredPesanan = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pesanan.filter((item) => {
      const matchesSearch =
        !query ||
        item.nomor_pesanan.toLowerCase().includes(query) ||
        item.customer?.nama_lengkap?.toLowerCase().includes(query) ||
        item.customer?.whatsapp?.toLowerCase().includes(query) ||
        item.detail.some((detail) =>
          detail.camera?.nama.toLowerCase().includes(query),
        );

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pesanan, search, statusFilter]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Kelola Pesanan</h1>
            <p className="mt-2 text-sm text-gray-400">
              Lihat ringkasan pesanan, status, dan detail penyewaan dalam satu
              daftar yang lebih terorganisir.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-yellow-400 hover:text-yellow-400"
          >
            Dashboard
          </button>
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
                placeholder="Cari nomor pesanan / pelanggan / kamera..."
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
              >
                <option value="all">Semua status</option>
                {Object.entries(statusLabelMap).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
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
              Memuat data pesanan...
            </div>
          ) : filteredPesanan.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-lg font-semibold text-white">
                Tidak ada pesanan yang cocok
              </p>
              <p className="mt-2 text-sm">
                Coba ubah pencarian atau filter status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                    <th className="px-6 py-4">Pesanan</th>
                    <th className="px-6 py-4">Pelanggan</th>
                    <th className="px-6 py-4">Kamera</th>
                    <th className="px-6 py-4">Periode</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPesanan.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-900 hover:bg-gray-900/80"
                    >
                      <td className="px-6 py-5 align-middle">
                        <div className="font-semibold text-white">
                          {item.nomor_pesanan}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString(
                            "id-ID",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="font-medium text-white">
                          {item.customer?.nama_lengkap || "-"}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {item.customer?.whatsapp || "-"}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1 text-sm text-gray-300">
                          {item.detail.map((detail, index) => (
                            <div key={`${item.id}-${index}`}>
                              {detail.camera?.brand || "-"}{" "}
                              {detail.camera?.nama || "-"}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle text-sm text-gray-300">
                        <div>
                          {new Date(
                            `${item.tanggal_ambil}T00:00:00`,
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          -{" "}
                          {new Date(
                            `${item.tanggal_kembali}T00:00:00`,
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.jumlah_hari} hari
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle font-semibold text-yellow-300">
                        {formatRupiah(item.total_harga)}
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <StatusBadge
                          label={statusLabelMap[item.status] || item.status}
                          tone={statusToneMap[item.status] || "neutral"}
                        />
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/pesanan/${item.id}`)
                            }
                            className="rounded-full border border-yellow-400 px-4 py-2 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
                          >
                            Detail
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
