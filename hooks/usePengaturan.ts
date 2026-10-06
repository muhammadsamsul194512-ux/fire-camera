"use client";

import { useEffect, useState } from "react";

type Pengaturan = {
  nama_toko: string;
  bank: string;
  nomor_rekening: string;
  nama_pemilik_rekening: string;
  gambar_hero_url: string;
  whatsapp: string;
};

const defaultPengaturan: Pengaturan = {
  nama_toko: "",
  bank: "",
  nomor_rekening: "",
  nama_pemilik_rekening: "",
  gambar_hero_url: "",
  whatsapp: "",
};

export function usePengaturan() {
  const [pengaturan, setPengaturan] = useState<Pengaturan>(defaultPengaturan);

  useEffect(() => {
    async function ambil() {
      try {
        const res = await fetch("/api/pengaturan");
        const hasil = await res.json();
        if (res.ok && hasil.data) {
          setPengaturan({ ...defaultPengaturan, ...hasil.data });
        }
      } catch {
        // silently ignore — UI shows fallback values
      }
    }
    ambil();
  }, []);

  return pengaturan;
}
