import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; // Pastikan path import supabase sudah benar
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Mengambil data pengaturan dari Supabase secara server-side
async function getSettings() {
  const { data } = await supabase.from("settings").select("*").single();
  return data;
}

// Generate dynamic metadata based on database settings
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const namaToko = settings?.nama_toko || "Snapiecam";
  
  return {
    title: `${namaToko} | Rental Kamera Profesional`,
    description: "Sewa kamera profesional dengan proses mudah, aman, dan cepat.",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const namaToko = settings?.nama_toko || "Snapiecam";
  
  // Ambil nomor WA dari database, berikan fallback jika kosong
  const rawPhone = settings?.whatsapp || "6285157831600";
  // Format nomor untuk link WhatsApp (hilangkan karakter selain angka)
  const formattedPhone = rawPhone.replace(/\D/g, "");

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white" suppressHydrationWarning>
        {/* Konten Utama */}
        <div className="flex-1">{children}</div>

        {/* Footer Website dengan Data Dinamis */}
        <footer className="border-t border-gray-800 bg-black py-6 text-center text-sm text-gray-400">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <div>
              <p>© {new Date().getFullYear()} {namaToko}. All rights reserved.</p>
              <p className="mt-1 text-xs text-gray-500">
                WhatsApp:{" "}
                <a 
                  href={`https://wa.me/${formattedPhone}?text=Halo%20${encodeURIComponent(namaToko)},%20saya%20ingin%20tanya%20sewa%20kamera`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-yellow-400 transition underline"
                >
                  {rawPhone}
                </a>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <Link 
                href="/" 
                className="transition hover:text-yellow-400"
              >
                Beranda
              </Link>
              <Link 
                href="/kritik-saran" 
                className="transition hover:text-yellow-400"
              >
                Kritik &amp; Saran
              </Link>
            </div>
          </div>
        </footer>

        <AppToaster />
      </body>
    </html>
  );
}