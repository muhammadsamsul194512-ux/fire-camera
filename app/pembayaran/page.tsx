"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type PaymentData = {
  id: number;
  status: string;
  catatan_admin: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  bukti_pembayaran_url: string | null;
};

export default function PembayaranPage() {
  const searchParams = useSearchParams();

  const nomorPesanan = searchParams.get("pesanan") || "-";
  const total = Number(searchParams.get("total") || 0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [namaToko, setNamaToko] = useState("");
  const [bank, setBank] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");

  const [payment, setPayment] =
    useState<PaymentData | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] =
    useState(true);

  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function ambilPengaturan() {
      try {
        const response = await fetch(
          "/api/pengaturan"
        );

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

        if (hasil.data?.bank) {
          setBank(hasil.data.bank);
        }

        if (hasil.data?.nomor_rekening) {
          setNomorRekening(
            hasil.data.nomor_rekening
          );
        }

        if (
          hasil.data?.nama_pemilik_rekening
        ) {
          setNamaPemilik(
            hasil.data.nama_pemilik_rekening
          );
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

  useEffect(() => {
    async function ambilStatusPembayaran() {
      if (
        !nomorPesanan ||
        nomorPesanan === "-"
      ) {
        setLoadingStatus(false);
        return;
      }

      try {
        setLoadingStatus(true);

        const response = await fetch(
          `/api/pembayaran/status?pesanan=${encodeURIComponent(
            nomorPesanan
          )}`
        );

        const hasil = await response.json();

        if (!response.ok) {
          console.error(
            "Gagal mengambil status pembayaran:",
            hasil
          );
          return;
        }

        setPayment(hasil.data?.payment || null);
      } catch (error) {
        console.error(
          "Error mengambil status pembayaran:",
          error
        );
      } finally {
        setLoadingStatus(false);
      }
    }

    ambilStatusPembayaran();
  }, [nomorPesanan]);

  function formatStatus(status: string) {
    const statusMap: Record<
      string,
      string
    > = {
      menunggu_verifikasi:
        "Menunggu Verifikasi",

      dikonfirmasi:
        "Pembayaran Dikonfirmasi",

      ditolak:
        "Pembayaran Ditolak",

      perlu_upload_ulang:
        "Perlu Upload Ulang",
    };

    return statusMap[status] || status;
  }

  function statusClass(status: string) {
    if (status === "dikonfirmasi") {
      return "bg-green-500/15 text-green-400 border border-green-500/30";
    }

    if (
      status === "ditolak" ||
      status === "perlu_upload_ulang"
    ) {
      return "bg-red-500/15 text-red-400 border border-red-500/30";
    }

    return "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30";
  }

  function bolehUpload() {
  if (!payment) {
    return true;
  }

  return (
    payment.status ===
      "menunggu_pembayaran" ||
    payment.status ===
      "menunggu_verifikasi" ||
    payment.status === "ditolak" ||
    payment.status ===
      "perlu_upload_ulang"
  );
}

  function pilihFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setPesan("");
    setError("");

    const fileDipilih =
      event.target.files?.[0];

    if (!fileDipilih) {
      return;
    }

    const tipeFileDiizinkan = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (
      !tipeFileDiizinkan.includes(
        fileDipilih.type
      )
    ) {
      setError(
        "Format file harus JPG, JPEG, PNG, atau PDF."
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (
      fileDipilih.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Ukuran file maksimal 5 MB."
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFile(fileDipilih);
  }

  async function uploadBukti() {
    setPesan("");
    setError("");

    if (!file) {
      setError(
        "Silakan pilih bukti pembayaran terlebih dahulu."
      );
      return;
    }

    if (
      !nomorPesanan ||
      nomorPesanan === "-"
    ) {
      setError(
        "Nomor pesanan tidak ditemukan."
      );
      return;
    }

    if (!bolehUpload()) {
      setError(
        "Bukti pembayaran tidak dapat diupload pada status saat ini."
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "nomorPesanan",
        nomorPesanan
      );

      const response = await fetch(
        "/api/pembayaran/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Gagal mengupload bukti pembayaran."
        );
        return;
      }

      setPesan(
        "Bukti pembayaran berhasil diupload dan sedang menunggu verifikasi admin."
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Update status di tampilan
      setPayment((sebelumnya) => {
        if (!sebelumnya) {
          return sebelumnya;
        }

        return {
          ...sebelumnya,
          status: "menunggu_verifikasi",
          catatan_admin: null,
          uploaded_at:
            new Date().toISOString(),
          verified_at: null,
        };
      });
    } catch (err) {
      console.error(err);

      setError(
        "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoading(false);
    }
  }

  const sedangUploadUlang =
    payment?.status ===
      "perlu_upload_ulang" ||
    payment?.status === "ditolak";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* NAVBAR */}
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-2xl font-bold tracking-wider"
          >
            {namaToko}
          </a>

          <a
            href="/kamera"
            className="text-sm text-zinc-300 transition hover:text-yellow-400"
          >
            Daftar Kamera
          </a>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Pembayaran
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Selesaikan Pembayaran
          </h1>

          <p className="mt-4 text-zinc-400">
            Silakan lakukan transfer sesuai
            total pembayaran pesanan kamu.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          {/* DETAIL PESANAN */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">
              Detail Pesanan
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-zinc-500">
                  Nomor Pesanan
                </p>

                <p className="mt-1 font-semibold">
                  {nomorPesanan}
                </p>
              </div>

              <div className="border-t border-zinc-800 pt-5">
                <p className="text-sm text-zinc-500">
                  Total Pembayaran
                </p>

                <p className="mt-1 text-2xl font-bold text-yellow-400">
                  Rp
                  {total.toLocaleString(
                    "id-ID"
                  )}
                </p>
              </div>

              {/* STATUS PEMBAYARAN */}
              <div className="border-t border-zinc-800 pt-5">
                <p className="text-sm text-zinc-500">
                  Status Pembayaran
                </p>

                {loadingStatus ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    Mengecek status pembayaran...
                  </p>
                ) : payment ? (
                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                        payment.status
                      )}`}
                    >
                      {formatStatus(
                        payment.status
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">
                    Belum ada data pembayaran.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* TRANSFER */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">
              Transfer Bank
            </h2>

            {/* PESAN UPLOAD ULANG */}
            {sedangUploadUlang && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="font-semibold text-red-400">
                  Bukti Pembayaran Perlu
                  Diperbaiki
                </p>

                <p className="mt-2 text-sm leading-6 text-red-300">
                  Admin meminta kamu untuk
                  mengupload ulang bukti
                  pembayaran.
                </p>

                {payment?.catatan_admin && (
                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-950/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                      Catatan Admin
                    </p>

                    <p className="mt-2 text-sm leading-6 text-red-200">
                      {payment.catatan_admin}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="text-sm text-zinc-400">
                Bank
              </p>

              <p className="mt-1 text-xl font-bold">
                {bank || "-"}
              </p>

              <p className="mt-4 text-sm text-zinc-400">
                Nomor Rekening
              </p>

              <p className="mt-1 text-2xl font-bold tracking-wider">
                {nomorRekening || "-"}
              </p>

              <p className="mt-4 text-sm text-zinc-400">
                Nama Pemilik Rekening
              </p>

              <p className="mt-1 font-semibold">
                {namaPemilik || "-"}
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Silakan transfer sesuai jumlah
              yang tertera. Setelah melakukan
              transfer, upload bukti pembayaran
              untuk diverifikasi oleh admin.
            </p>

            {/* INPUT FILE */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={pilihFile}
              className="hidden"
            />

            {/* TOMBOL PILIH FILE */}
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                loading ||
                loadingStatus ||
                !bolehUpload()
              }
              className="mt-6 w-full rounded-full border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-yellow-400 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sedangUploadUlang
                ? "Pilih Bukti Pembayaran Baru"
                : "Pilih Bukti Pembayaran"}
            </button>

            {/* NAMA FILE */}
            {file && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-500">
                  File yang dipilih
                </p>

                <p className="mt-1 break-all text-sm font-medium">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* SUCCESS */}
            {pesan && (
              <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm text-green-400">
                  {pesan}
                </p>
              </div>
            )}

            {/* TOMBOL UPLOAD */}
            <button
              type="button"
              onClick={uploadBukti}
              disabled={
                loading ||
                loadingStatus ||
                !file ||
                !bolehUpload()
              }
              className="mt-4 w-full rounded-full bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Mengupload..."
                : sedangUploadUlang
                ? "Upload Ulang Bukti Pembayaran"
                : "Upload Bukti Pembayaran"}
            </button>

            <p className="mt-3 text-center text-xs text-zinc-500">
              Format: JPG, JPEG, PNG, atau PDF.
              Maksimal 5 MB.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-sm text-zinc-600">
            © 2026 {namaToko}
          </p>
        </div>
      </footer>
    </main>
  );
}