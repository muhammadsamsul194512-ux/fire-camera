"use client";

import Link from "next/link";
import { useState } from "react";

type NavbarProps = {
  namaToko: string;
  activeHref?: string;
};

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/kamera", label: "Daftar Kamera" },
  { href: "/#cara-sewa", label: "Cara Sewa" },
  { href: "/riwayat", label: "Cek Pesanan" },
];

export default function Navbar({ namaToko, activeHref }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* LOGO */}
        <Link
          href="/"
          className="text-xl font-bold tracking-wider transition hover:text-yellow-400"
        >
          {namaToko || "FIRE CAMERA"}
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition hover:text-yellow-400 ${
                activeHref === link.href
                  ? "font-semibold text-yellow-400"
                  : "text-zinc-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* MOBILE — hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white md:hidden"
        >
          {mobileOpen ? (
            /* X icon */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-6 pb-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 text-sm transition hover:text-yellow-400 ${
                activeHref === link.href
                  ? "font-semibold text-yellow-400"
                  : "text-zinc-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
