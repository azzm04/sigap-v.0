"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";
import { Select } from "@/components/ui/select";
import { LOKET_CABANG } from "@/lib/gl/pelimpahan";

export interface NilaiFilterPelimpahan {
  cari?: string;
  loket_pelimpahan?: string;
  pic_pengajuan?: string;
  dari?: string;
  sampai?: string;
  [kunci: string]: string | undefined;
}

export function FilterPelimpahan({
  nilai,
  opsi,
  ukuran,
}: {
  nilai: NilaiFilterPelimpahan;
  opsi: { picPengajuan: string[] };
  ukuran: number;
}) {
  const router = useRouter();
  const adaFilterAktif = Object.values(nilai).some((v) => v);
  const [cari, setCari] = useState(nilai.cari ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCari(nilai.cari ?? "");
  }, [nilai.cari]);

  function terapkan(perubahan: Partial<NilaiFilterPelimpahan>) {
    const gabungan: NilaiFilterPelimpahan = { ...nilai, ...perubahan };
    const params = new URLSearchParams();
    for (const [kunci, v] of Object.entries(gabungan)) {
      if (v) params.set(kunci, v);
    }
    params.set("ukuran", String(ukuran));
    params.set("halaman", "1");
    router.push(`/pelimpahan?${params.toString()}`);
  }

  function ubahCari(nilaiBaru: string) {
    setCari(nilaiBaru);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => terapkan({ cari: nilaiBaru || undefined }),
      450,
    );
  }

  return (
    <div className="border-b border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="flex min-w-24 flex-1 flex-col gap-1.5">
          <Label className="text-sm" htmlFor="cari">
            Cari nama korban / ID jaminan
          </Label>
          <Input
            id="cari"
            value={cari}
            onChange={(e) => ubahCari(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loket_pelimpahan">Loket Cabang</Label>
          <Select
            id="loket_pelimpahan"
            value={nilai.loket_pelimpahan ?? ""}
            onChange={(e) =>
              terapkan({ loket_pelimpahan: e.target.value || undefined })
            }
            placeholder="Semua"
            options={[...LOKET_CABANG]}
            className="w-full sm:w-64"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pic_pengajuan">PIC Pengajuan</Label>
          <Select
            id="pic_pengajuan"
            value={nilai.pic_pengajuan ?? ""}
            onChange={(e) =>
              terapkan({ pic_pengajuan: e.target.value || undefined })
            }
            placeholder="Semua"
            options={opsi.picPengajuan}
            className="w-full sm:w-40"
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
          <Link
            href="/pelimpahan"
            className="h-8 shrink-0 pb-1 text-sm text-muted-foreground underline sm:pb-2"
          >
            Reset filter
          </Link>
        )}
      </div>
    </div>
  );
}
