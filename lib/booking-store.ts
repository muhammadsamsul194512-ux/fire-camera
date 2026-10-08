import { create } from "zustand";
import { persist } from "zustand/middleware";

type BookingState = {
  cameraId: string;
  tanggalAmbil: string;
  tanggalKembali: string;
};

type BookingStore = BookingState & {
  setBooking: (partial: Partial<BookingState>) => void;
  clearBooking: () => void;
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      cameraId: "",
      tanggalAmbil: "",
      tanggalKembali: "",
      setBooking: (partial) => set((state) => ({ ...state, ...partial })),
      clearBooking: () =>
        set({
          cameraId: "",
          tanggalAmbil: "",
          tanggalKembali: "",
        }),
    }),
    {
      name: "fire-camera-booking",
    },
  ),
);
