"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RentangTanggal } from "@/components/ui/rentang-tanggal";
import { Select } from "@/components/ui/select";

export interface NilaiFilterGL {
  cari?: string;
  loket?: string;
  tahapan?: string;
  status_pembayaran?: string;
  gl_status?: string;
  pic_task_force?: string;
  pic_pengajuan?: string;
  status_duplikat_nama?: string;
  dari?: string;
  sampai?: string;
  [kunci: string]: string | undefined;
}

const OPSI_STATUS_DUPLIKAT_NAMA = [
  { value: "duplikat", label: "Nama Sama (>1 GL)" },
  { value: "unik", label: "Nama Unik (1 GL)" },
];

export function FilterGL({
  nilai,
  opsi,
  ukuran,
  basePath = "/",
}: {
  nilai: NilaiFilterGL;
  opsi: {
    loket: string[];
    tahapan: string[];
    statusPembayaran: string[];
    glStatus: string[];
    picTaskForce: string[];
    picPengajuan: string[];
  };
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

  function terapkan(perubahan: Partial<NilaiFilterGL>) {
    const gabungan: NilaiFilterGL = { ...nilai, ...perubahan };
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
          <Label className="text-sm" htmlFor="cari">
            Cari nama korban / ID jaminan
          </Label>
          <Input id="cari" value={cari} onChange={(e) => ubahCari(e.target.value)} className="w-full" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tahapan">Tahapan</Label>
          <Select
            id="tahapan"
            value={nilai.tahapan ?? ""}
            onChange={(e) => terapkan({ tahapan: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.tahapan}
            className="w-full sm:w-32"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status_pembayaran">Status Pembayaran</Label>
          <Select
            id="status_pembayaran"
            value={nilai.status_pembayaran ?? ""}
            onChange={(e) => terapkan({ status_pembayaran: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.statusPembayaran}
            className="w-full sm:w-28"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gl_status">GL Status</Label>
          <Select
            id="gl_status"
            value={nilai.gl_status ?? ""}
            onChange={(e) => terapkan({ gl_status: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.glStatus}
            className="w-full sm:w-28"
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
            className="w-full sm:w-36"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pic_pengajuan">PIC Pengajuan</Label>
          <Select
            id="pic_pengajuan"
            value={nilai.pic_pengajuan ?? ""}
            onChange={(e) => terapkan({ pic_pengajuan: e.target.value || undefined })}
            placeholder="Semua"
            options={opsi.picPengajuan}
            className="w-full sm:w-36"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status_duplikat_nama">Nama Korban</Label>
          <Select
            id="status_duplikat_nama"
            value={nilai.status_duplikat_nama ?? ""}
            onChange={(e) => terapkan({ status_duplikat_nama: e.target.value || undefined })}
            placeholder="Semua"
            options={OPSI_STATUS_DUPLIKAT_NAMA}
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
          <Link href={basePath} className="h-8 shrink-0 pb-1 text-sm text-muted-foreground underline sm:pb-2">
            Reset filter
          </Link>
        )}
      </div>
    </div>
  );
}
