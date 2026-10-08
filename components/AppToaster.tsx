"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      expand
      closeButton
      richColors
      visibleToasts={5}
      offset={20}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "border border-zinc-800 bg-zinc-900 text-white shadow-2xl shadow-black/30",
          title: "text-sm font-semibold text-white",
          description: "text-xs text-zinc-300",
          actionButton: "bg-yellow-400 text-black hover:bg-yellow-300",
          cancelButton: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
          closeButton:
            "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white",
        },
      }}
    />
  );
}
