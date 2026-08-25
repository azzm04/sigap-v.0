"use client";

import { CircleCheck, CircleX, FileText, Upload, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type StatusUnggah, unggahBerkas } from "@/app/kelola-data/actions";

function sinkronkanInput(inputEl: HTMLInputElement | null, files: File[]) {
  if (!inputEl) return;
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  inputEl.files = dt.files;
}

export function FormUnggah() {
  const [status, formAction, sedangProses] = useActionState<StatusUnggah | undefined, FormData>(
    unggahBerkas,
    undefined,
  );
  const [berkasList, setBerkasList] = useState<File[]>([]);
  const [seretMasuk, setSeretMasuk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function tambahBerkas(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBerkasList((sebelumnya) => {
      const gabungan = [...sebelumnya, ...Array.from(files)];
      sinkronkanInput(inputRef.current, gabungan);
      return gabungan;
    });
  }

  function hapusBerkas(index: number) {
    setBerkasList((sebelumnya) => {
      const sisa = sebelumnya.filter((_, i) => i !== index);
      sinkronkanInput(inputRef.current, sisa);
      return sisa;
    });
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
          tambahBerkas(e.dataTransfer.files);
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
          accept=".xlsx,.csv"
          multiple
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            tambahBerkas(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-7" />
        </div>
        <h3 className="text-base font-medium text-foreground">Tarik dan lepas berkas di sini</h3>
        <p className="text-xs text-muted-foreground">
          Atau klik untuk memilih satu atau beberapa berkas JRCare / DASI (.xlsx atau .csv)
        </p>
        <span className="pointer-events-none rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
          Pilih Berkas
        </span>
      </div>

      {berkasList.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <FileText className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada berkas terpilih</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {berkasList.map((berkas, index) => (
            <div
              key={`${berkas.name}-${berkas.size}-${index}`}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{berkas.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Siap diunggah — {(berkas.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => hapusBerkas(index)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Batalkan pilihan berkas ${berkas.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={sedangProses || berkasList.length === 0}
        className="h-9 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {sedangProses
          ? "Memproses..."
          : berkasList.length > 1
            ? `Unggah dan Impor (${berkasList.length} berkas)`
            : "Unggah dan Impor"}
      </button>

      {status && (
        <div className="flex flex-col gap-1.5">
          {status.hasil.map((h, index) => (
            <div
              key={`${h.namaBerkas}-${index}`}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                h.berhasil
                  ? "border-status-safe/30 bg-status-safe-bg text-status-safe"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              {h.berhasil ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{h.namaBerkas}</p>
                <p className="break-words opacity-90">{h.pesan}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
