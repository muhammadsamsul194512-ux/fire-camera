
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Pengaturan = {
  id: number;
  nama_toko: string;
  whatsapp: string | null;
  alamat: string | null;
  bank: string | null;
  nomor_rekening: string | null;
  nama_pemilik_rekening: string | null;
  gambar_hero_url: string | null;
};

export default function PengaturanPage() {
  const router = useRouter();

  const [id, setId] = useState<number | null>(null);

  const [namaToko, setNamaToko] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [bank, setBank] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [gambarHeroUrl, setGambarHeroUrl] = useState("");
  const [fileHero, setFileHero] = useState<File | null>(null);
const [menguploadHero, setMenguploadHero] = useState(false);

  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");

  async function ambilPengaturan() {
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
      "/api/admin/settings",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const hasil = await response.json();

    if (!response.ok) {
      console.error(
        "Gagal mengambil pengaturan:",
        hasil
      );

      setError(
        hasil.error ||
          "Gagal mengambil data pengaturan toko."
      );

      setLoading(false);
      return;
    }

    if (!hasil.data) {
      setError("Data pengaturan toko belum tersedia.");
      setLoading(false);
      return;
    }

    const dataPengaturan =
      hasil.data as Pengaturan;

    setId(dataPengaturan.id);
    setNamaToko(dataPengaturan.nama_toko || "");
    setWhatsapp(dataPengaturan.whatsapp || "");
    setAlamat(dataPengaturan.alamat || "");
    setBank(dataPengaturan.bank || "");
    setNomorRekening(
      dataPengaturan.nomor_rekening || ""
    );
    setNamaPemilik(
      dataPengaturan.nama_pemilik_rekening || ""
    );
    setGambarHeroUrl(
  dataPengaturan.gambar_hero_url || ""
);
  } catch (error) {
    console.error(
      "Error mengambil pengaturan:",
      error
    );

    setError(
      "Terjadi kesalahan saat mengambil data pengaturan."
    );
  } finally {
    setLoading(false);
  }
}

    useEffect(() => {
    async function cekAksesAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.replace("/admin/login");
          return;
        }

        await ambilPengaturan();
      } catch (error) {
        console.error(
          "Error mengecek akses admin:",
          error
        );

        router.replace("/admin/login");
      }
    }

    cekAksesAdmin();
  }, [router]);

  async function uploadHero() {
  if (!fileHero) {
    setError("Silakan pilih gambar Hero terlebih dahulu.");
    return;
  }

  setMenguploadHero(true);
  setPesan("");
  setError("");

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError("Kamu harus login sebagai admin.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileHero);

    const response = await fetch(
      "/api/admin/hero",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    const hasil = await response.json();

    if (!response.ok) {
      setError(
        hasil.error ||
          "Gagal mengupload gambar Hero."
      );
      return;
    }

    setGambarHeroUrl(
      hasil.gambarHeroUrl || ""
    );

    setFileHero(null);

    setPesan(
      "Gambar Hero berhasil diupload."
    );
  } catch (error) {
    console.error(
      "Error upload gambar Hero:",
      error
    );

    setError(
      "Terjadi kesalahan saat mengupload gambar Hero."
    );
  } finally {
    setMenguploadHero(false);
  }
}
  async function simpanPengaturan(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (!id) {
    setError("ID pengaturan tidak ditemukan.");
    return;
  }

  setMenyimpan(true);
  setPesan("");
  setError("");

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError("Kamu harus login sebagai admin.");
      setMenyimpan(false);
      return;
    }

    const response = await fetch(
      "/api/admin/settings",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
  id,
  nama_toko: namaToko,
  whatsapp,
  alamat,
  bank,
  nomor_rekening: nomorRekening,
  nama_pemilik_rekening: namaPemilik,
  gambar_hero_url: gambarHeroUrl,
}),
      }
    );

    const hasil = await response.json();

    if (!response.ok) {
      console.error(
        "Gagal menyimpan pengaturan:",
        hasil
      );

      setError(
        hasil.error ||
          "Gagal menyimpan pengaturan toko."
      );

      setMenyimpan(false);
      return;
    }

    setPesan("Pengaturan toko berhasil disimpan.");
  } catch (error) {
    console.error(
      "Error menyimpan pengaturan:",
      error
    );

    setError(
      "Terjadi kesalahan saat menyimpan pengaturan."
    );
  } finally {
    setMenyimpan(false);
  }
}

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-zinc-400">
            Memuat pengaturan toko...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        {/* KEMBALI */}
        <a
          href="/admin"
          className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-yellow-400"
        >
          ← Kembali ke Dashboard
        </a>

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            Admin
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Pengaturan Toko
          </h1>

          <p className="mt-2 text-zinc-400">
            Atur informasi toko dan rekening pembayaran{" "}
            {namaToko}.
          </p>
        </div>

        {/* PESAN BERHASIL */}
        {pesan && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
            {pesan}
          </div>
        )}

        {/* PESAN ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={simpanPengaturan}
          className="space-y-6"
        >

          {/* INFORMASI TOKO */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">
              Informasi Toko
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Informasi dasar {namaToko}.
            </p>

            <div className="mt-6 space-y-5">

              {/* NAMA TOKO */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nama Toko
                </label>

                <input
                  type="text"
                  value={namaToko}
                  onChange={(e) => setNamaToko(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Nama toko"
                />
              </div>

              {/* WHATSAPP */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nomor WhatsApp
                </label>

                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              {/* ALAMAT */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Alamat Toko
                </label>

                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Masukkan alamat toko"
                />
              </div>

            </div>
          </section>

          {/* REKENING */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">
              Rekening Pembayaran
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Informasi rekening untuk pembayaran pelanggan.
            </p>

            <div className="mt-6 space-y-5">

              {/* BANK */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nama Bank
                </label>

                <input
                  type="text"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Contoh: BCA / BRI / Mandiri"
                />
              </div>

              {/* NOMOR REKENING */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nomor Rekening
                </label>

                <input
                  type="text"
                  value={nomorRekening}
                  onChange={(e) => setNomorRekening(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Nomor rekening"
                />
              </div>

              {/* NAMA PEMILIK */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nama Pemilik Rekening
                </label>

                <input
                  type="text"
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-yellow-400"
                  placeholder="Nama pemilik rekening"
                />
              </div>

            </div>
          </section>

          {/* GAMBAR HERO */}
<section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
  <h2 className="text-xl font-bold">
    Gambar Hero
  </h2>

  <p className="mt-1 text-sm text-zinc-500">
    Gambar yang tampil pada bagian utama halaman depan.
  </p>

  {gambarHeroUrl && (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
      <img
        src={gambarHeroUrl}
        alt="Gambar Hero"
        className="h-64 w-full object-cover"
      />
    </div>
  )}

  <div className="mt-6">
    <label className="mb-2 block text-sm font-medium">
      Pilih Gambar Hero
    </label>

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) =>
        setFileHero(e.target.files?.[0] || null)
      }
      className="block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-semibold file:text-black"
    />

    <p className="mt-2 text-xs text-zinc-500">
      Format JPG, PNG, atau WebP. Maksimal 5 MB.
    </p>
  </div>

  <button
    type="button"
    onClick={uploadHero}
    disabled={!fileHero || menguploadHero}
    className="mt-4 rounded-full bg-yellow-400 px-5 py-2.5 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {menguploadHero
      ? "Mengupload..."
      : "Upload Gambar Hero"}
  </button>
</section>
          {/* SIMPAN */}
          <button
            type="submit"
            disabled={menyimpan}
            className="rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {menyimpan
              ? "Menyimpan..."
              : "Simpan Pengaturan"}
          </button>

        </form>
      </div>
    </main>
  );
}