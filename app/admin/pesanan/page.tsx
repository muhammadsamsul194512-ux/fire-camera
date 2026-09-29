
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  detail: {
    jumlah: number;
    harga_per_hari: number;
    subtotal: number;
    camera: {
      nama: string;
      brand: string;
    } | null;
  }[];
};

export default function AdminPesananPage() {
  const router = useRouter();

  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [membatalkanId, setMembatalkanId] = useState<number | null>(
    null
  );

  const [mengubahStatusId, setMengubahStatusId] = useState<number | null>(
  null
);


async function ambilPesanan() {
  setLoading(true);
  setError("");

  try {
    // Ambil session login dari Supabase
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
  router.replace("/admin/login");
  return;
}

    // Kirim access token ke API admin
    const response = await fetch(
      "/api/admin/pesanan",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(
        result.error ||
          "Gagal mengambil data pesanan."
      );
      setLoading(false);
      return;
    }

    setPesanan(
      (result.data as Pesanan[]) || []
    );
  } catch (error) {
    console.error(
      "Gagal mengambil pesanan:",
      error
    );

    setError(
      "Terjadi kesalahan saat mengambil data pesanan."
    );
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
  ambilPesanan();
}, [router]);


async function batalkanPesanan(orderId: number) {
  const yakin = window.confirm(
    "Apakah kamu yakin ingin membatalkan pesanan ini?"
  );

  if (!yakin) {
    return;
  }

  setMembatalkanId(orderId);
  setError("");

  try {
    // Ambil session login admin
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError("Kamu harus login sebagai admin.");
      return;
    }

    // Kirim access token ke API
    const response = await fetch(
      "/api/admin/pesanan/batal",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(
        result.error ||
          "Gagal membatalkan pesanan."
      );
      return;
    }

    // Muat ulang daftar pesanan
    await ambilPesanan();
  } catch (error) {
    console.error(
      "Error membatalkan pesanan:",
      error
    );

    setError(
      "Terjadi kesalahan saat membatalkan pesanan."
    );
  } finally {
    setMembatalkanId(null);
  }
}

