type FooterProps = {
  namaToko: string;
  whatsapp?: string;
};

export default function Footer({ namaToko, whatsapp }: FooterProps) {
  return (
    <footer className="border-t border-zinc-800 bg-black mt-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold">{namaToko || "FIRE CAMERA"}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Rental kamera profesional dan terpercaya.
          </p>
        </div>

        <div className="text-sm text-zinc-500">
          <p>Senin – Minggu | 08.00 – 21.00</p>
          {whatsapp && (
            <p className="mt-1">
              WhatsApp:{" "}
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow-400 transition"
              >
                {whatsapp}
              </a>
            </p>
          )}
        </div>

        <p className="text-sm text-zinc-600">
          © {new Date().getFullYear()} {namaToko || "FIRE CAMERA"}
        </p>
      </div>
    </footer>
  );
}
