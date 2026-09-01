"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

// Input file tunggal (bukan multi seperti dropzone Kelola Data) dengan tombol
// "x" untuk membatalkan pilihan SEBELUM form disubmit -- beda dari
// hapus/ganti berkas yang sudah tersimpan di database (itu action server
// terpisah, lihat tabel-dokumen.tsx). Browser tidak punya cara bawaan yang
// konsisten lintas browser untuk membatalkan pilihan file tunggal.
export function InputBerkas({
  id,
  name,
  accept,
  required,
  disabled,
  className,
}: {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [adaBerkas, setAdaBerkas] = useState(false);

  function batalkanBerkas() {
    if (inputRef.current) inputRef.current.value = "";
    setAdaBerkas(false);
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        onChange={(e) => setAdaBerkas(!!e.target.files?.length)}
        className={`min-w-0 shrink overflow-hidden ${className ?? ""}`}
      />
      {adaBerkas && !disabled && (
        <button
          type="button"
          onClick={batalkanBerkas}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Batalkan pilihan berkas"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
