"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LompatHalaman({
  halamanAktif,
  totalHalaman,
  ukuran,
  filterAktif = {},
  basePath = "/",
}: {
  halamanAktif: number;
  totalHalaman: number;
  ukuran: number;
  filterAktif?: Record<string, string | undefined>;
  /** Rute tujuan navigasi, mis. "/peringatan" — default "/" (Daftar GL). */
  basePath?: string;
}) {
  const router = useRouter();
  const [nilaiInput, setNilaiInput] = useState(String(halamanAktif));

  useEffect(() => {
    setNilaiInput(String(halamanAktif));
  }, [halamanAktif]);

  function bukaHalamanDariInput() {
    const angka = Number.parseInt(nilaiInput, 10);
    if (Number.isNaN(angka)) {
      setNilaiInput(String(halamanAktif));
      return;
    }

    const halamanTujuan = Math.min(Math.max(angka, 1), totalHalaman);
    const params = new URLSearchParams();
    for (const [kunci, nilai] of Object.entries(filterAktif)) {
      if (nilai) params.set(kunci, nilai);
    }
    params.set("ukuran", String(ukuran));
    params.set("halaman", String(halamanTujuan));

    if (halamanTujuan !== halamanAktif) {
      router.push(`${basePath}?${params.toString()}`);
      return;
    }

    setNilaiInput(String(halamanTujuan));
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <label htmlFor="halaman-manual" className="whitespace-nowrap">
        Halaman
      </label>
      <input
        id="halaman-manual"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalHalaman}
        value={nilaiInput}
        onChange={(e) => setNilaiInput(e.target.value)}
        onBlur={bukaHalamanDariInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            bukaHalamanDariInput();
          }
        }}
        className="h-8 w-14 rounded-md border border-input bg-background px-2 text-xs text-foreground"
        aria-label="Nomor halaman"
      />
      <span className="whitespace-nowrap">dari {totalHalaman}</span>
    </div>
  );
}