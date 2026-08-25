"use client";

import { FileText, Upload, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type StatusUnggah, unggahBerkas } from "@/app/kelola-data/actions";

export function FormUnggah() {
  const [status, formAction, sedangProses] = useActionState<StatusUnggah | undefined, FormData>(
    unggahBerkas,
    undefined,
  );
  const [berkas, setBerkas] = useState<File | null>(null);
  const [seretMasuk, setSeretMasuk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pilihBerkas(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBerkas(file);
    if (inputRef.current) inputRef.current.files = files;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setSeretMasuk(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setSeretMasuk(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSeretMasuk(false);
          pilihBerkas(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          seretMasuk ? "border-primary bg-primary/5" : "border-border-strong",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name="berkas"
          accept=".xlsx"
          required
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => pilihBerkas(e.target.files)}
        />
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-7" />
        </div>
        <h3 className="text-base font-medium text-foreground">Tarik dan lepas berkas di sini</h3>
        <p className="text-xs text-muted-foreground">
          Atau klik untuk memilih berkas JRCare / DASI (.xlsx)
        </p>
        <span className="pointer-events-none rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
          Pilih Berkas
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">{berkas?.name ?? "Tidak ada berkas terpilih"}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {berkas ? `Siap diunggah — ${(berkas.size / 1024 / 1024).toFixed(2)} MB` : "Siap untuk mengunggah..."}
            </p>
          </div>
        </div>
        {berkas && (
          <button
            type="button"
            onClick={() => {
              setBerkas(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Batalkan pilihan berkas"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={sedangProses}
        className="h-9 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {sedangProses ? "Memproses..." : "Unggah dan Impor"}
      </button>
      {status && (
        <p
          role="status"
          className={`text-sm ${status.berhasil ? "text-status-safe" : "text-destructive"}`}
        >
          {status.pesan}
        </p>
      )}
    </form>
  );
}
