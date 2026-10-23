"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notifications";

type Payment = {
  id: number;
  order_id: number;
  status: string;
  metode: string | null;
  bank: string | null;
  bukti_pembayaran_url: string | null;
  proof_error?: string;
  uploaded_at: string | null;
  catatan_admin: string | null;
  order: {
    nomor_pesanan: string;
    total_harga: number;
    tanggal_ambil: string;
    tanggal_kembali: string;
    jumlah_hari: number;
    payment_expires_at: string | null;
    customer?: { nama_lengkap?: string; whatsapp?: string } | null;
    detail?: Array<{ jumlah: number; camera?: { nama?: string; brand?: string } | null }>;
  } | null;
};

type ReviewAction = "konfirmasi" | "tolak" | "upload_ulang";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function AdminPembayaranPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }
      const response = await fetch("/api/admin/pembayaran/verifikasi?filter=needs_verification", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Gagal mengambil data pembayaran.");
        return;
      }
      setPayments(Array.isArray(result.data) ? result.data : []);
    } catch (loadError) {
      console.error("Gagal mengambil pembayaran:", loadError);
      setError("Terjadi kesalahan saat mengambil data pembayaran.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPayments(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  function openDecision(payment: Payment, nextAction: ReviewAction) {
    setSelected(payment);
    setAction(nextAction);
    setReason("");
  }

  async function submitDecision() {
    if (!selected || !action || submitting) return;
    if (action !== "konfirmasi" && reason.trim().length < 8) {
      notify.error("Alasan belum cukup", "Isi alasan minimal 8 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }
      const response = await fetch("/api/admin/pembayaran/verifikasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentId: selected.id, action, catatanAdmin: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        notify.error("Keputusan gagal disimpan", result.error || "Silakan muat ulang dan coba lagi.");
        return;
      }
      notify.success(result.message || "Keputusan pembayaran berhasil disimpan.");
      setSelected(null);
      setAction(null);
      await loadPayments();
    } catch (submitError) {
      console.error("Gagal memproses pembayaran:", submitError);
      notify.error("Terjadi kesalahan saat menyimpan keputusan.");
    } finally {
      setSubmitting(false);
    }
  }

  const actionLabel = action === "konfirmasi" ? "Terima Pembayaran" : action === "tolak" ? "Tolak Pembayaran" : "Minta Upload Ulang";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Verifikasi Pembayaran</h1>
            <p className="mt-2 text-sm text-gray-400">Bukti yang sudah dikirim dan menunggu keputusan admin.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/admin")} className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-200 hover:border-yellow-400 hover:text-yellow-400">Dashboard</button>
            <button type="button" disabled={loading} onClick={() => void loadPayments()} className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50">{loading ? "Memuat…" : "Refresh"}</button>
          </div>
        </header>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        <div className="mb-4 rounded-2xl border border-gray-800 bg-gray-950 p-4 text-sm text-gray-300">Antrian menunggu verifikasi: <strong className="text-white">{payments.length}</strong></div>

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          {loading ? <div className="p-10 text-center text-gray-400">Memuat antrean verifikasi…</div>
            : error ? <div className="p-10 text-center text-gray-400">Data pembayaran belum dapat ditampilkan.</div>
              : payments.length === 0 ? <div className="p-10 text-center"><p className="text-lg font-semibold text-white">Tidak ada pembayaran yang perlu diverifikasi.</p><p className="mt-2 text-sm text-gray-400">Bukti baru akan muncul di sini setelah pelanggan mengirimkannya.</p></div>
                : <div className="divide-y divide-gray-800">
                  {payments.map((payment) => {
                    const rental = payment.order?.detail?.map((item) => `${item.camera?.brand ?? ""} ${item.camera?.nama ?? "Kamera"} × ${item.jumlah}`).join(", ") || "Detail kamera tidak tersedia";
                    return <article key={payment.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold">{payment.order?.nomor_pesanan || `Pesanan #${payment.order_id}`}</h2>
                          <StatusBadge status={payment.status} />
                        </div>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          <div><p className="text-gray-500">Pelanggan</p><p className="mt-1 text-white">{payment.order?.customer?.nama_lengkap || "-"}</p><p className="text-gray-400">{payment.order?.customer?.whatsapp || "-"}</p></div>
                          <div><p className="text-gray-500">Tagihan · Metode</p><p className="mt-1 font-semibold text-yellow-300">{rupiah(payment.order?.total_harga ?? 0)}</p><p className="text-gray-300">{payment.metode || "-"}{payment.bank ? ` · ${payment.bank}` : ""}</p></div>
                          <div><p className="text-gray-500">Bukti dikirim</p><p className="mt-1 text-white">{payment.uploaded_at ? new Date(payment.uploaded_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}</p></div>
                        </div>
                        <p className="mt-4 text-sm text-gray-300">{rental}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button type="button" disabled={!payment.bukti_pembayaran_url} onClick={() => openDecision(payment, "konfirmasi")} className="rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Terima Pembayaran</button>
                          <button type="button" disabled={!payment.bukti_pembayaran_url} onClick={() => openDecision(payment, "tolak")} className="rounded-full border border-red-500 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">Tolak Pembayaran</button>
                          <button type="button" disabled={!payment.bukti_pembayaran_url} onClick={() => openDecision(payment, "upload_ulang")} className="rounded-full border border-amber-400 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-40">Minta Upload Ulang</button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-800 bg-black/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Bukti pembayaran</p>
                        {payment.bukti_pembayaran_url ? <a href={payment.bukti_pembayaran_url} target="_blank" rel="noreferrer" className="block" aria-label="Buka bukti pembayaran ukuran penuh">
                          {payment.bukti_pembayaran_url.toLowerCase().includes(".pdf") ? <div className="flex h-40 items-center justify-center rounded-lg bg-gray-900 text-sm text-yellow-300">Buka dokumen PDF ↗</div> : <img src={payment.bukti_pembayaran_url} alt={`Bukti pembayaran ${payment.order?.nomor_pesanan ?? payment.order_id}`} className="h-40 w-full rounded-lg object-contain" />}
                          <span className="mt-2 block text-center text-xs text-yellow-300">Buka ukuran penuh ↗</span>
                        </a> : <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-700 px-3 text-center text-sm text-gray-400">{payment.proof_error || "Bukti tidak tersedia."}</div>}
                      </div>
                    </article>;
                  })}
                </div>}
        </section>
      </div>

      {selected && action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) { setSelected(null); setAction(null); } }}>
        <section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-950 p-6 shadow-2xl">
          <h2 id="decision-title" className="text-xl font-bold">{actionLabel}</h2>
          <p className="mt-2 text-sm text-gray-300">{action === "konfirmasi" ? `Konfirmasi pembayaran ${selected.order?.nomor_pesanan ?? `#${selected.order_id}`} dan lanjutkan pesanan ke status Dikonfirmasi?` : `Masukkan alasan yang akan ditampilkan kepada pelanggan untuk pesanan ${selected.order?.nomor_pesanan ?? `#${selected.order_id}`}.`}</p>
          {action !== "konfirmasi" && <div className="mt-4"><label htmlFor="review-reason" className="mb-2 block text-sm font-medium text-gray-200">Alasan (minimal 8 karakter)</label><textarea id="review-reason" rows={4} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-black p-3 text-sm text-white outline-none focus:border-yellow-400" placeholder={action === "tolak" ? "Contoh: Bukti pembayaran tidak sesuai nominal tagihan." : "Jelaskan bagian bukti yang perlu diperbaiki."} /><p className="mt-1 text-right text-xs text-gray-500">{reason.trim().length}/500</p></div>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={submitting} onClick={() => { setSelected(null); setAction(null); }} className="rounded-full border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 disabled:opacity-50">Batal</button>
            <button type="button" disabled={submitting || (action !== "konfirmasi" && reason.trim().length < 8)} onClick={() => void submitDecision()} className="rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Menyimpan…" : "Konfirmasi tindakan"}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
