"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StatusAksi } from "@/lib/aksi";

/**
 * Form yang kegagalannya tampil sebagai pop-up, bukan layar galat mentah
 * Next.js. Dipakai untuk semua form yang memanggil Server Action yang bisa
 * ditolak karena kesalahan isian petugas -- lihat lib/aksi.ts.
 *
 * Kolom-kolomnya dioper sebagai children biasa (bukan render prop) supaya
 * komponen server tetap bisa memakainya: React tidak mengizinkan komponen
 * server mengoper fungsi ke komponen klien. Konsekuensinya tombol submit
 * dirender DI SINI, bukan di children, karena cuma tombol itu yang butuh
 * tahu status "sedang mengirim".
 */
export function FormAksi({
  action,
  labelTombol,
  ikonTombol,
  labelTombolProses = "Menyimpan...",
  judulGagal = "Tidak Bisa Diproses",
  children,
  className,
  kelasTombol,
  kelasBarisTombol,
  tombolDinonaktifkan = false,
}: {
  action: (sebelumnya: StatusAksi | undefined, formData: FormData) => Promise<StatusAksi>;
  labelTombol: string;
  /** Ikon di kiri label tombol, mis. <RotateCcw /> */
  ikonTombol?: React.ReactNode;
  labelTombolProses?: string;
  /** Judul pop-up saat gagal -- buat spesifik supaya petugas tahu form mana yang ditolak */
  judulGagal?: string;
  children?: React.ReactNode;
  className?: string;
  kelasTombol?: string;
  /** Pembungkus tombol, dipakai kalau tombolnya perlu sejajar dengan kolom di atasnya */
  kelasBarisTombol?: string;
  tombolDinonaktifkan?: boolean;
}) {
  const [status, formAction, sedangProses] = useActionState<StatusAksi | undefined, FormData>(
    async (sebelumnya, formData) => action(sebelumnya, formData),
    undefined,
  );

  // Dialog ditutup lewat state lokal, bukan dengan mengubah `status` --
  // useActionState tidak menyediakan cara mengosongkan hasilnya. Reset tiap
  // kali ada hasil baru supaya kegagalan berikutnya tetap memunculkan
  // pop-up walau pesannya sama persis dengan yang barusan ditutup.
  const [tertutup, setTertutup] = useState(false);
  useEffect(() => {
    setTertutup(false);
  }, [status]);

  // Pop-up hanya untuk kegagalan. Keberhasilan cukup ditandai teks kecil --
  // dialog sukses memaksa petugas menutup jendela tiap kali menyimpan, dan
  // di form yang sering dipakai itu justru mengganggu.
  const pesanGagal = status && !status.berhasil && !tertutup ? status.pesan : null;

  return (
    <>
      <form action={formAction} className={className}>
        {children}
        <div className={kelasBarisTombol}>
          <Button type="submit" disabled={sedangProses || tombolDinonaktifkan} className={kelasTombol}>
            {!sedangProses && ikonTombol}
            {sedangProses ? labelTombolProses : labelTombol}
          </Button>
        </div>
        {status?.berhasil && status.pesan && (
          <p aria-live="polite" className="w-full text-sm leading-relaxed text-status-safe">
            {status.pesan}
          </p>
        )}
      </form>

      <DialogGagal judul={judulGagal} pesan={pesanGagal} onTutup={() => setTertutup(true)} />
    </>
  );
}

/**
 * Pop-up kegagalan untuk aksi yang TIDAK berbentuk form -- tombol hapus,
 * tombol pulihkan, dan sejenisnya yang memanggil Server Action langsung
 * lewat useTransition. Kuncinya pada `pesan`: dialog terbuka selama pesan
 * ada, dan ditutup dengan mengosongkannya lewat onTutup.
 */
export function DialogGagal({
  judul = "Tidak Bisa Diproses",
  pesan,
  onTutup,
}: {
  judul?: string;
  pesan: string | null;
  onTutup?: () => void;
}) {
  return (
    <Dialog
      open={!!pesan}
      onOpenChange={(terbuka) => {
        if (!terbuka) onTutup?.();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{pesan}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onTutup?.()}>Mengerti</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
