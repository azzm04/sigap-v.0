"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";
import { Select } from "@/components/ui/select";
import { KELOMPOK_TAHAPAN_GL } from "@/lib/gl/sebaran";

const PILIHAN_KELOMPOK = [
  { value: "", label: "Semua Tahapan" },
  ...Object.entries(KELOMPOK_TAHAPAN_GL).map(([kunci, k]) => ({ value: kunci, label: k.label })),
];

/**
 * Filter "Rentang Tgl GL" + "Kelompok Tahapan" khusus halaman /sebaran/[nama].
 * Sengaja komponen tersendiri (bukan reuse FilterGL) karena halaman ini cuma
 * butuh dua filter ini, bukan seluruh filter Monitoring (loket, PIC, dst).
 */
export function FilterTanggalDetailRS({
  namaRumahSakit,
  dari,
  sampai,
  kelompok,
}: {
  namaRumahSakit: string;
  dari?: string;
  sampai?: string;
  kelompok?: string;
}) {
  const router = useRouter();
  const basePath = `/sebaran/${encodeURIComponent(namaRumahSakit)}`;
  const adaFilterAktif = Boolean(dari || sampai || kelompok);

  function navigasi(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  function terapkanTanggal(dariBaru?: string, sampaiBaru?: string) {
    const params = new URLSearchParams();
    if (dariBaru) params.set("dari", dariBaru);
    if (sampaiBaru) params.set("sampai", sampaiBaru);
    if (kelompok) params.set("kelompok", kelompok);
    navigasi(params);
  }

  function terapkanKelompok(kelompokBaru: string) {
    const params = new URLSearchParams();
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);
    if (kelompokBaru) params.set("kelompok", kelompokBaru);
    navigasi(params);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label>Rentang Tgl GL</Label>
        <RentangTanggal dari={dari} sampai={sampai} onTerapkan={terapkanTanggal} className="sm:w-56" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Kelompok Tahapan</Label>
        <Select
          value={kelompok ?? ""}
          onChange={(e) => terapkanKelompok(e.target.value)}
          options={PILIHAN_KELOMPOK}
          className="sm:w-48"
        />
      </div>
      {adaFilterAktif && (
        <Link href={basePath} className="h-8 pb-1 text-sm text-muted-foreground underline sm:pb-2">
          Reset filter
        </Link>
      )}
    </div>
  );
}
