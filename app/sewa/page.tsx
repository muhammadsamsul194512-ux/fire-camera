
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function getTanggalHariIni() {
  const sekarang = new Date();
  const tahun = sekarang.getFullYear();
  const bulan = String(
    sekarang.getMonth() + 1
  ).padStart(2, "0");
  const hari = String(
    sekarang.getDate()
  ).padStart(2, "0");

  return `${tahun}-${bulan}-${hari}`;
}

function SewaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const kameraIdDariUrl =
  searchParams.get("kameraId") || "";

  const [namaToko, setNamaToko] =
  useState("");

  const [nama, setNama] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [kamera, setKamera] = useState("");
  const [daftarKamera, setDaftarKamera] =
  useState<any[]>([]);

  const [tanggalAmbil, setTanggalAmbil] =
    useState("");

  const [jamAmbil, setJamAmbil] =
    useState("");

  const [tanggalKembali, setTanggalKembali] =
    useState("");

  const [jamKembali, setJamKembali] =
    useState("");

  const [jumlah, setJumlah] = useState(1);

  const [stokTersediaWaktu, setStokTersediaWaktu] =
  useState<number | null>(null);

const [sedangCekStok, setSedangCekStok] =
  useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
  async function ambilPengaturan() {
    try {
      const response = await fetch("/api/pengaturan");

      const hasil = await response.json();

      if (!response.ok) {
        console.error(
          "Gagal mengambil nama toko:",
          hasil
        );
        return;
      }

      if (hasil.data?.nama_toko) {
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

useEffect(() => {
  async function ambilKamera() {
    const { data, error } = await supabase
      .from("camera")
      .select(
        "id, nama, brand, harga_per_hari, stok, aktif"
      )
      .eq("aktif", true)
      .order("id", { ascending: true });

    if (error) {
      console.error(
        "Gagal mengambil data kamera:",
        error
      );
      setError("Gagal mengambil data kamera.");
      return;
    }

    setDaftarKamera(data || []);

    const kameraId =
      searchParams.get("kameraId");
      

    if (kameraId) {
      const kameraTerpilih = (data || []).find(
  (item: any) =>
    String(item.id) === kameraId
);

      if (kameraTerpilih) {
  setKamera(kameraTerpilih.nama);

  const tanggalAmbilDariUrl =
    searchParams.get("tanggalAmbil");

  const jamAmbilDariUrl =
    searchParams.get("jamAmbil");

  const tanggalKembaliDariUrl =
    searchParams.get("tanggalKembali");

  const jamKembaliDariUrl =
    searchParams.get("jamKembali");

  if (tanggalAmbilDariUrl) {
    setTanggalAmbil(tanggalAmbilDariUrl);
  }

  if (jamAmbilDariUrl) {
    setJamAmbil(jamAmbilDariUrl);
  }

  if (tanggalKembaliDariUrl) {
    setTanggalKembali(tanggalKembaliDariUrl);
  }

  if (jamKembaliDariUrl) {
    setJamKembali(jamKembaliDariUrl);
  }
}
    }
  }

  ambilKamera();
}, [searchParams]);

useEffect(() => {
  if (!kamera) return;

  const kameraTerpilih = daftarKamera.find(
    (item: any) => item.nama === kamera
  );

  const stok = Number(kameraTerpilih?.stok) || 0;

  if (stok > 0 && jumlah > stok) {
    setJumlah(stok);
  }
}, [kamera, daftarKamera, jumlah]);

useEffect(() => {
  if (
    stokTersediaWaktu !== null &&
    stokTersediaWaktu > 0 &&
    jumlah > stokTersediaWaktu
  ) {
    setJumlah(stokTersediaWaktu);
  }

  if (stokTersediaWaktu === 0 && jumlah !== 1) {
    setJumlah(1);
  }
}, [stokTersediaWaktu, jumlah]);

useEffect(() => {
  async function cekStokBerdasarkanWaktu() {
    if (
      !kamera ||
      !tanggalAmbil ||
      !jamAmbil ||
      !tanggalKembali ||
      !jamKembali
    ) {
      setStokTersediaWaktu(null);
      return;
    }

    const kameraTerpilih = daftarKamera.find(
      (item: any) => item.nama === kamera
    );

    if (!kameraTerpilih) {
      setStokTersediaWaktu(null);
      return;
    }

    setSedangCekStok(true);

    try {
      const params = new URLSearchParams({
        kameraId: String(kameraTerpilih.id),
        tanggalAmbil,
        jamAmbil,
        tanggalKembali,
        jamKembali,
      });

      const response = await fetch(
        `/api/kamera/stok?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        setStokTersediaWaktu(null);
        return;
      }

      setStokTersediaWaktu(
        Number(data.stokTersedia)
      );
    } catch (error) {
      console.error(
        "Gagal mengecek stok berdasarkan waktu:",
        error
      );

      setStokTersediaWaktu(null);
    } finally {
      setSedangCekStok(false);
    }
  }

  cekStokBerdasarkanWaktu();
}, [
  kamera,
  daftarKamera,
  tanggalAmbil,
  jamAmbil,
  tanggalKembali,
  jamKembali,
]);

  const tanggalHariIni =
    getTanggalHariIni();

  const jumlahHari = useMemo(() => {
    if (
      !tanggalAmbil ||
      !tanggalKembali ||
      !jamAmbil ||
      !jamKembali
    ) {
      return 0;
    }

    const mulai = new Date(
      `${tanggalAmbil}T${jamAmbil}`
    );

    const kembali = new Date(
      `${tanggalKembali}T${jamKembali}`
    );

    const selisih =
      kembali.getTime() -
      mulai.getTime();

    const hari =
      selisih /
      (1000 * 60 * 60 * 24);

    return hari > 0
      ? Math.ceil(hari)
      : 0;
  }, [
    tanggalAmbil,
    tanggalKembali,
    jamAmbil,
    jamKembali,
  ]);

  const waktuTidakValid =
    tanggalAmbil &&
    tanggalKembali &&
    jamAmbil &&
    jamKembali &&
    new Date(
      `${tanggalKembali}T${jamKembali}`
    ).getTime() <=
      new Date(
        `${tanggalAmbil}T${jamAmbil}`
      ).getTime();

  // Untuk tampilan sementara.
  // Harga sebenarnya nanti diambil dari database oleh API.
  const kameraTerpilih = daftarKamera.find(
  (item: any) => item.nama === kamera
);

const hargaPerHari =
  Number(kameraTerpilih?.harga_per_hari) || 0;
  const stokKamera =
  Number(kameraTerpilih?.stok) || 0;

const totalHarga =
  jumlahHari *
  jumlah *
  hargaPerHari;

  async function handleSubmit() {
    setError("");
    setSuccess("");

    if (!nama.trim()) {
      setError(
        "Nama lengkap wajib diisi."
      );
      return;
    }

    if (!whatsapp.trim()) {
      setError(
        "Nomor WhatsApp wajib diisi."
      );
      return;
    }

    if (!kamera) {
      setError(
        "Silakan pilih kamera."
      );
      return;
    }

    if (
      !tanggalAmbil ||
      !jamAmbil ||
      !tanggalKembali ||
      !jamKembali
    ) {
      setError(
        "Tanggal dan jam pengambilan serta pengembalian wajib diisi."
      );
      return;
    }

    if (waktuTidakValid) {
      setError(
        "Waktu pengembalian harus setelah waktu pengambilan."
      );
      return;
    }

    if (jumlah < 1) {
      setError(
        "Jumlah kamera minimal 1."
      );
      return;
    }

    if (
  kameraTerpilih &&
  jumlah > Number(kameraTerpilih.stok)
) {
  setError(
    `Jumlah kamera melebihi stok. Stok tersedia hanya ${kameraTerpilih.stok} unit.`
  );
  return;
}

if (!kameraTerpilih) {
  setError(
    "Data kamera tidak ditemukan. Silakan pilih kamera kembali."
  );
  return;
}

    try {
      setLoading(true);

      const kameraId = kameraTerpilih.id;

const response = await fetch(
  "/api/sewa",
  {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify({
      nama,
      whatsapp,
      email,
      kamera,
      kameraId,
      tanggalAmbil,
      jamAmbil,
      tanggalKembali,
      jamKembali,
      jumlah,
    }),
  }
);

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Gagal membuat pesanan."
        );
        return;
      }

      router.push(
        `/pembayaran?pesanan=${encodeURIComponent(
          data.nomorPesanan
        )}&total=${data.totalHarga}`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Tidak dapat terhubung ke server."
      );
    } finally {
      setLoading(false);
    }
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
            {namaToko}
          </a>

          <div className="hidden items-center gap-8 md:flex">

            <a
              href="/"
              className="text-sm text-zinc-300 hover:text-yellow-400"
            >
              Beranda
            </a>

            <a
              href="/kamera"
              className="text-sm text-zinc-300 hover:text-yellow-400"
            >
              Daftar Kamera
            </a>

            <a
              href="/#cara-sewa"
              className="text-sm text-zinc-300 hover:text-yellow-400"
            >
              Cara Sewa
            </a>

            <a
              href="/#riwayat"
              className="text-sm text-zinc-300 hover:text-yellow-400"
            >
              Riwayat Pesanan
            </a>

          </div>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-zinc-900 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-14">

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Penyewaan Kamera
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Formulir Sewa Kamera
          </h1>

          <p className="mt-4 text-zinc-400">
            Lengkapi data penyewaan sebelum melanjutkan
            ke pembayaran.
          </p>

        </div>
      </section>

      {/* FORM */}
      <section>
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 lg:grid-cols-3">

          {/* FORM DATA */}
          <div className="lg:col-span-2">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">

              <h2 className="text-2xl font-bold">
                Data Penyewa
              </h2>

              <div className="mt-8 space-y-6">

                {/* NAMA */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Nama Lengkap
                  </label>

                  <input
                    type="text"
                    value={nama}
                    onChange={(e) =>
                      setNama(e.target.value)
                    }
                    placeholder="Masukkan nama lengkap"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                  />
                </div>

                {/* WHATSAPP */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Nomor WhatsApp
                  </label>

                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) =>
                      setWhatsapp(e.target.value)
                    }
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email{" "}
                    <span className="text-zinc-600">
                      (Opsional)
                    </span>
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                  />
                </div>

                {/* KAMERA */}
<div>
  <label className="mb-2 block text-sm font-medium">
    Kamera
  </label>

  <select
    value={kamera}
    onChange={(e) =>
      setKamera(e.target.value)
    }
    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
  >
    <option value="">Pilih kamera</option>

    {daftarKamera.map((item: any) => (
      <option key={item.id} value={item.nama}>
        {item.nama}
      </option>
    ))}
  </select>

  {kameraTerpilih && (
  <div className="mt-2 text-sm text-zinc-500">
    {sedangCekStok ? (
      <p>Mengecek stok untuk waktu yang dipilih...</p>
    ) : stokTersediaWaktu !== null ? (
      <p>
        Stok tersedia untuk waktu tersebut:{" "}
        <span className="font-semibold text-yellow-400">
          {stokTersediaWaktu} unit
        </span>
      </p>
    ) : (
      <p>
        Stok total: {kameraTerpilih.stok} unit
      </p>
    )}
  </div>
)}
</div>

                {/* TANGGAL */}
                <div className="grid gap-6 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Tanggal Pengambilan
                    </label>

                    <input
                      type="date"
                      min={tanggalHariIni}
                      value={tanggalAmbil}
                      onChange={(e) => {
                        setTanggalAmbil(
                          e.target.value
                        );

                        if (
                          tanggalKembali &&
                          e.target.value >=
                            tanggalKembali
                        ) {
                          setTanggalKembali("");
                        }
                      }}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Tanggal Pengembalian
                    </label>

                    <input
                      type="date"
                      min={
                        tanggalAmbil
                          ? (() => {
                              const tanggal =
                                new Date(
                                  `${tanggalAmbil}T00:00:00`
                                );

                              tanggal.setDate(
                                tanggal.getDate() +
                                  1
                              );

                              const tahun =
                                tanggal.getFullYear();

                              const bulan =
                                String(
                                  tanggal.getMonth() +
                                    1
                                ).padStart(
                                  2,
                                  "0"
                                );

                              const hari =
                                String(
                                  tanggal.getDate()
                                ).padStart(
                                  2,
                                  "0"
                                );

                              return `${tahun}-${bulan}-${hari}`;
                            })()
                          : tanggalHariIni
                      }
                      value={tanggalKembali}
                      onChange={(e) =>
                        setTanggalKembali(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                    />
                  </div>

                </div>

                {/* JAM */}
                <div className="grid gap-6 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Jam Pengambilan
                    </label>

                    <input
                      type="time"
                      value={jamAmbil}
                      onChange={(e) =>
                        setJamAmbil(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Jam Pengembalian
                    </label>

                    <input
                      type="time"
                      value={jamKembali}
                      onChange={(e) =>
                        setJamKembali(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                    />
                  </div>

                </div>

                {/* JUMLAH */}
<div>
  <label className="mb-2 block text-sm font-medium">
    Jumlah Kamera
  </label>

  <input
    type="number"
    min="1"
    max={
  stokTersediaWaktu !== null
    ? stokTersediaWaktu
    : stokKamera
}
    value={jumlah}
    onChange={(e) =>
  setJumlah(
    Math.min(
      stokTersediaWaktu !== null
        ? stokTersediaWaktu
        : stokKamera || 1,
      Math.max(
        1,
        Number(e.target.value)
      )
    )
  )
}
    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
  />
</div>

              </div>

            </div>

          </div>

          {/* RINGKASAN */}
          <div>

            <div className="sticky top-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

              <h2 className="text-xl font-bold">
                Ringkasan Pesanan
              </h2>

              <div className="mt-6 space-y-4 text-sm">

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Penyewa
                  </span>

                  <span className="text-right">
                    {nama || "-"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Kamera
                  </span>

                  <span className="text-right">
                    {kamera}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Jumlah
                  </span>

                  <span>
                    {jumlah} unit
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">
                    Durasi
                  </span>

                  <span>
                    {jumlahHari > 0
                      ? `${jumlahHari} hari`
                      : "-"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
  <span className="text-zinc-500">
    Harga / Hari
  </span>

  <span>
    {hargaPerHari > 0
      ? `Rp${hargaPerHari.toLocaleString("id-ID")}`
      : "-"}
  </span>
</div>

                {waktuTidakValid && (
                  <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-400">
                    Waktu pengembalian harus
                    setelah waktu pengambilan.
                  </p>
                )}

                {error && (
                  <p className="rounded-xl bg-red-400/10 p-3 text-sm text-red-400">
                    {error}
                  </p>
                )}

                {success && (
                  <div className="rounded-xl bg-green-400/10 p-4 text-sm text-green-400">
                    {success}
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4">

                  <div className="flex items-end justify-between">

                    <span className="text-zinc-500">
                      Total
                    </span>

                    <span className="text-2xl font-bold text-yellow-400">
                      Rp
                      {totalHarga.toLocaleString(
                        "id-ID"
                      )}
                    </span>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="mt-8 w-full rounded-full bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Memproses..."
                  : "Lanjut ke Pembayaran"}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
                Ketersediaan kamera akan diperiksa
                sebelum pesanan dikonfirmasi.
              </p>

            </div>

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

export default function SewaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950" />
      }
    >
      <SewaContent />
    </Suspense>
  );
}