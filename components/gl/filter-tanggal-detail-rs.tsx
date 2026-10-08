"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";

/**
 * Filter "Rentang Tgl GL" khusus halaman /sebaran/[nama]. Sengaja komponen
 * tersendiri (bukan reuse FilterGL) karena halaman ini cuma butuh satu
 * filter tanggal, bukan seluruh filter Monitoring (loket, PIC, dst).
 */
export function FilterTanggalDetailRS({
  namaRumahSakit,
  dari,
  sampai,
}: {
  namaRumahSakit: string;
  dari?: string;
  sampai?: string;
}) {
  const router = useRouter();
  const basePath = `/sebaran/${encodeURIComponent(namaRumahSakit)}`;
  const adaFilterAktif = Boolean(dari || sampai);

  function terapkan(dariBaru?: string, sampaiBaru?: string) {
    const params = new URLSearchParams();
    if (dariBaru) params.set("dari", dariBaru);
    if (sampaiBaru) params.set("sampai", sampaiBaru);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label>Rentang Tgl GL</Label>
        <RentangTanggal dari={dari} sampai={sampai} onTerapkan={terapkan} className="sm:w-56" />
      </div>
      {adaFilterAktif && (
        <Link href={basePath} className="h-8 pb-1 text-sm text-muted-foreground underline sm:pb-2">
          Reset filter
        </Link>
      )}
    </div>
  );
}
