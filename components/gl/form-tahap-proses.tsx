"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { catatTahapProses, type StatusTahapProses } from "@/app/gl/[idJaminan]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

// Gagal (termasuk "Dokumen Belum Lengkap" -- syarat Laporan Survei TKP +
// KSKK untuk tahap "Berkas Diajukan Ke Pusat", lihat catatTahapProses di
// actions.ts) ditampilkan sebagai pop-up modal, BUKAN error mentah/diam --
// arahan pemilik proyek supaya petugas tidak bisa mencatat tahap itu tanpa
// sadar dokumennya belum lengkap.
//
// Memilih TAHAP_PEMICU_PAID ("Berkas Selesai") dicegat dulu dengan pop-up
// KONFIRMASI (bukan error) sebelum benar-benar submit -- konsekuensinya
// besar (auto-Paid, auto-Done, terkunci permanen dari Peringatan lewat
// tandaiBerkasSelesai() di lib/gl/tahap-proses.ts), jadi petugas harus
// sadar dulu sebelum benar-benar mengirim, bukan cuma pilih dropdown lalu
// klik submit seperti tahap lain.
export function FormTahapProses({
  idJaminan,
  pilihanTahapProses,
  tahapPemicuPaid,
}: {
  idJaminan: string;
  pilihanTahapProses: string[];
  /** Nilai persis TAHAP_PEMICU_PAID (lib/gl/tahap-proses.ts) -- diteruskan
   * sebagai prop dari server component (bukan diimpor langsung di sini),
   * karena modul itu juga mengimpor db/postgres yang tidak boleh masuk ke
   * bundel client. */
  tahapPemicuPaid: string;
}) {
  const [status, formAction, sedangProses] = useActionState<StatusTahapProses | undefined, FormData>(
    catatTahapProses,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);
  const [tahapDipilih, setTahapDipilih] = useState("");

  useEffect(() => {
    if (!status) return;
    if (status.berhasil) {
      formRef.current?.reset();
      setTahapDipilih("");
    } else {
      setDialogTerbuka(true);
    }
  }, [status]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (tahapDipilih === tahapPemicuPaid) {
      e.preventDefault();
      setKonfirmasiTerbuka(true);
    }
  }

  function konfirmasiSelesai() {
    setKonfirmasiTerbuka(false);
    if (formRef.current) {
      formAction(new FormData(formRef.current));
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="idJaminan" value={idJaminan} />
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="tahap" className="text-xs md:text-sm font-medium text-foreground">
            Tahap
          </label>
          <Select
            id="tahap"
            name="tahap"
            required
            placeholder="Pilih tahap..."
            options={pilihanTahapProses}
            className="w-full"
            value={tahapDipilih}
            onChange={(e) => setTahapDipilih(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={sedangProses}
          className="h-8 w-fit shrink-0 rounded-lg bg-primary px-4 text-sm md:text-base font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {sedangProses ? "Menyimpan..." : "Catat Tahap Ini"}
        </button>
      </form>

      <Dialog open={konfirmasiTerbuka} onOpenChange={setKonfirmasiTerbuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Berkas Selesai</DialogTitle>
            <DialogDescription>
              GL ini akan ditandai &quot;Berkas Selesai&quot; — Status Pembayaran otomatis
              menjadi Paid, Tahapan JRCare ditandai Done, dan GL ini terkunci permanen dari
              Papan Peringatan. Yakin sudah benar-benar selesai?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKonfirmasiTerbuka(false)}>
              Batal
            </Button>
            <Button onClick={konfirmasiSelesai}>Ya, Sudah Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTerbuka} onOpenChange={setDialogTerbuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gagal Mencatat Tahap</DialogTitle>
            <DialogDescription>{status?.pesan}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDialogTerbuka(false)}>Mengerti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
