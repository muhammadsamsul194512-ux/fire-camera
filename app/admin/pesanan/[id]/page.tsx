"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { notify } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

type PesananDetail = {
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

function formatTanggal(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AdminPesananDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PesananDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);

  async function loadOrder() {
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

      const response = await fetch(`/api/admin/pesanan?id=${params.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Gagal mengambil detail pesanan.");
        return;
      }

      setOrder(result.data || null);
    } catch (error) {
      console.error("Error loading order detail:", error);
      setError("Terjadi kesalahan saat memuat detail pesanan.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(payload: { status?: string; action?: "batal" }) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/admin/login");
      return;
    }

    setMutating(true);

    try {
      if (payload.action === "batal") {
        const response = await fetch("/api/admin/pesanan/batal", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId: Number(params.id) }),
        });

        const result = await response.json();
        if (!response.ok) {
          notify.error(
            "Gagal membatalkan pesanan.",
            result.error || "Terjadi kesalahan.",
          );
          return;
        }

        await loadOrder();
        notify.success("Pesanan berhasil dibatalkan.");
        return;
      }

      const response = await fetch("/api/admin/pesanan/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId: Number(params.id),
          status: payload.status,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        notify.error(
          "Gagal mengubah status pesanan.",
          result.error || "Terjadi kesalahan.",
        );
        return;
      }

      await loadOrder();
      notify.success("Status pesanan berhasil diperbarui.");
    } catch (error) {
      console.error("Gagal update status pesanan:", error);
      notify.error("Terjadi kesalahan saat mengubah status pesanan.");
    } finally {
      setMutating(false);
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 p-10 text-center">
          Memuat detail pesanan...
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 p-10 text-center">
          {error || "Pesanan tidak ditemukan."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => router.push("/admin/pesanan")}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-yellow-400 hover:text-yellow-400"
          >
            ← Kembali ke daftar
          </button>
          <StatusBadge
            label={statusLabelMap[order.status] || order.status}
            tone={statusToneMap[order.status] || "neutral"}
          />
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
                Reservasi
              </p>
              <h1 className="mt-2 text-3xl font-bold">{order.nomor_pesanan}</h1>
            </div>
            <div className="text-sm text-gray-400">
              Dibuat{" "}
              {new Date(order.created_at).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-800 bg-black/30 p-5">
              <h2 className="mb-4 text-lg font-semibold">
                Informasi Pelanggan
              </h2>
              <dl className="space-y-3 text-sm text-gray-300">
                <div>
                  <dt className="text-gray-500">Nama</dt>
                  <dd className="font-medium text-white">
                    {order.customer?.nama_lengkap || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">WhatsApp</dt>
                  <dd>{order.customer?.whatsapp || "-"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd>{order.customer?.email || "-"}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-black/30 p-5">
              <h2 className="mb-4 text-lg font-semibold">Informasi Sewa</h2>
              <dl className="space-y-3 text-sm text-gray-300">
                <div>
                  <dt className="text-gray-500">Periode</dt>
                  <dd>
                    {formatTanggal(order.tanggal_ambil)} –{" "}
                    {formatTanggal(order.tanggal_kembali)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Jam</dt>
                  <dd>
                    {order.jam_ambil} – {order.jam_kembali}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Durasi</dt>
                  <dd>{order.jumlah_hari} hari</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total</dt>
                  <dd className="font-semibold text-yellow-300">
                    {formatRupiah(order.total_harga)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-800 bg-black/30 p-5">
            <h2 className="mb-4 text-lg font-semibold">Detail Kamera</h2>
            <div className="space-y-3">
              {order.detail.map((detail, index) => (
                <div
                  key={`${order.id}-${index}`}
                  className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900/60 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium text-white">
                      {detail.camera?.brand || "-"} {detail.camera?.nama || "-"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {detail.jumlah} unit ×{" "}
                      {formatRupiah(detail.harga_per_hari)} / hari
                    </div>
                  </div>
                  <div className="font-semibold text-yellow-300">
                    {formatRupiah(detail.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-800 bg-black/30 p-5">
            <h2 className="mb-4 text-lg font-semibold">Aksi</h2>
            <div className="flex flex-wrap gap-3">
              {order.status !== "dibatalkan" &&
                order.status !== "selesai" &&
                order.status !== "ditolak" && (
                  <button
                    type="button"
                    disabled={mutating}
                    onClick={() => void updateStatus({ action: "batal" })}
                    className="rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batalkan
                  </button>
                )}

              {order.status === "dikonfirmasi" && (
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() => void updateStatus({ status: "disewa" })}
                  className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tandai Disewa
                </button>
              )}

              {order.status === "disewa" && (
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() => void updateStatus({ status: "selesai" })}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tandai Selesai
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
