"use client";

import { useActionState } from "react";
import { type StatusUnggah, unggahBerkas } from "./actions";

export function FormUnggah() {
  const [status, formAction, sedangProses] = useActionState<StatusUnggah | undefined, FormData>(
    unggahBerkas,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="file"
        name="berkas"
        accept=".xlsx"
        required
        className="text-sm text-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium hover:file:bg-muted"
      />
      <button
        type="submit"
        disabled={sedangProses}
        className="h-9 w-fit rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
      >
        {sedangProses ? "Memproses..." : "Unggah dan Impor"}
      </button>
      {status && (
        <p
          role="status"
          className={`text-sm ${status.berhasil ? "text-green-600" : "text-destructive"}`}
        >
          {status.pesan}
        </p>
      )}
    </form>
  );
}
