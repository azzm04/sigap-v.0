"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface NilaiFilterCatatan {
  cari_catatan?: string;
  label?: string;
  [kunci: string]: string | undefined;
}

const OPSI_LABEL = [
  { value: "tindak_lanjut", label: "Perlu Tindak Lanjut" },
  { value: "diabaikan", label: "Diabaikan (Paid Manual)" },
];

export function FilterCatatan({
  nilai,
  ukuran,
}: {
  nilai: NilaiFilterCatatan;
  ukuran: number;
}) {
  const router = useRouter();
  const adaFilterAktif = Object.values(nilai).some((v) => v);
  const [cari, setCari] = useState(nilai.cari_catatan ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCari(nilai.cari_catatan ?? "");
  }, [nilai.cari_catatan]);

  function terapkan(perubahan: Partial<NilaiFilterCatatan>) {
    const gabungan: NilaiFilterCatatan = { ...nilai, ...perubahan };
    const params = new URLSearchParams();
    params.set("tab", "catatan");
    for (const [kunci, v] of Object.entries(gabungan)) {
      if (v) params.set(kunci, v);
    }
    params.set("ukuran_catatan", String(ukuran));
    params.set("halaman_catatan", "1");
    router.push(`/peringatan?${params.toString()}`);
  }

  function ubahCari(nilaiBaru: string) {
    setCari(nilaiBaru);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => terapkan({ cari_catatan: nilaiBaru || undefined }),
      450,
    );
  }

  return (
    <div className="border-b border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="flex min-w-24 flex-1 flex-col gap-1.5">
          <Label className="text-sm" htmlFor="cari_catatan">
            Cari nama korban / ID jaminan / isi catatan
          </Label>
          <Input
            id="cari_catatan"
            value={cari}
            onChange={(e) => ubahCari(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Label</Label>
          <Select
            id="label"
            value={nilai.label ?? ""}
            onChange={(e) =>
              terapkan({ label: e.target.value || undefined })
            }
            placeholder="Semua"
            options={OPSI_LABEL}
            className="w-full sm:w-48"
          />
        </div>

        {adaFilterAktif && (
          <Link
            href="/peringatan?tab=catatan"
            className="h-8 shrink-0 pb-1 text-sm text-muted-foreground underline sm:pb-2"
          >
            Reset filter
          </Link>
        )}
      </div>
    </div>
  );
}
