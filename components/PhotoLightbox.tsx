"use client";

import { useEffect, useState } from "react";

type PhotoLightboxProps = {
  images: string[];
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
  altPrefix?: string;
};

export function PhotoLightbox({
  images,
  open,
  initialIndex = 0,
  onClose,
  altPrefix = "Foto",
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setBrokenImages({});
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setCurrentIndex((previous) => Math.min(previous + 1, images.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((previous) => Math.max(previous - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose, open]);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex] ?? images[0];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const currentImageIsBroken = !!brokenImages[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[90vh] w-full max-w-6xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Tutup foto"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-xl text-white transition hover:bg-zinc-800"
        >
          ×
        </button>

        {hasPrevious && (
          <button
            type="button"
            aria-label="Foto sebelumnya"
            onClick={() => setCurrentIndex((previous) => Math.max(previous - 1, 0))}
            className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-2xl text-white transition hover:bg-zinc-800 sm:left-6"
          >
            ←
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            aria-label="Foto berikutnya"
            onClick={() => setCurrentIndex((previous) => Math.min(previous + 1, images.length - 1))}
            className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-2xl text-white transition hover:bg-zinc-800 sm:right-6"
          >
            →
          </button>
        )}

        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-2xl sm:p-5">
          {currentImageIsBroken ? (
            <div className="flex h-full min-h-[300px] w-full max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 text-center text-zinc-300">
              <div className="mb-3 text-5xl">📷</div>
              <p className="text-base font-semibold">Foto tidak dapat dimuat</p>
              <p className="mt-1 text-sm text-zinc-400">
                Coba lagi atau pilih foto lain.
              </p>
            </div>
          ) : (
            <img
              src={currentImage}
              alt={`${altPrefix} ${currentIndex + 1}`}
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain"
              onError={() =>
                setBrokenImages((previous) => ({
                  ...previous,
                  [currentIndex]: true,
                }))
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
