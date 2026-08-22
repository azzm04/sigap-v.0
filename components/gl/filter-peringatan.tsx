"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";
import { Select } from "@/components/ui/select";

export interface NilaiFilterPeringatan {
  cari?: string;
  loket?: string;
  status_tinjauan?: string;
  dari?: string;
  sampai?: string;
  // Supaya bisa dipakai langsung sebagai Record<string, string | undefined>
  // di PilihanUkuranHalaman/LompatHalaman tanpa perlu di-cast.
  [kunci: string]: string | undefined;
}

const OPSI_STATUS_TINJAUAN = [
  { value: "belum", label: "Belum Ditinjau" },
  { value: "sudah", label: "Sudah Ditinjau" },
];

export function FilterPeringatan({
  nilai,
  opsi,
  ukuran,
  basePath = "/peringatan",
}: {
  nilai: NilaiFilterPeringatan;
  opsi: { loket: string[] };
  ukuran: number;
  basePath?: string;
}) {
  const router = useRouter();
  const adaFilterAktif = Object.values(nilai).some((v) => v);
  const [cari, setCari] = useState(nilai.cari ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCari(nilai.cari ?? "");
  }, [nilai.cari]);

  function terapkan(perubahan: Partial<NilaiFilterPeringatan>) {
    const gabungan: NilaiFilterPeringatan = { ...nilai, ...perubahan };
    const params = new URLSearchParams();
    for (const [kunci, v] of Object.entries(gabungan)) {
      if (v) params.set(kunci, v);
    }
    params.set("ukuran", String(ukuran));
    params.set("halaman", "1");
    router.push(`${basePath}?${params.toString()}`);
  }

  function ubahCari(nilaiBaru: string) {
    setCari(nilaiBaru);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => terapkan({ cari: nilaiBaru || undefined }), 450);
  }

  return (
    <div className="border-b border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="flex min-w-24 flex-1 flex-col gap-1.5">
          <Label htmlFor="cari">Cari nama korban / ID jaminan</Label>
          <Input id="cari" value={cari} onChange={(e) => ubahCari(e.target.value)} className="w-full" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loket">Loket</Label>
          <Select
            id="loket"
            value={nilai.loket ?? ""}
            onChange={(e) => terapkan({ loket: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.loket}
            className="w-full sm:w-32"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status_tinjauan">Status Tinjauan</Label>
          <Select
            id="status_tinjauan"
            value={nilai.status_tinjauan ?? ""}
            onChange={(e) => terapkan({ status_tinjauan: e.target.value || undefined })}
            placeholder="Semua"
            options={OPSI_STATUS_TINJAUAN}
            className="w-full sm:w-36"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Rentang Tgl GL</Label>
          <RentangTanggal
            dari={nilai.dari}
            sampai={nilai.sampai}
            onTerapkan={(dari, sampai) => terapkan({ dari, sampai })}
            className="sm:w-56"
          />
        </div>

        {adaFilterAktif && (
          <Link href={basePath} className="h-8 shrink-0 pb-1 text-sm text-muted-foreground underline sm:pb-2">
            Reset filter
          </Link>
        )}
      </div>
    </div>
  );
}
