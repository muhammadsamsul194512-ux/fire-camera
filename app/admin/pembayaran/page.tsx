"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  nama_lengkap: string;
  whatsapp: string;
  email: string | null;
};

type Camera = {
  nama: string;
  brand: string;
};

type Detail = {
  jumlah: number;
  harga_per_hari: number;
  subtotal: number;
  camera: Camera | Camera[] | null;
};

type Order = {
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
  customer: Customer | Customer[] | null;
  detail: Detail[];
};

type Payment = {
  id: number;
  order_id: number;
  metode: string;
  bank: string | null;
  nomor_rekening: string | null;
  nama_pemilik_rekening: string | null;
  bukti_pembayaran_url: string | null;
  status: string;
  catatan_admin: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  created_at: string;
  order: Order | Order[] | null;
};

function ambilSatu<T>(data: T | T[] | null): T | null {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data;
}

function formatRupiah(value: number) {
  return `Rp${Number(value || 0).toLocaleString(
    "id-ID"
  )}`;
}

function formatTanggal(value: string) {
  if (!value) {
    return "-";
  }

  const tanggal = new Date(value);

  if (Number.isNaN(tanggal.getTime())) {
    return value;
  }

  return tanggal.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function tampilStatus(status: string) {
  switch (status) {
    case "menunggu_verifikasi":
      return "Menunggu Verifikasi";

    case "dikonfirmasi":
      return "Dikonfirmasi";

    case "ditolak":
      return "Ditolak";

    case "perlu_upload_ulang":
      return "Perlu Upload Ulang";

    default:
      return status;
  }
}

export default function AdminPembayaranPage() {
  const router = useRouter();

  const [pembayaran, setPembayaran] = useState<
    Payment[]
  >([]);

  const [namaToko, setNamaToko] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [prosesId, setProsesId] = useState<
    number | null
  >(null);

  const [membukaId, setMembukaId] = useState<
    number | null
  >(null);

  const [catatanAdmin, setCatatanAdmin] =
    useState("");

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

      const response = await fetch(
        "/api/admin/pembayaran/verifikasi",
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
            "Gagal mengambil data pembayaran."
        );
        return;
      }

      setPembayaran(
        (result.data as Payment[]) || []
      );
    } catch (error) {
      console.error(
        "Gagal mengambil pembayaran:",
        error
      );

      setError(
        "Terjadi kesalahan saat mengambil data pembayaran."
      );
    } finally {
      setLoading(false);
    }
  }

  async function ambilNamaToko() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Session admin tidak ditemukan:",
          sessionError
        );
        return;
      }

      const response = await fetch(
        "/api/admin/settings",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Gagal mengambil nama toko:",
          result
        );
        return;
      }

      if (result.data?.nama_toko) {
        setNamaToko(result.data.nama_toko);
      }
    } catch (error) {
      console.error(
        "Error mengambil nama toko:",
        error
      );
    }
  }

  async function jalankanTindakan(
    paymentId: number,
    action:
      | "konfirmasi"
      | "upload_ulang"
      | "tolak",
    catatan = ""
  ) {
    setProsesId(paymentId);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError(
          "Kamu harus login sebagai admin."
        );
        return;
      }

      const response = await fetch(
        "/api/admin/pembayaran/verifikasi",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            paymentId,
            action,
            catatanAdmin: catatan,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Gagal memproses pembayaran."
        );
        return;
      }

      setMembukaId(null);
      setCatatanAdmin("");

      await ambilPembayaran();
    } catch (error) {
      console.error(
        "Gagal memproses pembayaran:",
        error
      );

      setError(
        "Terjadi kesalahan saat memproses pembayaran."
      );
    } finally {
      setProsesId(null);
    }
  }

  async function konfirmasiPembayaran(
    paymentId: number
  ) {
    const yakin = window.confirm(
      "Apakah kamu yakin ingin mengonfirmasi pembayaran ini?"
    );

    if (!yakin) {
      return;
    }

    await jalankanTindakan(
      paymentId,
      "konfirmasi"
    );
  }

  async function mintaUploadUlang(
    paymentId: number
  ) {
    if (!catatanAdmin.trim()) {
      setError(
        "Catatan admin wajib diisi untuk meminta upload ulang."
      );
      return;
    }

    const yakin = window.confirm(
      "Apakah kamu yakin ingin meminta pelanggan mengupload ulang bukti pembayaran?"
    );

    if (!yakin) {
      return;
    }

    await jalankanTindakan(
      paymentId,
      "upload_ulang",
      catatanAdmin
    );
  }

  async function tolakPembayaran(
    paymentId: number
  ) {
    const yakin = window.confirm(
      "Apakah kamu yakin ingin menolak pembayaran ini?"
    );

    if (!yakin) {
      return;
    }

    await jalankanTindakan(
      paymentId,
      "tolak",
      catatanAdmin
    );
  }

  useEffect(() => {
    ambilPembayaran();
    ambilNamaToko();
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* NAVBAR */}
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/admin"
            className="text-2xl font-bold tracking-wider"
          >
            {namaToko}
          </a>

          <div className="flex items-center gap-6">
            <a
              href="/admin"
              className="text-sm text-zinc-400 transition hover:text-yellow-400"
            >
              Dashboard
            </a>

            <a
              href="/admin/pesanan"
              className="text-sm text-zinc-400 transition hover:text-yellow-400"
            >
              Pesanan
            </a>

            <a
              href="/admin/pembayaran"
              className="text-sm font-semibold text-yellow-400"
            >
              Pembayaran
            </a>
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Verifikasi Pembayaran
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Periksa bukti pembayaran pelanggan
            sebelum memproses pembayaran.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-400">
              Memuat data pembayaran...
            </p>
          </div>
        ) : pembayaran.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <h2 className="text-xl font-bold">
              Belum ada pembayaran
            </h2>

            <p className="mt-2 text-zinc-500">
              Belum ada data pembayaran yang masuk.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pembayaran.map((item) => {
              const order = ambilSatu(item.order);

              const customer = order
                ? ambilSatu(order.customer)
                : null;

              const sedangDiproses =
                prosesId === item.id;

              const sedangMembuka =
                membukaId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  {/* BAGIAN ATAS */}
                  <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm text-zinc-500">
                        Nomor Pesanan
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {order?.nomor_pesanan ||
                          `Pesanan #${item.order_id}`}
                      </p>

                      {customer && (
                        <div className="mt-3">
                          <p className="font-medium">
                            {customer.nama_lengkap}
                          </p>

                          <p className="text-sm text-zinc-500">
                            WhatsApp:{" "}
                            {customer.whatsapp}
                          </p>

                          {customer.email && (
                            <p className="text-sm text-zinc-500">
                              Email:{" "}
                              {customer.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                          item.status ===
                          "dikonfirmasi"
                            ? "bg-green-400/10 text-green-400"
                            : item.status ===
                              "ditolak"
                            ? "bg-red-400/10 text-red-400"
                            : item.status ===
                              "perlu_upload_ulang"
                            ? "bg-orange-400/10 text-orange-400"
                            : "bg-yellow-400/10 text-yellow-400"
                        }`}
                      >
                        {tampilStatus(item.status)}
                      </span>
                    </div>
                  </div>

                  {/* DETAIL */}
                  <div className="grid gap-6 py-6 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-zinc-500">
                        Total Pembayaran
                      </p>

                      <p className="mt-1 text-xl font-bold text-yellow-400">
                        {formatRupiah(
                          Number(
                            order?.total_harga || 0
                          )
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-zinc-500">
                        Upload Bukti
                      </p>

                      <p className="mt-1">
                        {item.uploaded_at
                          ? formatTanggal(
                              item.uploaded_at
                            )
                          : "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-zinc-500">
                        Status Pesanan
                      </p>

                      <p className="mt-1">
                        {order?.status || "-"}
                      </p>
                    </div>
                  </div>

                  {/* DETAIL KAMERA */}
                  {order?.detail &&
                    order.detail.length > 0 && (
                      <div className="border-t border-zinc-800 py-6">
                        <p className="mb-3 text-sm text-zinc-500">
                          Kamera yang disewa
                        </p>

                        <div className="space-y-2">
                          {order.detail.map(
                            (detail, index) => {
                              const camera =
                                ambilSatu(
                                  detail.camera
                                );

                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between rounded-xl bg-zinc-950 p-4"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {camera?.brand ||
                                        "-"}{" "}
                                      {camera?.nama ||
                                        "-"}
                                    </p>

                                    <p className="text-sm text-zinc-500">
                                      {detail.jumlah} unit
                                      {" × "}
                                      {formatRupiah(
                                        Number(
                                          detail.harga_per_hari
                                        )
                                      )}
                                      /hari
                                    </p>
                                  </div>

                                  <p className="font-semibold">
                                    {formatRupiah(
                                      Number(
                                        detail.subtotal
                                      )
                                    )}
                                  </p>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                  {/* BUKTI PEMBAYARAN */}
                  <div className="border-t border-zinc-800 pt-6">
                    <p className="mb-3 text-sm text-zinc-500">
                      Bukti Pembayaran
                    </p>

                    {item.bukti_pembayaran_url ? (
                      <a
                        href={
                          item.bukti_pembayaran_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold transition hover:border-yellow-400 hover:text-yellow-400"
                      >
                        Lihat Bukti Pembayaran
                      </a>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Bukti pembayaran belum tersedia.
                      </p>
                    )}
                  </div>

                  {/* CATATAN ADMIN */}
                  {item.catatan_admin && (
                    <div className="mt-6 rounded-2xl border border-orange-400/30 bg-orange-400/10 p-4">
                      <p className="text-sm font-semibold text-orange-400">
                        Catatan Admin
                      </p>

                      <p className="mt-2 text-sm text-zinc-300">
                        {item.catatan_admin}
                      </p>
                    </div>
                  )}

                  {/* TOMBOL AKSI */}
                  {item.status !==
                    "dikonfirmasi" && (
                    <div className="mt-6 border-t border-zinc-800 pt-6">
                      <div className="flex flex-col gap-3 md:flex-row">
                        {/* KONFIRMASI */}
                        <button
                          type="button"
                          onClick={() =>
                            konfirmasiPembayaran(
                              item.id
                            )
                          }
                          disabled={sedangDiproses}
                          className="rounded-full bg-green-500 px-5 py-3 font-semibold text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sedangDiproses
                            ? "Memproses..."
                            : "Konfirmasi Pembayaran"}
                        </button>

                        {/* UPLOAD ULANG */}
                        <button
                          type="button"
                          onClick={() => {
                            if (sedangMembuka) {
                              setMembukaId(null);
                              setCatatanAdmin("");
                            } else {
                              setMembukaId(
                                item.id
                              );
                              setCatatanAdmin(
                                item.catatan_admin ||
                                  ""
                              );
                              setError("");
                            }
                          }}
                          disabled={sedangDiproses}
                          className="rounded-full border border-orange-400 px-5 py-3 font-semibold text-orange-400 transition hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sedangMembuka
                            ? "Batal"
                            : "Perlu Upload Ulang"}
                        </button>

                        {/* TOLAK */}
                        <button
                          type="button"
                          onClick={() =>
                            tolakPembayaran(
                              item.id
                            )
                          }
                          disabled={sedangDiproses}
                          className="rounded-full border border-red-400 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Tolak Pembayaran
                        </button>
                      </div>

                      {/* FORM UPLOAD ULANG */}
                      {sedangMembuka && (
                        <div className="mt-5 rounded-2xl border border-orange-400/30 bg-orange-400/5 p-5">
                          <p className="font-semibold text-orange-400">
                            Minta Pelanggan Upload
                            Ulang
                          </p>

                          <p className="mt-2 text-sm text-zinc-400">
                            Tulis alasan mengapa bukti
                            pembayaran perlu diupload
                            ulang.
                          </p>

                          <textarea
                            value={catatanAdmin}
                            onChange={(event) =>
                              setCatatanAdmin(
                                event.target.value
                              )
                            }
                            placeholder="Contoh: Bukti pembayaran kurang jelas. Silakan upload foto bukti pembayaran yang lebih jelas."
                            rows={4}
                            className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              mintaUploadUlang(
                                item.id
                              )
                            }
                            disabled={
                              sedangDiproses ||
                              !catatanAdmin.trim()
                            }
                            className="mt-4 rounded-full bg-orange-400 px-5 py-3 font-semibold text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sedangDiproses
                              ? "Memproses..."
                              : "Kirim Permintaan Upload Ulang"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}