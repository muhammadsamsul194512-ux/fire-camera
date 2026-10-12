"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export default function AdminKameraNewPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [brand, setBrand] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [harga, setHarga] = useState("50000");
  const [stok, setStok] = useState("1");
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function simpanKamera() {
    if (!nama.trim() || !brand.trim()) {
      notify.warning("Nama dan brand kamera wajib diisi.");
      return;
    }

    if (Number(harga) < 0 || Number(stok) < 0) {
      notify.warning("Harga dan stok tidak boleh kurang dari 0.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

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
        notify.error(
          "Gagal menambah kamera.",
          error?.message || "Data kamera tidak berhasil dibuat.",
        );
        return;
      }

      if (gambarFile) {
        const formData = new FormData();
        formData.append("file", gambarFile);
        formData.append("kameraId", String(data.id));

        const uploadResponse = await fetch("/api/admin/kamera/gambar", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          notify.warning(
            "Kamera tersimpan, tetapi gambar utama gagal diupload.",
            uploadResult.error || "Periksa kembali foto utama.",
          );
        }
      }

      notify.success("Kamera baru berhasil ditambahkan.");
      router.push("/admin/kamera");
    } catch (error) {
      console.error("Error menambah kamera:", error);
      notify.error("Terjadi kesalahan saat menambah kamera.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-800 bg-gray-950 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Tambah Kamera</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/kamera")}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-yellow-400 hover:text-yellow-400"
          >
            Kembali
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Nama Kamera
            </label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: EOS R"
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Brand</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Contoh: Canon"
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Harga per Hari
            </label>
            <input
              type="number"
              min="0"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">Stok</label>
            <input
              type="number"
              min="0"
              value={stok}
              onChange={(e) => setStok(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">
              Deskripsi
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">
              Gambar Kamera
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setGambarFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-gray-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-yellow-300"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/kamera")}
            className="rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:border-white hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void simpanKamera()}
            disabled={saving}
            className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Kamera"}
          </button>
        </div>
      </div>
    </main>
  );
}
