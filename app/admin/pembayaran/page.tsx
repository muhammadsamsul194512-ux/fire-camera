"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: number;
  order_id: number;
  status: string;
  metode: string | null;
  bank: string | null;
  bukti_pembayaran_url: string | null;
  uploaded_at: string | null;
  created_at: string | null;
  order: {
    id: number;
    nomor_pesanan: string;
    total_harga: number;
    customer?: {
      nama_lengkap?: string;
      whatsapp?: string;
    } | null;
  } | null;
};

const statusLabelMap: Record<string, string> = {
  menunggu_verifikasi: "Menunggu Verifikasi",
  perlu_upload_ulang: "Perlu Upload Ulang",
  dikonfirmasi: "Dikonfirmasi",
  ditolak: "Ditolak",
};

const statusToneMap: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  menunggu_verifikasi: "warning",
  perlu_upload_ulang: "warning",
  dikonfirmasi: "success",
  ditolak: "danger",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminPembayaranPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function ambilPembayaran() {
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

      const response = await fetch("/api/admin/pembayaran/verifikasi?filter=needs_verification", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Gagal mengambil data pembayaran.");
        return;
      }

      setPayments(result.data || []);
    } catch (error) {
      console.error("Gagal mengambil pembayaran:", error);
      setError("Terjadi kesalahan saat mengambil data pembayaran.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void ambilPembayaran();
  }, [router]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") return payments;
    return payments.filter((payment) => payment.status === statusFilter);
  }, [payments, statusFilter]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Verifikasi Pembayaran</h1>
            <p className="mt-2 text-sm text-gray-400">Konsentrasi pada pembayaran yang membutuhkan tindakan admin saat ini.</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/admin")} className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:border-yellow-400 hover:text-yellow-400">? Dashboard</button>
            <button type="button" onClick={() => void ambilPembayaran()} className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300">? Refresh</button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        )}

        <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-950 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-400">Antrian yang perlu ditangani</p>
              <p className="mt-1 text-xl font-semibold text-white">{payments.length} item</p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
            >
              <option value="all">Semua butuh perhatian</option>
              <option value="menunggu_verifikasi">Menunggu verifikasi</option>
              <option value="perlu_upload_ulang">Perlu upload ulang</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Memuat antrean verifikasi...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-lg font-semibold text-white">Tidak ada pembayaran yang perlu diverifikasi</p>
              <p className="mt-2 text-sm">Semua item telah selesai ditangani atau tidak memerlukan tindakan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-xs uppercase tracking-[0.2em] text-gray-400">
                    <th className="px-6 py-4">Pesanan</th>
                    <th className="px-6 py-4">Pelanggan</th>
                    <th className="px-6 py-4">Metode</th>
                    <th className="px-6 py-4">Jumlah</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-900 hover:bg-gray-900/80">
                      <td className="px-6 py-5 align-middle">
                        <div className="font-semibold text-white">{payment.order?.nomor_pesanan || `#${payment.order_id}`}</div>
                        <div className="mt-1 text-xs text-gray-500">{payment.uploaded_at ? new Date(payment.uploaded_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="font-medium text-white">{payment.order?.customer?.nama_lengkap || "-"}</div>
                        <div className="mt-1 text-xs text-gray-400">{payment.order?.customer?.whatsapp || "-"}</div>
                      </td>

                      <td className="px-6 py-5 align-middle text-sm text-gray-300">
                        <div>{payment.metode || "-"}</div>
                        {payment.bank && <div className="mt-1 text-xs text-gray-500">{payment.bank}</div>}
                      </td>

                      <td className="px-6 py-5 align-middle font-semibold text-yellow-300">{payment.order ? formatRupiah(payment.order.total_harga) : "-"}</td>

                      <td className="px-6 py-5 align-middle">
                        <StatusBadge label={statusLabelMap[payment.status] || payment.status} tone={statusToneMap[payment.status] || "neutral"} />
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="flex justify-end">
                          <button type="button" onClick={() => router.push(`/admin/pesanan/${payment.order_id}`)} className="rounded-full border border-yellow-400 px-4 py-2 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black">Review</button>
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
