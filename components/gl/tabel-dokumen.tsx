"use client";

import { Eye, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusKskk, hapusLaporanTkp } from "@/app/gl/[idJaminan]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogGagal } from "@/components/ui/form-aksi";
import type { StatusAksi } from "@/lib/aksi";
import { formatWaktu } from "@/lib/format";

export interface BarisDokumen {
  jenis: "Laporan Survei TKP" | "KSKK";
  key: string;
  label: string;
  waktu: Date;
  petugas: string | null;
  hrefLihat: string;
  hrefUnduh: string;
  /** null untuk KSKK (bukan tabel terpisah, lihat hapusKskk di actions.ts) */
  laporanId: number | null;
}

const TAUTAN_AKSI =
  "flex h-8 w-fit items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium whitespace-nowrap text-foreground hover:bg-muted";

function TombolHapusDokumen({
  idJaminan,
  baris,
  terkunci,
}: {
  idJaminan: string;
  baris: BarisDokumen;
  terkunci: boolean;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [pending, mulaiTransisi] = useTransition();

  if (terkunci) {
    return (
      <Button
        variant="destructive"
        size="sm"
        disabled
        title='GL ini sudah "Berkas Diajukan Ke Pusat" -- dokumen jadi bukti historis, tidak bisa dihapus. Pakai "Ganti berkas" untuk mengoreksi.'
      >
        <Trash2 />
        Hapus
      </Button>
    );
  }

  // Kegagalan (mis. dokumen sudah terkunci karena GL-nya sudah diajukan ke
  // pusat) ditampilkan sebagai pop-up, bukan dilempar -- lihat lib/aksi.ts.
  function konfirmasi() {
    mulaiTransisi(async () => {
      const formData = new FormData();
      formData.set("idJaminan", idJaminan);
      let hasil: StatusAksi;
      if (baris.laporanId !== null) {
        formData.set("id", String(baris.laporanId));
        hasil = await hapusLaporanTkp(undefined, formData);
      } else {
        hasil = await hapusKskk(undefined, formData);
      }
      setTerbuka(false);
      if (!hasil.berhasil) setPesanGagal(hasil.pesan);
    });
  }

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <Trash2 />
            Hapus
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus {baris.jenis} ini?</DialogTitle>
          <DialogDescription>
            &ldquo;{baris.label}&rdquo; akan dihapus permanen dan tidak bisa dipulihkan.
            {baris.jenis === "KSKK" && " Kolom Status Dokumen di Peringatan tidak terpengaruh (hanya cek Laporan Survei TKP)."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTerbuka(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={konfirmasi} disabled={pending}>
            {pending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <DialogGagal
        judul="Gagal Menghapus Dokumen"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
    </Dialog>
  );
}

// Menyatukan Laporan Survei TKP (bisa banyak, riwayat) dan KSKK (maks satu
// per GL) jadi satu tabel supaya petugas tidak perlu cek dua tempat terpisah
// -- kolom Jenis menandai dokumen mana yang mana. Lihat = PDF tampil inline
// di tab baru (rute API dengan ?unduh dihilangkan, lihat app/api/laporan-tkp
// dan app/api/kskk), Unduh = tetap force-download seperti sebelumnya.
export function TabelDokumen({
  idJaminan,
  daftar,
  terkunci,
}: {
  idJaminan: string;
  daftar: BarisDokumen[];
  /** true kalau GL sudah "Berkas Diajukan Ke Pusat"/"Berkas Selesai" -- dokumen tidak boleh dihapus lagi, cuma boleh diganti */
  terkunci: boolean;
}) {
  if (daftar.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-[760px] w-full text-xs sm:text-sm">
        <thead className="bg-surface-table-header">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
              Jenis
            </th>
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
              Dibuat/Diunggah pada
            </th>
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
              Label
            </th>
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
              Petugas
            </th>
            <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((b) => (
            <tr key={b.key} className="border-t border-border">
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Badge tone={b.jenis === "KSKK" ? "warn" : "info"}>{b.jenis}</Badge>
              </td>
              <td className="px-3 py-2.5 font-mono whitespace-nowrap text-xs md:text-sm">
                {formatWaktu(b.waktu)}
              </td>
              <td className="px-3 py-2.5 whitespace-normal wrap-break-words text-xs md:text-sm">
                {b.label}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-xs md:text-sm">{b.petugas ?? "-"}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <a href={b.hrefLihat} target="_blank" rel="noopener noreferrer" className={TAUTAN_AKSI}>
                    <Eye className="size-3.5" />
                    Lihat
                  </a>
                  <a href={b.hrefUnduh} className={TAUTAN_AKSI}>
                    Unduh
                  </a>
                  <TombolHapusDokumen idJaminan={idJaminan} baris={b} terkunci={terkunci} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
