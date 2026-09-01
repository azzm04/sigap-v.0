"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusTinjauan, perbaruiTinjauan } from "@/app/gl/[idJaminan]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";

export function AksiCatatan({
  id,
  idJaminan,
  catatanAwal,
  perluTindakLanjutAwal,
  diabaikan,
}: {
  id: number;
  idJaminan: string;
  catatanAwal: string;
  perluTindakLanjutAwal: boolean;
  diabaikan: boolean;
}) {
  const [editTerbuka, setEditTerbuka] = useState(false);
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [catatan, setCatatan] = useState(catatanAwal);
  const [perluTindakLanjut, setPerluTindakLanjut] = useState(perluTindakLanjutAwal);
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [pending, mulaiTransisi] = useTransition();

  function simpanEdit() {
    if (!catatan.trim()) return;
    mulaiTransisi(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      formData.set("idJaminan", idJaminan);
      formData.set("catatan", catatan.trim());
      if (perluTindakLanjut) formData.set("perluTindakLanjut", "on");
      const hasil = await perbaruiTinjauan(undefined, formData);
      setEditTerbuka(false);
      if (!hasil.berhasil) setPesanGagal(hasil.pesan);
    });
  }

  function konfirmasiHapus() {
    mulaiTransisi(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      formData.set("idJaminan", idJaminan);
      const hasil = await hapusTinjauan(undefined, formData);
      setHapusTerbuka(false);
      if (!hasil.berhasil) setPesanGagal(hasil.pesan);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <DialogGagal
        judul="Gagal Memproses Catatan"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
      <Dialog
        open={editTerbuka}
        onOpenChange={(nilai) => {
          setEditTerbuka(nilai);
          if (nilai) {
            setCatatan(catatanAwal);
            setPerluTindakLanjut(perluTindakLanjutAwal);
          }
        }}
      >
        <DialogTrigger
          render={
            <Button variant="outline" size="sm">
              <Pencil />
              Edit
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Catatan Tinjauan</DialogTitle>
            <DialogDescription>
              Perbaiki isi catatan kalau ada salah ketik.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-3">
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={4}
            />
            <Checkbox
              checked={perluTindakLanjut}
              onChange={(e) => setPerluTindakLanjut(e.target.checked)}
              label="Perlu tindak lanjut"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTerbuka(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={simpanEdit} disabled={pending || !catatan.trim()}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hapusTerbuka} onOpenChange={setHapusTerbuka}>
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
            <DialogTitle>Hapus catatan ini?</DialogTitle>
            <DialogDescription>
              Catatan tinjauan ini akan dihapus permanen dan tidak bisa
              dipulihkan.
              {diabaikan && (
                <>
                  {" "}
                  Catatan ini juga yang menyingkirkan GL ini dari papan
                  peringatan secara permanen — setelah dihapus, GL bisa
                  muncul lagi di peringatan kalau impor berikutnya masih
                  mencatatnya Unpaid.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHapusTerbuka(false)} disabled={pending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={konfirmasiHapus} disabled={pending}>
              {pending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
