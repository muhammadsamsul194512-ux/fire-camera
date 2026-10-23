"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PaymentCountdown } from "@/components/PaymentCountdown";
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
  payment_expires_at?: string | null;
  expired_at?: string | null;
  payment?: { status: string; reupload_expires_at?: string | null } | Array<{ status: string; reupload_expires_at?: string | null }> | null;
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadOrder() {
    setLoading(true);
    setError("");
    setOrder(null);

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

      const nextOrder = Array.isArray(result.data)
        ? (result.data[0] ?? null)
        : (result.data ?? null);

      setOrder(nextOrder || null);
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

  const detailList = Array.isArray(order.detail) ? order.detail : [];
  const payment = Array.isArray(order.payment) ? order.payment[0] : order.payment;
  const activeDeadline = payment?.status === "perlu_upload_ulang"
    ? payment.reupload_expires_at
    : payment?.status === "menunggu_pembayaran"
      ? order.payment_expires_at
      : null;
  const paymentDeadline = activeDeadline ? new Date(activeDeadline) : null;
  const timeRemainingMs = paymentDeadline
    ? Math.max(paymentDeadline.getTime() - now, 0)
    : 0;
  const isExpired = Boolean(
    order.status === "kedaluwarsa" || (paymentDeadline && timeRemainingMs <= 0),
  );

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
          <StatusBadge status={order.status} />
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

          <div className="mb-6 rounded-2xl border border-gray-800 bg-black/30 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                  {payment?.status === "perlu_upload_ulang" ? "Batas Upload Ulang" : "Batas Pembayaran"}
                </p>
                {paymentDeadline ? (
                  <p className="mt-2 text-2xl font-bold text-yellow-300">
                    {isExpired ? (
                      "Kadaluarsa"
                    ) : (
                      <PaymentCountdown
                        deadline={order.payment_expires_at ?? null}
                        className="inline-block tabular-nums"
                      />
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">
                    {payment?.status === "menunggu_verifikasi"
                      ? "Bukti telah dikirim dan sedang menunggu verifikasi admin."
                      : "Tidak ada tenggat pembayaran yang sedang berlaku."}
                  </p>
                )}
              </div>

              {paymentDeadline && !isExpired && (
                <div className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">
                  {payment?.status === "perlu_upload_ulang" ? "Sisa waktu upload ulang" : "Sisa waktu pembayaran"}
                </div>
              )}
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
              {detailList.length === 0 ? (
                <div className="text-sm text-gray-400">
                  Data kamera tidak tersedia.
                </div>
              ) : (
                detailList.map((detail, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    className="flex flex-col gap-1 rounded-xl border border-gray-800 bg-gray-900/60 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {detail.camera?.brand || "-"}{" "}
                        {detail.camera?.nama || "-"}
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
                ))
              )}
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
