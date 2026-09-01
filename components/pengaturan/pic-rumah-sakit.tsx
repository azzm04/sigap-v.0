"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusPic, simpanPic } from "@/app/pengaturan/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogGagal } from "@/components/ui/form-aksi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BarisPicRumahSakit } from "@/lib/gl/pic";
import { BantuanInfo } from "../ui/bantuan-info";

function FormPic({
  awal,
  onSelesai,
  onBatal,
}: {
  awal?: BarisPicRumahSakit;
  onSelesai: () => void;
  onBatal: () => void;
}) {
  const [pending, mulaiTransisi] = useTransition();
  const [namaRumahSakit, setNamaRumahSakit] = useState(awal?.namaRumahSakit ?? "");
  const [picTaskForce, setPicTaskForce] = useState(awal?.picTaskForce ?? "");
  const [picPengajuan, setPicPengajuan] = useState(awal?.picPengajuan ?? "");
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);

  function simpan() {
    if (!namaRumahSakit.trim()) return;
    mulaiTransisi(async () => {
      const formData = new FormData();
      if (awal) formData.set("id", String(awal.id));
      formData.set("namaRumahSakit", namaRumahSakit.trim());
      formData.set("picTaskForce", picTaskForce.trim());
      formData.set("picPengajuan", picPengajuan.trim());
      const hasil = await simpanPic(undefined, formData);
      if (hasil.berhasil) onSelesai();
      else setPesanGagal(hasil.pesan);
    });
  }

  return (
    <>
      <DialogGagal
        judul="Gagal Menyimpan PIC"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="namaRumahSakit" required>
            Nama Rumah Sakit
          </Label>
          <Input
            id="namaRumahSakit"
            value={namaRumahSakit}
            onChange={(e) => setNamaRumahSakit(e.target.value)}
            placeholder="Harus persis sama dengan nama di berkas ekspor"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="picTaskForce">PIC Task Force</Label>
          <Input
            id="picTaskForce"
            value={picTaskForce}
            onChange={(e) => setPicTaskForce(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="picPengajuan">PIC Pengajuan</Label>
          <Input
            id="picPengajuan"
            value={picPengajuan}
            onChange={(e) => setPicPengajuan(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBatal} disabled={pending}>
          Batal
        </Button>
        <Button onClick={simpan} disabled={pending || !namaRumahSakit.trim()}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PicRumahSakit({ data }: { data: BarisPicRumahSakit[] }) {
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiedit, setSedangDiedit] = useState<BarisPicRumahSakit | undefined>(undefined);
  const [akanDihapus, setAkanDihapus] = useState<BarisPicRumahSakit | null>(null);
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [pendingHapus, mulaiTransisiHapus] = useTransition();

  function bukaTambah() {
    setSedangDiedit(undefined);
    setDialogTerbuka(true);
  }

  function bukaEdit(baris: BarisPicRumahSakit) {
    setSedangDiedit(baris);
    setDialogTerbuka(true);
  }

  function konfirmasiHapus() {
    if (!akanDihapus) return;
    mulaiTransisiHapus(async () => {
      const formData = new FormData();
      formData.set("id", String(akanDihapus.id));
      const hasil = await hapusPic(undefined, formData);
      setAkanDihapus(null);
      if (!hasil.berhasil) setPesanGagal(hasil.pesan);
    });
  }

  return (
    <>
      <DialogGagal
        judul="Gagal Menghapus PIC"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
    <Card
      title={
        <span className="inline-flex items-center gap-1.5">
        Pemetaan PIC Rumah Sakit
        <BantuanInfo>
          PIC Task Force mengunjungi rumah sakit dan mengecek status korban. PIC Pengajuan mengajukan GL yang sudah `Verifikasi User` ke DASI-JR. Nama Rumah Sakit harus persis sama (huruf besar/kecil tidak masalah) dengan yang muncul di berkas ekspor supaya PIC-nya ke-mapping otomatis di tabel GL.
        </BantuanInfo>
        </span>
      }
      actions={
        <Button size="sm" onClick={bukaTambah}>
          <Plus />
          Tambah Rumah Sakit
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-table-header">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Rumah Sakit</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                PIC Task Force
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                PIC Pengajuan
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada pemetaan PIC. Klik &quot;Tambah Rumah Sakit&quot; untuk mulai.
                </td>
              </tr>
            )}
            {data.map((b) => (
              <tr key={b.id} className="border-t border-border align-top">
                <td className="px-3 py-2.5 whitespace-normal break-words">{b.namaRumahSakit}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.picTaskForce ?? "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.picPengajuan ?? "-"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => bukaEdit(b)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setAkanDihapus(b)}>
                      <Trash2 />
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogTerbuka} onOpenChange={setDialogTerbuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sedangDiedit ? "Ubah" : "Tambah"} PIC Rumah Sakit</DialogTitle>
          </DialogHeader>
          <FormPic
            key={sedangDiedit?.id ?? "baru"}
            awal={sedangDiedit}
            onSelesai={() => setDialogTerbuka(false)}
            onBatal={() => setDialogTerbuka(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!akanDihapus} onOpenChange={(nilai) => !nilai && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pemetaan PIC ini?</DialogTitle>
            <DialogDescription>
              Nama PIC untuk &quot;{akanDihapus?.namaRumahSakit}&quot; akan berhenti muncul di tabel
              GL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAkanDihapus(null)} disabled={pendingHapus}>
              Batal
            </Button>
            <Button variant="destructive" onClick={konfirmasiHapus} disabled={pendingHapus}>
              {pendingHapus ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </>
  );
}
