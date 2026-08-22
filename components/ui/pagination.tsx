import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Selalu tampilkan halaman pertama & terakhir, plus satu tetangga di kiri
// kanan halaman aktif; sisanya diringkas jadi elipsis. Pola pagination
// standar (mis. MUI usePagination), disederhanakan.
function buatDaftarHalaman(halamanAktif: number, totalHalaman: number): (number | "elipsis")[] {
  const SISI = 1;
  const TEPI = 1;

  if (totalHalaman <= SISI * 2 + TEPI * 2 + 3) {
    return Array.from({ length: totalHalaman }, (_, i) => i + 1);
  }

  const kiri = Math.max(halamanAktif - SISI, TEPI + 2);
  const kanan = Math.min(halamanAktif + SISI, totalHalaman - TEPI - 1);

  const hasil: (number | "elipsis")[] = [];
  for (let i = 1; i <= TEPI; i++) hasil.push(i);

  if (kiri > TEPI + 2) hasil.push("elipsis");
  else if (kiri === TEPI + 2) hasil.push(TEPI + 1);

  for (let i = kiri; i <= kanan; i++) hasil.push(i);

  if (kanan < totalHalaman - TEPI - 1) hasil.push("elipsis");
  else if (kanan === totalHalaman - TEPI - 1) hasil.push(totalHalaman - TEPI);

  for (let i = totalHalaman - TEPI + 1; i <= totalHalaman; i++) hasil.push(i);

  return hasil;
}

function TombolHalaman({
  href,
  aktif,
  disabled,
  "aria-label": ariaLabel,
  children,
}: {
  href: string;
  aktif?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const kelas = cn(
    "flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-mono text-xs font-medium transition-colors",
    aktif
      ? "bg-primary text-primary-foreground"
      : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={kelas} aria-disabled="true" aria-label={ariaLabel}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={kelas} aria-label={ariaLabel} aria-current={aktif ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function Pagination({
  halamanAktif,
  totalHalaman,
  buatUrl,
}: {
  halamanAktif: number;
  totalHalaman: number;
  buatUrl: (halaman: number) => string;
}) {
  if (totalHalaman <= 1) return null;

  const daftarHalaman = buatDaftarHalaman(halamanAktif, totalHalaman);

  return (
    <nav aria-label="Navigasi halaman" className="flex items-center gap-1.5">
      <TombolHalaman
        href={buatUrl(halamanAktif - 1)}
        disabled={halamanAktif <= 1}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="size-4" />
      </TombolHalaman>

      {daftarHalaman.map((h, i) =>
        h === "elipsis" ? (
          <span
            key={`elipsis-${i}`}
            className="flex h-8 min-w-8 items-center justify-center text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <TombolHalaman key={h} href={buatUrl(h)} aktif={h === halamanAktif}>
            {h}
          </TombolHalaman>
        ),
      )}

      <TombolHalaman
        href={buatUrl(halamanAktif + 1)}
        disabled={halamanAktif >= totalHalaman}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="size-4" />
      </TombolHalaman>
    </nav>
  );
}
