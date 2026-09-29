"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Camera = {
  id: number;
  nama: string;
  brand: string;
  deskripsi: string | null;
  harga_per_hari: number;
  stok: number;
  gambar_url: string | null;
  aktif: boolean;
};

export default function AdminKameraPage() {
  const router = useRouter();

  const [kamera, setKamera] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [tampilForm, setTampilForm] = useState(false);
  const [modeEdit, setModeEdit] = useState(false);
  const [kameraEditId, setKameraEditId] = useState<number | null>(null);

  const [nama, setNama] = useState("");
  const [brand, setBrand] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [harga, setHarga] = useState("50000");
  const [stok, setStok] = useState("1");
  const [aktif, setAktif] = useState(true);

  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [gambarPreview, setGambarPreview] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  async function ambilKamera() {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        alert("Kamu harus login sebagai admin.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/kamera", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const hasil = await response.json();

      if (!response.ok) {
        console.error("Gagal mengambil kamera:", hasil);

        alert(hasil.error || "Gagal mengambil data kamera.");

        setLoading(false);
        return;
      }

      setKamera(hasil.data || []);
    } catch (error) {
      console.error("Error mengambil kamera:", error);

      alert("Terjadi kesalahan saat mengambil data kamera.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    ambilKamera();
  }, [router]);

  function resetForm() {
    setNama("");
    setBrand("");
    setDeskripsi("");
    setHarga("50000");
    setStok("1");
    setAktif(true);

    setGambarFile(null);
    setGambarPreview(null);

    setModeEdit(false);
    setKameraEditId(null);
  }

  function bukaFormTambah() {
    resetForm();
    setTampilForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function bukaFormEdit(item: Camera) {
    setModeEdit(true);
    setKameraEditId(item.id);

    setNama(item.nama);
    setBrand(item.brand);
    setDeskripsi(item.deskripsi || "");
    setHarga(String(item.harga_per_hari));
    setStok(String(item.stok));
    setAktif(item.aktif);

    setGambarFile(null);
    setGambarPreview(item.gambar_url);

    setTampilForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function tutupForm() {
    setTampilForm(false);
    resetForm();
  }

  async function simpanKamera(e: React.FormEvent) {
    e.preventDefault();

    if (!nama.trim() || !brand.trim()) {
      alert("Nama dan brand kamera wajib diisi.");
      return;
    }

    if (Number(harga) < 0 || Number(stok) < 0) {
      alert("Harga dan stok tidak boleh kurang dari 0.");
      return;
    }

    setMenyimpan(true);

    try {
      // =========================================
      // AMBIL SESSION ADMIN
      // =========================================

      const sessionResult = await supabase.auth.getSession();

      const accessToken =
        sessionResult.data.session?.access_token;

      if (!accessToken) {
        alert(
          "Sesi admin tidak ditemukan. Silakan login kembali."
        );

        setMenyimpan(false);
        return;
      }

      let kameraId: number | null = kameraEditId;

      // =========================================
      // EDIT KAMERA
      // =========================================

      if (modeEdit && kameraEditId !== null) {
        const { error } = await supabase
          .from("camera")
          .update({
            nama: nama.trim(),
            brand: brand.trim(),
            deskripsi: deskripsi.trim() || null,
            harga_per_hari: Number(harga),
            stok: Number(stok),
            aktif,
            updated_at: new Date().toISOString(),
          })
          .eq("id", kameraEditId);

        if (error) {
          console.error("Gagal mengubah kamera:", error);

          alert(
            "Gagal mengubah kamera.\n\n" +
              error.message
          );

          setMenyimpan(false);
          return;
        }
      }

      // =========================================
      // TAMBAH KAMERA
      // =========================================

      if (!modeEdit) {
        const { data, error } = await supabase
          .from("camera")
          .insert({
            nama: nama.trim(),
            brand: brand.trim(),
            deskripsi: deskripsi.trim() || null,
            harga_per_hari: Number(harga),
            stok: Number(stok),
            gambar_url: null,
            aktif: true,
          })
          .select("id")
          .single();

        if (error || !data) {
          console.error("Gagal menambah kamera:", error);

          alert(
            "Gagal menambah kamera.\n\n" +
              (error?.message ||
                "Data kamera tidak berhasil dibuat.")
          );

          setMenyimpan(false);
          return;
        }

        kameraId = data.id;
      }

      // =========================================
      // UPLOAD GAMBAR JIKA ADA
      // =========================================

      if (gambarFile && kameraId !== null) {
        const formData = new FormData();

        formData.append("file", gambarFile);

        formData.append(
          "kameraId",
          String(kameraId)
        );

        const uploadResponse = await fetch(
          "/api/admin/kamera/gambar",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        const uploadResult =
          await uploadResponse.json();

        if (!uploadResponse.ok) {
          console.error(
            "Gagal upload gambar:",
            uploadResult
          );

          alert(
            "Data kamera berhasil disimpan, tetapi gambar gagal diupload.\n\n" +
              (uploadResult.error ||
                "Terjadi kesalahan saat upload gambar.")
          );
        }
      }

      // =========================================
      // SELESAI
      // =========================================

      await ambilKamera();

      alert(
        modeEdit
          ? "Data kamera berhasil diubah."
          : "Kamera berhasil ditambahkan."
      );

      setMenyimpan(false);
      tutupForm();
    } catch (error) {
      console.error("Error menyimpan kamera:", error);

      alert(
        "Terjadi kesalahan saat menyimpan kamera."
      );

      setMenyimpan(false);
    }
  }

  async function ubahStatusKamera(item: Camera) {
    const statusBaru = !item.aktif;

    const pesan = statusBaru
      ? `Aktifkan kembali kamera "${item.brand} ${item.nama}"?`
      : `Nonaktifkan kamera "${item.brand} ${item.nama}"?\n\nKamera tidak akan ditampilkan kepada pelanggan.`;

    const yakin = window.confirm(pesan);

    if (!yakin) {
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/admin/login");
      return;
    }

    const response = await fetch(
      "/api/admin/kamera/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: item.id,
          aktif: statusBaru,
        }),
      }
    );

    const hasil = await response.json();

    if (!response.ok) {
      console.error(
        "Gagal mengubah status kamera:",
        hasil
      );

      alert(
        "Gagal mengubah status kamera.\n\n" +
          (hasil.error || "Terjadi kesalahan.")
      );

      return;
    }

    await ambilKamera();

    if (statusBaru) {
      alert("Kamera berhasil diaktifkan kembali.");
    } else {
      alert("Kamera berhasil dinonaktifkan.");
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-yellow-400">
              Admin
            </p>

            <h1 className="text-3xl font-bold">
              Kelola Kamera
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Tambah, edit, dan atur status kamera.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/admin"
              className="rounded-full border border-gray-700 px-5 py-3 text-sm font-semibold transition hover:border-yellow-400 hover:text-yellow-400"
            >
              ← Dashboard
            </a>

            <button
              type="button"
              onClick={bukaFormTambah}
              className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
            >
              + Tambah Kamera
            </button>
          </div>
        </div>

        {/* FORM */}
        {tampilForm && (
          <div
            ref={formRef}
            className="mb-10 rounded-2xl border border-gray-800 bg-gray-950 p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {modeEdit
                    ? "Edit Kamera"
                    : "Tambah Kamera"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {modeEdit
                    ? "Ubah informasi kamera."
                    : "Masukkan informasi kamera baru."}
                </p>
              </div>

              <button
                type="button"
                onClick={tutupForm}
                className="text-sm text-gray-400 transition hover:text-white"
              >
                Tutup
              </button>
            </div>

            <form
              onSubmit={simpanKamera}
              className="grid gap-5 md:grid-cols-2"
            >
              {/* NAMA */}
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Nama Kamera
                </label>

                <input
                  type="text"
                  value={nama}
                  onChange={(e) =>
                    setNama(e.target.value)
                  }
                  placeholder="Contoh: EOS R"
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                />
              </div>

              {/* BRAND */}
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Brand
                </label>

                <input
                  type="text"
                  value={brand}
                  onChange={(e) =>
                    setBrand(e.target.value)
                  }
                  placeholder="Contoh: Canon"
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                />
              </div>

              {/* HARGA */}
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Harga per Hari
                </label>

                <input
                  type="number"
                  min="0"
                  value={harga}
                  onChange={(e) =>
                    setHarga(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Contoh: 50000 = Rp50.000
                </p>
              </div>

              {/* STOK */}
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Stok
                </label>

                <input
                  type="number"
                  min="0"
                  value={stok}
                  onChange={(e) =>
                    setStok(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                />
              </div>

              {/* GAMBAR */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-300">
                  Gambar Kamera
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0] || null;

                    setGambarFile(file);

                    if (file) {
                      setGambarPreview(
                        URL.createObjectURL(file)
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-gray-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-yellow-300"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Format: JPG, PNG, atau WebP. Maksimal 5 MB.
                </p>

                {gambarPreview && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs text-gray-500">
                      Preview gambar:
                    </p>

                    <img
                      src={gambarPreview}
                      alt="Preview kamera"
                      className="h-48 w-full rounded-xl border border-gray-800 object-contain bg-black"
                    />
                  </div>
                )}
              </div>

              {/* DESKRIPSI */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-300">
                  Deskripsi
                </label>

                <textarea
                  value={deskripsi}
                  onChange={(e) =>
                    setDeskripsi(e.target.value)
                  }
                  rows={4}
                  placeholder="Masukkan deskripsi atau spesifikasi kamera..."
                  className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-yellow-400"
                />
              </div>

              {/* STATUS */}
              {modeEdit && (
                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={aktif}
                      onChange={(e) =>
                        setAktif(e.target.checked)
                      }
                      className="h-5 w-5 accent-yellow-400"
                    />

                    <span className="text-sm text-gray-300">
                      Kamera aktif dan dapat disewa pelanggan
                    </span>
                  </label>
                </div>
              )}

              {/* BUTTON */}
              <div className="flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={menyimpan}
                  className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {menyimpan
                    ? "Menyimpan..."
                    : modeEdit
                    ? "Simpan Perubahan"
                    : "Tambah Kamera"}
                </button>

                <button
                  type="button"
                  onClick={tutupForm}
                  className="rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-white hover:text-white"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DAFTAR KAMERA */}
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          <div className="border-b border-gray-800 p-6">
            <h2 className="text-xl font-bold">
              Daftar Kamera
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Total {kamera.length} kamera
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Memuat data kamera...
            </div>
          ) : kamera.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Belum ada kamera.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                    <th className="px-6 py-4">
                      Gambar
                    </th>

                    <th className="px-6 py-4">
                      Kamera
                    </th>

                    <th className="px-6 py-4">
                      Brand
                    </th>

                    <th className="px-6 py-4">
                      Harga
                    </th>

                    <th className="px-6 py-4">
                      Stok
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {kamera.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-900 transition hover:bg-gray-900"
                    >
                      {/* GAMBAR - HANYA SATU */}
                      <td className="px-6 py-5">
                        {item.gambar_url ? (
                          <img
                            src={item.gambar_url}
                            alt={`${item.brand} ${item.nama}`}
                            className="h-20 w-24 rounded-xl border border-gray-800 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-24 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-xs text-gray-500">
                            Belum ada gambar
                          </div>
                        )}
                      </td>

                      {/* NAMA + DESKRIPSI */}
                      <td className="px-6 py-5">
                        <div className="font-semibold">
                          {item.nama}
                        </div>

                        {item.deskripsi && (
                          <div className="mt-1 max-w-xs text-xs text-gray-500">
                            {item.deskripsi}
                          </div>
                        )}
                      </td>

                      {/* BRAND */}
                      <td className="px-6 py-5 text-gray-300">
                        {item.brand}
                      </td>

                      {/* HARGA */}
                      <td className="px-6 py-5 text-gray-300">
                        Rp
                        {Number(
                          item.harga_per_hari
                        ).toLocaleString("id-ID")}
                      </td>

                      {/* STOK */}
                      <td className="px-6 py-5">
                        <span
                          className={
                            item.stok > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {item.stok}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        {item.aktif ? (
                          <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs font-semibold text-green-400">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-400">
                            Tidak Aktif
                          </span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              bukaFormEdit(item)
                            }
                            className="rounded-full border border-yellow-400 px-4 py-2 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              ubahStatusKamera(item)
                            }
                            className={
                              item.aktif
                                ? "rounded-full border border-red-500 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
                                : "rounded-full border border-green-500 px-4 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-500 hover:text-white"
                            }
                          >
                            {item.aktif
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}