"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusLoket, simpanLoket } from "@/app/pengaturan/actions";
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
import type { BarisLoketPelimpahan } from "@/lib/gl/loket-pelimpahan";
import { BantuanInfo } from "../ui/bantuan-info";

function FormLoket({
  awal,
  onSelesai,
  onBatal,
}: {
  awal?: BarisLoketPelimpahan;
  onSelesai: () => void;
  onBatal: () => void;
}) {
  const [pending, mulaiTransisi] = useTransition();
  const [nama, setNama] = useState(awal?.nama ?? "");
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);

  function simpan() {
    if (!nama.trim()) return;
    mulaiTransisi(async () => {
      const formData = new FormData();
      if (awal) formData.set("id", String(awal.id));
      formData.set("nama", nama.trim());
      const hasil = await simpanLoket(undefined, formData);
      if (hasil.berhasil) onSelesai();
      else setPesanGagal(hasil.pesan);
    });
  }

  return (
    <>
      <DialogGagal
        judul="Gagal Menyimpan Loket"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="namaLoket" required>
            Nama Loket
          </Label>
          <Input
            id="namaLoket"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: LOKET KANTOR CABANG PEKALONGAN"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBatal} disabled={pending}>
          Batal
        </Button>
        <Button onClick={simpan} disabled={pending || !nama.trim()}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function LoketPelimpahan({ data }: { data: BarisLoketPelimpahan[] }) {
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiedit, setSedangDiedit] = useState<BarisLoketPelimpahan | undefined>(undefined);
  const [akanDihapus, setAkanDihapus] = useState<BarisLoketPelimpahan | null>(null);
  const [pesanGagal, setPesanGagal] = useState<string | null>(null);
  const [pendingHapus, mulaiTransisiHapus] = useTransition();

  function bukaTambah() {
    setSedangDiedit(undefined);
    setDialogTerbuka(true);
  }

  function bukaEdit(baris: BarisLoketPelimpahan) {
    setSedangDiedit(baris);
    setDialogTerbuka(true);
  }

  function konfirmasiHapus() {
    if (!akanDihapus) return;
    mulaiTransisiHapus(async () => {
      const formData = new FormData();
      formData.set("id", String(akanDihapus.id));
      const hasil = await hapusLoket(undefined, formData);
      setAkanDihapus(null);
      if (!hasil.berhasil) setPesanGagal(hasil.pesan);
    });
  }

  return (
    <>
      <DialogGagal
        judul="Gagal Menghapus Loket"
        pesan={pesanGagal}
        onTutup={() => setPesanGagal(null)}
      />
      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            Loket Tujuan Pelimpahan
            <BantuanInfo>
              Daftar loket cabang yang muncul sebagai pilihan saat petugas mencatat tahap
              &quot;Berkas Belum Di Limpah&quot; di halaman detail GL, dan sebagai filter di halaman
              Pelimpahan. Tambah, ubah, atau hapus loket di sini -- tidak perlu mengubah kode.
            </BantuanInfo>
          </span>
        }
        actions={
          <Button size="sm" onClick={bukaTambah}>
            <Plus />
            Tambah Loket
          </Button>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-table-header">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Loket</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-muted-foreground">
                    Belum ada loket pelimpahan. Klik &quot;Tambah Loket&quot; untuk mulai.
                  </td>
                </tr>
              )}
              {data.map((b) => (
                <tr key={b.id} className="border-t border-border align-top">
                  <td className="px-3 py-2.5 whitespace-normal break-words">{b.nama}</td>
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
              <DialogTitle>{sedangDiedit ? "Ubah" : "Tambah"} Loket Pelimpahan</DialogTitle>
            </DialogHeader>
            <FormLoket
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
              <DialogTitle>Hapus loket ini?</DialogTitle>
              <DialogDescription>
                &quot;{akanDihapus?.nama}&quot; tidak akan muncul lagi sebagai pilihan loket tujuan
                pelimpahan.
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
