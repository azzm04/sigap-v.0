"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";
import { Select } from "@/components/ui/select";

export interface NilaiFilterTaskForce {
  cari_task_force?: string;
  pic_task_force?: string;
  status_tinjauan_task_force?: string;
  dari_task_force?: string;
  sampai_task_force?: string;
  [kunci: string]: string | undefined;
}

const OPSI_STATUS_TINJAUAN = [
  { value: "belum", label: "Belum Ditinjau" },
  { value: "sudah", label: "Sudah Ditinjau" },
];

export function FilterTaskForce({
  nilai,
  opsi,
  ukuran,
}: {
  nilai: NilaiFilterTaskForce;
  opsi: { picTaskForce: string[] };
  ukuran: number;
}) {
  const router = useRouter();
  const adaFilterAktif = Object.values(nilai).some((v) => v);
  const [cari, setCari] = useState(nilai.cari_task_force ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCari(nilai.cari_task_force ?? "");
  }, [nilai.cari_task_force]);

  function terapkan(perubahan: Partial<NilaiFilterTaskForce>) {
    const gabungan: NilaiFilterTaskForce = { ...nilai, ...perubahan };
    const params = new URLSearchParams();
    params.set("tab", "task-force");
    for (const [kunci, v] of Object.entries(gabungan)) {
      if (v) params.set(kunci, v);
    }
    params.set("ukuran_task_force", String(ukuran));
    params.set("halaman_task_force", "1");
    router.push(`/peringatan?${params.toString()}`);
  }

  function ubahCari(nilaiBaru: string) {
    setCari(nilaiBaru);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => terapkan({ cari_task_force: nilaiBaru || undefined }),
      450,
    );
  }

  return (
    <div className="border-b border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
        <div className="flex min-w-24 flex-1 flex-col gap-1.5">
          <Label className="text-xs md:text-sm" htmlFor="cari_task_force">
            Cari nama korban / ID jaminan
          </Label>
          <Input
            id="cari_task_force"
            value={cari}
            onChange={(e) => ubahCari(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status_tinjauan_task_force">Status Tinjauan</Label>
          <Select
            id="status_tinjauan_task_force"
            value={nilai.status_tinjauan_task_force ?? ""}
            onChange={(e) => terapkan({ status_tinjauan_task_force: e.target.value || undefined })}
            placeholder="Semua"
            options={OPSI_STATUS_TINJAUAN}
            className="w-full sm:w-36"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pic_task_force">PIC Task Force</Label>
          <Select
            id="pic_task_force"
            value={nilai.pic_task_force ?? ""}
            onChange={(e) => terapkan({ pic_task_force: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.picTaskForce}
            className="w-full sm:w-40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Rentang Tgl GL</Label>
          <RentangTanggal
            dari={nilai.dari_task_force}
            sampai={nilai.sampai_task_force}
            onTerapkan={(dari, sampai) =>
              terapkan({ dari_task_force: dari, sampai_task_force: sampai })
            }
            className="sm:w-56"
          />
        </div>

        {adaFilterAktif && (
          <Link
            href="/peringatan?tab=task-force"
            className="h-8 shrink-0 pb-1 text-sm text-muted-foreground underline sm:pb-2"
          >
            Reset filter
          </Link>
        )}
      </div>
    </div>
  );
}
