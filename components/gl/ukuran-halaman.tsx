"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { PILIHAN_UKURAN_HALAMAN } from "@/lib/gl/ukuran-halaman";

export function PilihanUkuranHalaman({
  ukuran,
  total,
  filterAktif = {},
  basePath = "/",
  labelSatuan = "GL ditemukan",
}: {
  ukuran: number;
  total: number;
  filterAktif?: Record<string, string | undefined>;
  /** Rute tujuan navigasi, mis. "/peringatan" — default "/" (Daftar GL). */
  basePath?: string;
  /** Satuan yang dihitung, mis. "Rumah Sakit" — default "GL ditemukan". */
  labelSatuan?: string;
}) {
  const router = useRouter();

  function ubahUkuran(ukuranBaru: string) {
    const params = new URLSearchParams();
    for (const [kunci, nilai] of Object.entries(filterAktif)) {
      if (nilai) params.set(kunci, nilai);
    }
    params.set("ukuran", ukuranBaru);
    params.set("halaman", "1");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Menampilkan</span>
      <Select
        aria-label="Jumlah baris per halaman"
        value={String(ukuran)}
        onChange={(e) => ubahUkuran(e.target.value)}
        options={PILIHAN_UKURAN_HALAMAN.map(String)}
        className="h-7 w-[4.5rem] py-1 pr-6 text-xs"
      />
      <span>dari {total.toLocaleString("id-ID")} {labelSatuan}</span>
    </div>
  );
}
