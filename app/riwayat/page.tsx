
"use client";

import { useEffect, useState } from "react";

type Pesanan = {
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
  };
  order_detail: Array<{
    id: number;
    jumlah: number;
    harga_per_hari: number;
    subtotal: number;
    camera: {
      id: number;
      nama: string;
      brand: string;
      gambar_url: string | null;
    } | null;
  }>;
  payment:
    | {
        id: number;
        metode: string;
        bank: string | null;
        nomor_rekening: string | null;
        nama_pemilik_rekening: string | null;
        bukti_pembayaran_url: string | null;
        status: string;
        catatan_admin: string | null;
        uploaded_at: string | null;
        verified_at: string | null;
      }
    | Array<{
        id: number;
        metode: string;
        bank: string | null;
        nomor_rekening: string | null;
        nama_pemilik_rekening: string | null;
        bukti_pembayaran_url: string | null;
        status: string;
        catatan_admin: string | null;
        uploaded_at: string | null;
        verified_at: string | null;
      }>
    | null;
};

export default function RiwayatPage() {
  const [nomorPesanan, setNomorPesanan] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [namaToko, setNamaToko] = useState("");

  const [pesanan, setPesanan] = useState<Pesanan | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function ambilPengaturan() {
      try {
        const response = await fetch("/api/pengaturan");
        const hasil = await response.json();

        if (response.ok && hasil.data?.nama_toko) {
          setNamaToko(hasil.data.nama_toko);
        }
      } catch (error) {
        console.error(
          "Error mengambil nama toko:",
          error
        );
      }
    }

    ambilPengaturan();
  }, []);

  async function cekPesanan(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setPesanan(null);

    try {
      const response = await fetch("/api/riwayat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nomorPesanan,
          whatsapp,
        }),
      });

      const hasil = await response.json();

      if (!response.ok) {
        setError(
          hasil.error ||
            "Pesanan tidak ditemukan."
        );
        return;
      }

      setPesanan(hasil.data);
    } catch (error) {
      console.error(
        "Error mengecek pesanan:",
        error
      );

      setError(
        "Terjadi kesalahan saat mengecek pesanan."
      );
    } finally {
      setLoading(false);
    }
  }

  const payment = Array.isArray(pesanan?.payment)
    ? pesanan?.payment[0]
    : pesanan?.payment;

  function formatStatus(status: string) {
    const statusMap: Record<string, string> = {
      menunggu_pembayaran: "Menunggu Pembayaran",
      menunggu_verifikasi: "Menunggu Verifikasi",
      dikonfirmasi: "Dikonfirmasi",
      disewa: "Sedang Disewa",
      selesai: "Selesai",
      dibatalkan: "Dibatalkan",
      ditolak: "Ditolak",
      perlu_upload_ulang: "Perlu Upload Ulang",
    };

    return statusMap[status] || status;
  }

  function statusClass(status: string) {
    if (
      status === "dikonfirmasi" ||
      status === "selesai"
    ) {
      return "bg-green-500/15 text-green-400 border border-green-500/30";
    }

    if (
      status === "dibatalkan" ||
      status === "ditolak"
    ) {
      return "bg-red-500/15 text-red-400 border border-red-500/30";
    }

    if (status === "disewa") {
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    }

    return "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* NAVBAR */}
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-2xl font-bold tracking-wider"
          >
            {namaToko || " "}
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
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Pesanan
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Cek Riwayat Pesanan
          </h1>

          <p className="mt-4 text-zinc-400">
            Masukkan nomor pesanan dan nomor WhatsApp
            yang digunakan saat melakukan pemesanan.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="mx-auto max-w-2xl px-6 py-14">
        <form
          onSubmit={cekPesanan}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          {/* NOMOR PESANAN */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nomor Pesanan
            </label>

            <input
              type="text"
              value={nomorPesanan}
              onChange={(e) =>
                setNomorPesanan(e.target.value)
              }
              placeholder="Contoh: ORD-20260928-001"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
              required
            />
          </div>

          {/* WHATSAPP */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium">
              Nomor WhatsApp
            </label>

            <input
              type="text"
              value={whatsapp}
              onChange={(e) =>
                setWhatsapp(e.target.value)
              }
              placeholder="Contoh: 081234567890"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
              required
            />
          </div>

          {/* TOMBOL */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Mencari Pesanan..."
              : "Cek Pesanan"}
          </button>
        </form>
      </section>

      {/* ERROR */}
      {error && (
        <section className="mx-auto max-w-2xl px-6 pb-14">
          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <p className="font-semibold text-red-400">
              Pesanan tidak ditemukan
            </p>

            <p className="mt-2 text-sm text-red-300">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* HASIL PESANAN */}
      {pesanan && (
        <section className="mx-auto max-w-2xl px-6 pb-14">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            {/* NOMOR DAN STATUS */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-zinc-500">
                  Nomor Pesanan
                </p>

                <p className="mt-1 text-xl font-bold">
                  {pesanan.nomor_pesanan}
                </p>
              </div>

              <span
                className={`inline-block w-fit rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                  pesanan.status
                )}`}
              >
                {formatStatus(pesanan.status)}
              </span>
            </div>

            {/* DATA PELANGGAN */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                Data Pelanggan
              </p>

              <p className="mt-2 font-semibold">
                {pesanan.customer.nama_lengkap}
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                WhatsApp: {pesanan.customer.whatsapp}
              </p>

              {pesanan.customer.email && (
                <p className="mt-1 text-sm text-zinc-400">
                  Email: {pesanan.customer.email}
                </p>
              )}
            </div>

            {/* JADWAL SEWA */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                Jadwal Penyewaan
              </p>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-zinc-500">
                    Tanggal & Jam Ambil
                  </p>

                  <p className="mt-1 font-semibold">
                    {pesanan.tanggal_ambil}{" "}
                    {pesanan.jam_ambil}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Tanggal & Jam Kembali
                  </p>

                  <p className="mt-1 font-semibold">
                    {pesanan.tanggal_kembali}{" "}
                    {pesanan.jam_kembali}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-zinc-500">
                  Lama Sewa
                </p>

                <p className="mt-1 font-semibold">
                  {pesanan.jumlah_hari} hari
                </p>
              </div>
            </div>

            {/* KAMERA */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                Kamera yang Disewa
              </p>

              <div className="mt-3 space-y-3">
                {pesanan.order_detail.map(
                  (detail) => (
                    <div
                      key={detail.id}
                      className="rounded-xl bg-zinc-950 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold">
                            {detail.camera?.nama ||
                              "Kamera"}
                          </p>

                          <p className="text-sm text-zinc-500">
                            {detail.camera?.brand || ""}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="font-semibold">
                            {detail.jumlah} unit
                          </p>

                          <p className="text-sm text-zinc-500">
                            Rp{" "}
                            {Number(
                              detail.subtotal
                            ).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* TOTAL */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-lg font-semibold">
                  Total Pembayaran
                </p>

                <p className="text-2xl font-bold text-yellow-400">
                  Rp{" "}
                  {Number(
                    pesanan.total_harga
                  ).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* PEMBAYARAN */}
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                Status Pembayaran
              </p>

              {payment ? (
                <>
                  <div className="mt-2">
                    <span
                      className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusClass(
                        payment.status
                      )}`}
                    >
                      {formatStatus(payment.status)}
                    </span>
                  </div>

                  {payment.catatan_admin && (
                    <div className="mt-4 rounded-xl bg-zinc-950 p-4">
                      <p className="text-sm text-zinc-500">
                        Catatan Admin
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {payment.catatan_admin}
                      </p>
                    </div>
                  )}

                  {payment.uploaded_at && (
                    <p className="mt-4 text-sm text-zinc-500">
                      Bukti pembayaran sudah diunggah.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-zinc-400">
                  Belum ada data pembayaran.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-sm text-zinc-600">
            © 2026 {namaToko || " "}
          </p>
        </div>
      </footer>
    </main>
  );
}