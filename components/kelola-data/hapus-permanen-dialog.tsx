"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { hapusPermanenBatch } from "@/app/kelola-data/actions";
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

export function HapusPermanenDialog({
  dihapusPada,
  jumlahBaris,
}: {
  /** ISO string, dipakai sebagai kunci batch */
  dihapusPada: string;
  jumlahBaris: number;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [setuju, setSetuju] = useState(false);
  const [pending, mulaiTransisi] = useTransition();

  function konfirmasi() {
    mulaiTransisi(async () => {
      const formData = new FormData();
      formData.set("dihapusPada", dihapusPada);
      await hapusPermanenBatch(formData);
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
          <Button variant="destructive" size="sm">
            <Trash2 />
            Hapus Permanen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus batch ini secara permanen?</DialogTitle>
          <DialogDescription>
            {jumlahBaris.toLocaleString("id-ID")} baris beserta seluruh riwayat tahapan dan catatan
            tinjauannya akan dihapus permanen dari database. Tindakan ini tidak bisa dibatalkan —
            berbeda dari Pulihkan.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <Checkbox
            id={`setuju-hapus-permanen-${dihapusPada}`}
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
            label="Saya mengerti data ini tidak bisa dipulihkan lagi."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setTerbuka(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant="destructive" onClick={konfirmasi} disabled={!setuju || pending}>
            {pending ? "Menghapus..." : "Ya, Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
