"use client";

import { useActionState, useEffect, useRef } from "react";
import { simpanLaporanSurveiTkp, type StatusLaporanTkp } from "@/app/gl/[idJaminan]/actions";
import { Textarea } from "@/components/ui/textarea";

export function FormLaporanTkp({
  idJaminan,
  dataLaporanTkpLengkap,
  perluTanggalSurveiManual,
}: {
  idJaminan: string;
  dataLaporanTkpLengkap: boolean;
  perluTanggalSurveiManual: boolean;
}) {
  const [status, formAction, sedangProses] = useActionState<StatusLaporanTkp | undefined, FormData>(
    simpanLaporanSurveiTkp,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (status?.berhasil) formRef.current?.reset();
  }, [status]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 flex min-w-0 flex-col gap-3">
      <input type="hidden" name="idJaminan" value={idJaminan} />
      {perluTanggalSurveiManual && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tanggalSurveiManual" className="text-xs md:text-sm font-medium text-foreground">
            Hari/Tanggal Survei (Tanggal Masuk belum diisi, isi manual)
          </label>
          <input
            id="tanggalSurveiManual"
            name="tanggalSurveiManual"
            type="date"
            required
            disabled={!dataLaporanTkpLengkap}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:w-56"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nomorLp" className="text-xs md:text-sm font-medium text-foreground">
          Nomor LP
        </label>
        <input
          id="nomorLp"
          name="nomorLp"
          required
          disabled={!dataLaporanTkpLengkap}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:w-80"
          placeholder="mis. 0400801/PP/SJR/032/01/2026"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alamatKorban" className="text-xs md:text-sm font-medium text-foreground">
          Alamat Korban
        </label>
        <Textarea
          id="alamatKorban"
          name="alamatKorban"
          required
          disabled={!dataLaporanTkpLengkap}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="uraianKesimpulan" className="text-xs md:text-sm font-medium text-foreground">
          Uraian dan Kesimpulan Hasil Survei
        </label>
        <Textarea
          id="uraianKesimpulan"
          name="uraianKesimpulan"
          required
          disabled={!dataLaporanTkpLengkap}
          rows={4}
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="namaSaksi" className="text-xs md:text-sm font-medium text-foreground">
          Nama Saksi
        </label>
        <input
          id="namaSaksi"
          name="namaSaksi"
          required
          disabled={!dataLaporanTkpLengkap}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:w-80"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ttdSaksi" className="text-xs md:text-sm font-medium text-foreground">
          Tanda Tangan Saksi (opsional, gambar atau PDF)
        </label>
        <input
          id="ttdSaksi"
          name="ttdSaksi"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          disabled={!dataLaporanTkpLengkap}
          className="text-xs text-foreground file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:text-xs file:font-medium file:text-foreground disabled:opacity-50 sm:w-80"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dataLaporanTkpLengkap || sedangProses}
          className="h-9 w-fit shrink-0 rounded-lg bg-primary px-4 text-sm md:text-base font-medium text-primary-foreground hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {sedangProses ? "Membuat..." : "Buat Laporan Survei TKP"}
        </button>

        {status && (
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm ${status.berhasil ? "text-status-safe" : "text-destructive"}`}>
              {status.pesan}
            </p>
            {status.berhasil && status.laporanId}
          </div>
        )}
      </div>
    </form>
  );
}
