"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import { usePengaturan } from "@/hooks/usePengaturan";
import { formatRupiah } from "@/lib/utils";

type PaymentData = {
  id: number;
  status: string;
  catatan_admin: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  bukti_pembayaran_url: string | null;
};

function PembayaranContent() {
  const searchParams = useSearchParams();
  const pengaturan = usePengaturan();

  const nomorPesanan = searchParams.get("pesanan") || "";
  const total = Number(searchParams.get("total") || 0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  // Fetch payment status
  useEffect(() => {
    async function ambil() {
      if (!nomorPesanan) {
        setLoadingStatus(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/pembayaran/status?pesanan=${encodeURIComponent(nomorPesanan)}`,
        );
        const hasil = await res.json();
        if (res.ok) {
          setPayment(hasil.data?.payment || null);
          setPaymentExpiresAt(hasil.data?.payment_expires_at || null);
          setExpiredAt(hasil.data?.expired_at || null);
        }
      } catch {
        // status load failure is non-critical
      } finally {
        setLoadingStatus(false);
      }
    }
    ambil();
  }, [nomorPesanan]);

  function bolehUpload() {
    if (!payment) return true;
    return [
      "menunggu_pembayaran",
      "menunggu_verifikasi",
      "ditolak",
      "perlu_upload_ulang",
    ].includes(payment.status);
  }

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPesan("");
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;

    if (!["image/jpeg", "image/png", "application/pdf"].includes(f.type)) {
      setError("Format file harus JPG, JPEG, PNG, atau PDF.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5 MB.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  async function uploadBukti() {
    setPesan("");
    setError("");

    if (!file) {
      setError("Silakan pilih bukti pembayaran terlebih dahulu.");
      return;
    }
    if (!nomorPesanan) {
      setError("Nomor pesanan tidak ditemukan.");
      return;
    }
    if (sudahKedaluwarsa) {
      setError(
        "Reservasi sudah kedaluwarsa. Silakan cek ketersediaan kamera dan buat pesanan baru.",
      );
      return;
    }
    if (!bolehUpload()) {
      setError("Bukti pembayaran tidak dapat diupload pada status saat ini.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nomorPesanan", nomorPesanan);

      const res = await fetch("/api/pembayaran/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengupload bukti pembayaran.");
        return;
      }

      setPesan(
        "Bukti pembayaran berhasil diupload dan sedang menunggu verifikasi admin.",
      );
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setPayment((prev) =>
        prev
          ? {
              ...prev,
              status: "menunggu_verifikasi",
              catatan_admin: null,
              uploaded_at: new Date().toISOString(),
              verified_at: null,
            }
          : prev,
      );
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const sedangUploadUlang =
    payment?.status === "perlu_upload_ulang" || payment?.status === "ditolak";
  const sudahDikonfirmasi = payment?.status === "dikonfirmasi";
  const sudahKedaluwarsa =
    payment?.status === "kedaluwarsa" ||
    expiredAt ||
    (paymentExpiresAt && new Date(paymentExpiresAt).getTime() <= Date.now());

  // Guard: no order number in URL
  if (!nomorPesanan) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar namaToko={pengaturan.nama_toko} />
        <main className="flex flex-1 items-center justify-center px-6 py-20 text-center">
          <div>
            <p className="text-xl font-bold">Nomor pesanan tidak ditemukan.</p>
            <p className="mt-2 text-sm text-zinc-400">
              Akses halaman ini dari halaman pemesanan.
            </p>
            <Link
              href="/kamera"
              className="mt-6 inline-block rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black hover:bg-yellow-300 transition"
            >
              Lihat Daftar Kamera
            </Link>
          </div>
        </main>
        <Footer
          namaToko={pengaturan.nama_toko}
          whatsapp={pengaturan.whatsapp}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar namaToko={pengaturan.nama_toko} />

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Pembayaran
          </p>
          <h1 className="mt-2 text-4xl font-bold">Selesaikan Pembayaran</h1>
          <p className="mt-3 text-zinc-400">
            Transfer ke rekening di bawah, lalu upload bukti pembayaran.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT — order detail */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-bold">Detail Pesanan</h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs text-zinc-500">Nomor Pesanan</p>
                <p className="mt-1 font-bold text-lg">{nomorPesanan}</p>
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <p className="text-xs text-zinc-500">Total Pembayaran</p>
                <p className="mt-1 text-2xl font-bold text-yellow-400">
                  {formatRupiah(total)}
                </p>
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <p className="text-xs text-zinc-500">Status Pembayaran</p>
                {loadingStatus ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
                    <span className="text-sm text-zinc-400">
                      Memuat status…
                    </span>
                  </div>
                ) : payment ? (
                  <div className="mt-2">
                    <StatusBadge status={payment.status} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">
                    Belum ada data pembayaran.
                  </p>
                )}

                {paymentExpiresAt &&
                  !sudahDikonfirmasi &&
                  !sudahKedaluwarsa && (
                    <p className="mt-2 text-xs text-zinc-400">
                      Batas pembayaran:{" "}
                      {new Date(paymentExpiresAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}

                {sudahKedaluwarsa && (
                  <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">
                    Reservasi ini sudah kedaluwarsa. Silakan cek ketersediaan
                    dan buat pesanan baru.
                  </div>
                )}
              </div>

              {/* Screenshot reminder */}
              <div className="border-t border-zinc-800 pt-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 px-4 py-3">
                <p className="text-sm font-medium text-yellow-400">
                  📸 Screenshot halaman ini sebagai bukti penyewaan.
                </p>
              </div>

              {/* Link to check order */}
              <div className="border-t border-zinc-800 pt-4">
                <Link
                  href={`/riwayat`}
                  className="text-sm text-zinc-400 hover:text-yellow-400 transition underline"
                >
                  Cek status pesanan →
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT — transfer & upload */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-bold">Transfer Bank</h2>

            {sudahKedaluwarsa && (
              <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="font-semibold text-orange-300">
                  Reservasi Kedaluwarsa
                </p>
                <p className="mt-1.5 text-sm text-orange-200">
                  Batas waktu pembayaran telah berakhir dan ruang kamera telah
                  dibuka kembali untuk pemesanan baru.
                </p>
                <Link
                  href="/kamera"
                  className="mt-3 inline-block rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition"
                >
                  Cek Ketersediaan →
                </Link>
              </div>
            )}

            {/* Re-upload warning */}
            {sedangUploadUlang && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-semibold text-red-400">Perlu Upload Ulang</p>
                <p className="mt-1.5 text-sm text-red-300">
                  Admin meminta kamu mengupload ulang bukti pembayaran.
                </p>
                {payment?.catatan_admin && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                      Catatan Admin
                    </p>
                    <p className="mt-1.5 text-sm text-red-200">
                      {payment.catatan_admin}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Already confirmed */}
            {sudahDikonfirmasi && (
              <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="font-semibold text-green-400">
                  ✓ Pembayaran Telah Dikonfirmasi
                </p>
                <p className="mt-1.5 text-sm text-green-300">
                  Datang ke toko sesuai jadwal pengambilan.
                </p>
                <Link
                  href="/riwayat"
                  className="mt-3 inline-block rounded-full bg-green-500 px-5 py-2 text-sm font-semibold text-white hover:bg-green-400 transition"
                >
                  Lihat Detail Pesanan →
                </Link>
              </div>
            )}

            {/* Bank info */}
            <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
              <div>
                <p className="text-xs text-zinc-400">Bank</p>
                <p className="mt-0.5 text-lg font-bold">
                  {pengaturan.bank || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Nomor Rekening</p>
                <p className="mt-0.5 text-2xl font-bold tracking-wider">
                  {pengaturan.nomor_rekening || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Atas Nama</p>
                <p className="mt-0.5 font-semibold">
                  {pengaturan.nama_pemilik_rekening || "—"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-400 leading-6">
              Transfer tepat sejumlah{" "}
              <span className="font-semibold text-white">
                {formatRupiah(total)}
              </span>
              . Setelah transfer, upload bukti di bawah.
            </p>

            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={pilihFile}
              className="hidden"
            />

            {/* Upload section — hide if confirmed */}
            {!sudahDikonfirmasi && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || loadingStatus || !bolehUpload()}
                  className="mt-5 w-full rounded-full border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sedangUploadUlang
                    ? "Pilih Bukti Pembayaran Baru"
                    : "Pilih Bukti Pembayaran"}
                </button>

                {file && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs text-zinc-500">File dipilih</p>
                    <p className="mt-0.5 break-all text-sm font-medium">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {pesan && (
                  <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <p className="text-sm text-green-400">{pesan}</p>
                    <Link
                      href="/riwayat"
                      className="mt-3 inline-block rounded-full bg-green-500 px-5 py-2 text-sm font-semibold text-white hover:bg-green-400 transition"
                    >
                      Cek Status Pesanan →
                    </Link>
                  </div>
                )}

                <button
                  type="button"
                  onClick={uploadBukti}
                  disabled={loading || loadingStatus || !file || !bolehUpload()}
                  className="mt-3 w-full rounded-full bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Mengupload…"
                    : sedangUploadUlang
                      ? "Upload Ulang Bukti"
                      : "Upload Bukti Pembayaran"}
                </button>

                <p className="mt-2 text-center text-xs text-zinc-500">
                  Format: JPG, JPEG, PNG, atau PDF. Maksimal 5 MB.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer namaToko={pengaturan.nama_toko} whatsapp={pengaturan.whatsapp} />
    </div>
  );
}

export default function PembayaranPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
        </div>
      }
    >
      <PembayaranContent />
    </Suspense>
  );
}
