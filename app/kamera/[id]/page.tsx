"use client";

import { Suspense } from "react";
import KameraDetailPage from "./KameraDetailPage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-yellow-400" />
      </div>
    }>
      <KameraDetailPage />
    </Suspense>
  );
}
