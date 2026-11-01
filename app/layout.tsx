import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Fire Camera | Rental Kamera Profesional",
  description: "Sewa kamera profesional dengan proses mudah, aman, dan cepat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning is intentional and narrowly scoped to <body>.
        Browser extensions (Grammarly, LastPass, translation add-ons, etc.) inject
        proprietary attributes such as data-new-gr-c-s-check-loaded onto <body>
        after the server-rendered HTML arrives but before React hydrates it.
        This causes a harmless but noisy hydration mismatch warning at layout.tsx:27.
        suppressHydrationWarning tells React to skip attribute-level diffing on this
        single element only — it does not suppress mismatches on any child.
        Application-originated mismatches (e.g. Date.now(), localStorage reads during
        render) are never hidden by this attribute and must be fixed at their source.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
