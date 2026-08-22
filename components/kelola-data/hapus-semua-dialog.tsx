"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusSemuaData } from "@/app/kelola-data/actions";
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

export function HapusSemuaDialog({ totalBaris }: { totalBaris: number }) {
  const [terbuka, setTerbuka] = useState(false);
  const [setuju, setSetuju] = useState(false);
  const [pending, mulaiTransisi] = useTransition();

  function konfirmasi() {
    mulaiTransisi(async () => {
      await hapusSemuaData();
      setTerbuka(false);
      setSetuju(false);
    });
  }

  return (
    <Dialog
      open={terbuka}
      onOpenChange={(nilai) => {
        setTerbuka(nilai);
        if (!nilai) setSetuju(false);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="destructive" disabled={totalBaris === 0}>
            <Trash2 />
            Hapus Semua Data
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus semua data GL?</DialogTitle>
          <DialogDescription>
            {totalBaris.toLocaleString("id-ID")} baris akan disembunyikan dari Monitoring, Peringatan, dan
            Sebaran. Data tidak dihapus permanen — masih bisa dipulihkan lewat halaman Sampah.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <Checkbox
            id="setuju-hapus"
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
            label="Saya mengerti dan tetap ingin melanjutkan."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setTerbuka(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={konfirmasi} disabled={!setuju || pending}>
            {pending ? "Menghapus..." : "Ya, Hapus Semua Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
