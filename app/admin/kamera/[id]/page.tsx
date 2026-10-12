"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { notify } from "@/lib/notifications";
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

type CameraPhoto = {
  id: number;
  camera_id: number;
  image_url: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

type PendingPhotoFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function AdminKameraDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cameraId = Number(params.id);

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nama, setNama] = useState("");
  const [brand, setBrand] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [harga, setHarga] = useState("50000");
  const [stok, setStok] = useState("1");
  const [aktif, setAktif] = useState(true);
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [gambarPreview, setGambarPreview] = useState<string | null>(null);

  const [cameraPhotos, setCameraPhotos] = useState<CameraPhoto[]>([]);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<
    PendingPhotoFile[]
  >([]);
  const [cameraPhotoLoading, setCameraPhotoLoading] = useState(false);
  const [cameraPhotoError, setCameraPhotoError] = useState("");
  const [cameraPhotoUploading, setCameraPhotoUploading] = useState(false);
  const [pendingUploadProgress, setPendingUploadProgress] = useState("");
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);

  async function loadCamera() {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/kamera", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok) {
        notify.error(
          "Gagal memuat detail kamera.",
          result.error || "Terjadi kesalahan.",
        );
        return;
      }

      const selected =
        (result.data || []).find((item: Camera) => item.id === cameraId) ||
        null;
      if (!selected) {
        notify.error("Kamera tidak ditemukan.");
        router.push("/admin/kamera");
        return;
      }

      setCamera(selected);
      setNama(selected.nama);
      setBrand(selected.brand);
      setDeskripsi(selected.deskripsi || "");
      setHarga(String(selected.harga_per_hari));
      setStok(String(selected.stok));
      setAktif(selected.aktif);
      setGambarPreview(selected.gambar_url || null);
      await loadCameraPhotos();
    } catch (error) {
      console.error("Error loading camera detail:", error);
      notify.error("Terjadi kesalahan saat memuat detail kamera.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCameraPhotos() {
    setCameraPhotoLoading(true);
    setCameraPhotoError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setCameraPhotoError("Sesi admin tidak ditemukan.");
        return;
      }

      const response = await fetch(
        `/api/admin/kamera/foto?cameraId=${cameraId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal mengambil foto kamera.");
      }

      setCameraPhotos(result.data || []);
    } catch (error) {
      console.error("Gagal mengambil foto kamera:", error);
      setCameraPhotoError(
        error instanceof Error ? error.message : "Gagal mengambil foto kamera.",
      );
      setCameraPhotos([]);
    } finally {
      setCameraPhotoLoading(false);
    }
  }

  async function saveCamera() {
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
        .eq("id", cameraId);

      if (error) {
        notify.error("Gagal mengubah kamera.", error.message);
        return;
      }

      if (gambarFile) {
        const formData = new FormData();
        formData.append("file", gambarFile);
        formData.append("kameraId", String(cameraId));

        const uploadResponse = await fetch("/api/admin/kamera/gambar", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          notify.warning(
            "Data kamera berhasil disimpan, tapi gambar utama gagal diupload.",
            uploadResult.error || "Periksa kembali gambar utama.",
          );
        }
      }

      notify.success("Data kamera berhasil diperbarui.");
      router.push("/admin/kamera");
    } catch (error) {
      console.error("Error saving camera:", error);
      notify.error("Terjadi kesalahan saat menyimpan kamera.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSamplePhotos() {
    if (pendingPhotoFiles.length === 0) return;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setCameraPhotoError("Sesi admin tidak ditemukan.");
      return;
    }

    setCameraPhotoUploading(true);
    setCameraPhotoError("");
    setPendingUploadProgress(`0/${pendingPhotoFiles.length}`);

    try {
      let failed = 0;

      for (let index = 0; index < pendingPhotoFiles.length; index += 1) {
        const item = pendingPhotoFiles[index];
        setPendingUploadProgress(`${index + 1}/${pendingPhotoFiles.length}`);

        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("cameraId", String(cameraId));

        const response = await fetch("/api/admin/kamera/foto", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          failed += 1;
          console.error("Gagal upload foto kamera:", result);
        }
      }

      setPendingPhotoFiles([]);
      await loadCameraPhotos();

      if (failed > 0) {
        notify.warning(
          "Beberapa foto gagal diupload.",
          `${failed} file gagal upload.`,
        );
      } else {
        notify.success("Foto hasil kamera berhasil ditambahkan.");
      }
    } catch (error) {
      console.error("Gagal upload foto kamera:", error);
      setCameraPhotoError(
        error instanceof Error
          ? error.message
          : "Gagal upload foto hasil kamera.",
      );
      notify.error(
        "Upload foto gagal.",
        error instanceof Error
          ? error.message
          : "Coba lagi beberapa saat lagi.",
      );
    } finally {
      setCameraPhotoUploading(false);
      setPendingUploadProgress("");
    }
  }

  async function deletePhoto(photo: CameraPhoto) {
    const yakin = window.confirm("Hapus foto ini dari kamera?");
    if (!yakin) return;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setCameraPhotoError("Sesi admin tidak ditemukan.");
      return;
    }

    try {
      const response = await fetch("/api/admin/kamera/foto", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photoId: photo.id, cameraId: cameraId }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menghapus foto kamera.");

      await loadCameraPhotos();
      notify.success("Foto berhasil dihapus.");
    } catch (error) {
      console.error("Gagal hapus foto kamera:", error);
      setCameraPhotoError(
        error instanceof Error ? error.message : "Gagal menghapus foto kamera.",
      );
    }
  }

  async function reorderPhoto(photoId: number, direction: "up" | "down") {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setCameraPhotoError("Sesi admin tidak ditemukan.");
      return;
    }

    try {
      const response = await fetch("/api/admin/kamera/foto", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photoId, cameraId: cameraId, direction }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal mengurutkan foto.");
      await loadCameraPhotos();
    } catch (error) {
      console.error("Gagal urutkan foto kamera:", error);
      setCameraPhotoError(
        error instanceof Error ? error.message : "Gagal mengatur urutan foto.",
      );
    }
  }

  function handlePendingSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const valid: PendingPhotoFile[] = [];
    const invalid: string[] = [];

    files.forEach((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        invalid.push(`${file.name} (format tidak didukung)`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        invalid.push(`${file.name} (melebihi 5 MB)`);
        return;
      }

      valid.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (invalid.length > 0) {
      notify.warning(
        "Beberapa foto tidak bisa ditambahkan.",
        invalid.join(", "),
      );
    }

    if (valid.length > 0) {
      setPendingPhotoFiles((current) => [...current, ...valid]);
    }

    event.target.value = "";
  }

  useEffect(() => {
    void loadCamera();
  }, [cameraId]);

  if (loading || !camera) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 p-10 text-center">
          Memuat detail kamera...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PhotoLightbox
          images={cameraPhotos.map((photo) => photo.image_url)}
          open={photoViewerIndex !== null}
          initialIndex={photoViewerIndex ?? 0}
          onClose={() => setPhotoViewerIndex(null)}
          altPrefix="Foto sample"
        />

        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/kamera")}
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-yellow-400 hover:text-yellow-400"
          >
            ← Kembali ke daftar
          </button>
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Edit Kamera</h1>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Nama Kamera
              </label>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
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
                Gambar utama
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setGambarFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-gray-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-yellow-300"
              />
              {(gambarPreview || camera.gambar_url) && (
                <img
                  src={gambarPreview || camera.gambar_url || ""}
                  alt="Preview gambar utama"
                  className="mt-4 h-52 w-full rounded-xl border border-gray-800 object-contain bg-black"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-gray-300">
                Deskripsi
              </label>
              <textarea
                value={deskripsi}
                rows={5}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none focus:border-yellow-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="h-5 w-5 accent-yellow-400"
                />
                <span className="text-sm text-gray-300">
                  Kamera aktif dan dapat disewa pelanggan
                </span>
              </label>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-800 bg-black/40 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Foto hasil kamera</h2>
                <p className="text-xs text-gray-500">
                  Foto ini ditampilkan di halaman detail pelanggan.
                </p>
              </div>
              {cameraPhotoLoading && (
                <span className="text-xs text-yellow-400">Memuat foto…</span>
              )}
            </div>

            {cameraPhotoError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {cameraPhotoError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cameraPhotos.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-gray-700 bg-gray-950 px-4 py-6 text-center text-sm text-gray-500">
                  Belum ada foto hasil kamera untuk item ini.
                </div>
              ) : (
                cameraPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPhotoViewerIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPhotoViewerIndex(index);
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-800 bg-gray-950 text-left outline-none transition focus:border-yellow-400"
                  >
                    <img
                      src={photo.image_url}
                      alt={`Foto hasil ${index + 1}`}
                      className="h-28 w-full object-cover"
                    />
                    <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          reorderPhoto(photo.id, "up");
                        }}
                        disabled={index === 0}
                        className="rounded-full bg-black/70 px-2 py-1 text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          reorderPhoto(photo.id, "down");
                        }}
                        disabled={index === cameraPhotos.length - 1}
                        className="rounded-full bg-black/70 px-2 py-1 text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePhoto(photo);
                        }}
                        className="rounded-full bg-red-500/80 px-2 py-1 text-[10px] text-white"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePendingSelection}
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-sm text-gray-300 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-yellow-300"
              />

              {pendingPhotoFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                    <span>
                      Pratinjau foto siap upload: {pendingPhotoFiles.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingPhotoFiles([])}
                      className="text-yellow-400 underline hover:text-yellow-300"
                    >
                      Bersihkan
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {pendingPhotoFiles.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-950"
                      >
                        <img
                          src={item.previewUrl}
                          alt={`Pratinjau foto ${index + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingPhotoFiles((current) =>
                              current.filter((entry) => entry.id !== item.id),
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Maksimal 5 MB per foto. Format: JPG, PNG, atau WebP.
                </p>
                <button
                  type="button"
                  onClick={() => void uploadSamplePhotos()}
                  disabled={
                    pendingPhotoFiles.length === 0 || cameraPhotoUploading
                  }
                  className="rounded-full bg-yellow-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cameraPhotoUploading
                    ? `Mengupload${pendingUploadProgress ? ` ${pendingUploadProgress}` : "..."}`
                    : "Upload Foto"}
                </button>
              </div>
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
              onClick={() => void saveCamera()}
              disabled={saving}
              className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
