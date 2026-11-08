"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface KritikSaran {
  id: string;
  nama: string;
  kontak: string;
  pesan: string;
  created_at: string;
}

export default function AdminKritikSaranPage() {
  const [data, setData] = useState<KritikSaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchKritikSaran() {
    setLoading(true);
    const { data: result, error } = await supabase
      .from("kritik_saran")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && result) {
      setData(result);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus masukan ini?")) return;

    setDeletingId(id);
    const { error } = await supabase.from("kritik_saran").delete().eq("id", id);

    if (!error) {
      setData((prev) => prev.filter((item) => item.id !== id));
    } else {
      alert("Gagal menghapus pesan: " + error.message);
    }
    setDeletingId(null);
  }

  useEffect(() => {
    fetchKritikSaran();
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Daftar Kritik & Saran</h1>
            <p className="mt-1 text-sm text-gray-400">
              Kelola dan baca masukan dari pelanggan Snapiecam
            </p>
          </div>
          <button
            onClick={fetchKritikSaran}
            className="self-start rounded-full border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-yellow-400 hover:text-yellow-400 sm:self-auto"
          >
            Refresh Data
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Memuat data masukan...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-12 text-center text-gray-400">
            Belum ada kritik atau saran yang masuk.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-800 bg-gray-950 p-6 transition hover:border-gray-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{item.nama}</h3>
                      <p className="text-xs text-yellow-400 mt-0.5">{item.kontak}</p>
                    </div>
                    <span className="text-[10px] text-gray-500 bg-gray-900 px-2.5 py-1 rounded-full border border-gray-800">
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 whitespace-pre-wrap rounded-xl bg-black/50 p-4 border border-gray-900">
                    "{item.pesan}"
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-900 pt-3">
                  <a
                    href={`https://wa.me/${item.kontak.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 transition hover:text-yellow-400"
                  >
                    Balas via WA →
                  </a>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs text-red-400 transition hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}