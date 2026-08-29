"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { sinkronSheets } from "@/app/kelola-data/actions";
import { Button } from "@/components/ui/button";

export function SinkronSheetsButton() {
  const [pending, mulaiTransisi] = useTransition();
  const [pesan, setPesan] = useState<{ berhasil: boolean; teks: string } | null>(null);

  function jalankan() {
    mulaiTransisi(async () => {
      const hasil = await sinkronSheets();
      setPesan({ berhasil: hasil.berhasil, teks: hasil.pesan });
    });
  }

  return (
    <div className="flex flex-col not-user-invalid:items-end gap-1.5">
      <Button variant="outline" onClick={jalankan} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Menyinkron..." : "Sinkronkan dengan Google Sheets"}
      </Button>
      {pesan && (
        <p
          role="status"
          className={`max-w-xs text-right text-xs leading-relaxed ${
            pesan.berhasil ? "text-status-safe" : "text-destructive"
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </div>
  );
}