async function ubahStatusPesanan(
  orderId: number,
  statusBaru: "disewa" | "selesai"
) {
  const namaStatus =
    statusBaru === "disewa"
      ? "Disewa"
      : "Selesai";

  const yakin = window.confirm(
    `Apakah kamu yakin ingin mengubah status pesanan menjadi ${namaStatus}?`
  );

  if (!yakin) {
    return;
  }

  setMengubahStatusId(orderId);
  setError("");

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError(
        "Sesi admin tidak ditemukan. Silakan login kembali."
      );
      return;
    }

    const response = await fetch(
      "/api/admin/pesanan/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId,
          status: statusBaru,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(
        result.error ||
          "Gagal mengubah status pesanan."
      );
      return;
    }

    await ambilPesanan();
  } catch (error) {
    console.error(
      "Error mengubah status pesanan:",
      error
    );

    setError(
      "Terjadi kesalahan saat mengubah status pesanan."
    );
  } finally {
    setMengubahStatusId(null);
  }
}

  function formatRupiah(nilai: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(nilai));
  }

  function formatTanggal(tanggal: string) {
    return new Date(
      `${tanggal}T00:00:00`
    ).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function warnaStatus(status: string) {
    switch (status) {
      case "menunggu_pembayaran":
        return "bg-yellow-100 text-yellow-800";

      case "menunggu_verifikasi":
        return "bg-orange-100 text-orange-800";

      case "dikonfirmasi":
        return "bg-blue-100 text-blue-800";

      case "disewa":
        return "bg-purple-100 text-purple-800";

      case "selesai":
        return "bg-green-100 text-green-800";

      case "dibatalkan":
        return "bg-gray-200 text-gray-700";

      case "ditolak":
        return "bg-red-100 text-red-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function namaStatus(status: string) {
    switch (status) {
      case "menunggu_pembayaran":
        return "Menunggu Pembayaran";

      case "menunggu_verifikasi":
        return "Menunggu Verifikasi";

      case "dikonfirmasi":
        return "Dikonfirmasi";

      case "disewa":
        return "Sedang Disewa";

      case "selesai":
        return "Selesai";

      case "dibatalkan":
        return "Dibatalkan";

      case "ditolak":
        return "Ditolak";

      default:
        return status;
    }
  }

  function bolehDibatalkan(status: string) {
    return (
      status !== "selesai" &&
      status !== "dibatalkan" &&
      status !== "ditolak"
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <a
              href="/admin"
              className="mb-3 inline-block text-sm text-gray-400 transition hover:text-yellow-400"
            >
              ← Kembali ke Dashboard
            </a>

            <h1 className="text-3xl font-bold">
              Kelola{" "}
              <span className="text-yellow-400">
                Pesanan
              </span>
            </h1>

            <p className="mt-2 text-gray-400">
              Lihat dan pantau semua pesanan penyewaan
              kamera.
            </p>
          </div>

          <button
            onClick={ambilPesanan}
            className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
          >
            ↻ Refresh Pesanan
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
            <p className="text-gray-400">
              Memuat data pesanan...
            </p>
          </div>
        ) : pesanan.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
            <p className="text-xl font-semibold">
              Belum ada pesanan
            </p>

            <p className="mt-2 text-gray-400">
              Pesanan pelanggan akan muncul di halaman
              ini.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {pesanan.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
              >
                {/* BAGIAN ATAS */}
                <div className="flex flex-col gap-4 border-b border-gray-800 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Nomor Pesanan
                    </p>

                    <p className="text-lg font-bold text-yellow-400">
                      {item.nomor_pesanan}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${warnaStatus(
                      item.status
                    )}`}
                  >
                    {namaStatus(item.status)}
                  </span>
                </div>

                {/* INFORMASI PESANAN */}
                <div className="grid gap-6 p-5 md:grid-cols-2 lg:grid-cols-3">
                  {/* PELANGGAN */}
                  <div>
                    <h2 className="mb-3 font-semibold text-white">
                      Data Pelanggan
                    </h2>

                    <div className="space-y-1 text-sm text-gray-400">
                      <p>
                        <span className="text-gray-500">
                          Nama:
                        </span>{" "}
                        {item.customer?.nama_lengkap ||
                          "-"}
                      </p>

                      <p>
                        <span className="text-gray-500">
                          WhatsApp:
                        </span>{" "}
                        {item.customer?.whatsapp ||
                          "-"}
                      </p>

                      <p>
                        <span className="text-gray-500">
                          Email:
                        </span>{" "}
                        {item.customer?.email || "-"}
                      </p>
                    </div>
                  </div>

                  {/* KAMERA */}
                  <div>
                    <h2 className="mb-3 font-semibold text-white">
                      Kamera
                    </h2>

                    {item.detail.map(
                      (detail, index) => (
                        <div
                          key={index}
                          className="space-y-1 text-sm text-gray-400"
                        >
                          <p className="font-medium text-white">
                            {detail.camera?.brand}{" "}
                            {detail.camera?.nama}
                          </p>

                          <p>
                            Jumlah:{" "}
                            {detail.jumlah} kamera
                          </p>

                          <p>
                            Harga:{" "}
                            {formatRupiah(
                              detail.harga_per_hari
                            )}
                            /hari
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {/* WAKTU */}
                  <div>
                    <h2 className="mb-3 font-semibold text-white">
                      Waktu Sewa
                    </h2>

                    <div className="space-y-1 text-sm text-gray-400">
                      <p>
                        <span className="text-gray-500">
                          Ambil:
                        </span>{" "}
                        {formatTanggal(
                          item.tanggal_ambil
                        )}{" "}
                        {item.jam_ambil}
                      </p>

                      <p>
                        <span className="text-gray-500">
                          Kembali:
                        </span>{" "}
                        {formatTanggal(
                          item.tanggal_kembali
                        )}{" "}
                        {item.jam_kembali}
                      </p>

                      <p>
                        <span className="text-gray-500">
                          Durasi:
                        </span>{" "}
                        {item.jumlah_hari} hari
                      </p>
                    </div>
                  </div>
                </div>

                {/* TOTAL + AKSI */}
                <div className="flex flex-col gap-4 border-t border-gray-800 bg-gray-950/50 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Total Pesanan
                    </p>

                    <p className="text-2xl font-bold text-yellow-400">
                      {formatRupiah(
                        item.total_harga
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="text-sm text-gray-500">
                      Dibuat:{" "}
                      {new Date(
                        item.created_at
                      ).toLocaleString("id-ID")}
                    </div>

                    {bolehDibatalkan(
                      item.status
                    ) && (
                      <button
                        onClick={() =>
                          batalkanPesanan(
                            item.id
                          )
                        }
                        disabled={
                          membatalkanId === item.id
                        }
                        className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {membatalkanId ===
                        item.id
                          ? "Membatalkan..."
                          : "Batalkan Pesanan"}
                      </button>
                    )}

                    {item.status === "dikonfirmasi" && (
  <button
    onClick={() =>
      ubahStatusPesanan(
        item.id,
        "disewa"
      )
    }
    disabled={mengubahStatusId === item.id}
    className="rounded-full bg-purple-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {mengubahStatusId === item.id
      ? "Memproses..."
      : "Tandai Disewa"}
  </button>
)}

{item.status === "disewa" && (
  <button
    onClick={() =>
      ubahStatusPesanan(
        item.id,
        "selesai"
      )
    }
    disabled={mengubahStatusId === item.id}
    className="rounded-full bg-green-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {mengubahStatusId === item.id
      ? "Memproses..."
      : "Tandai Selesai"}
  </button>
)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}