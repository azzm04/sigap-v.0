"use client";

import { useActionState } from "react";
import { type StatusKataSandi, ubahKataSandi } from "@/app/pengaturan/actions";

export function FormKataSandi() {
  const [status, formAction, sedangProses] = useActionState<StatusKataSandi | undefined, FormData>(
    ubahKataSandi,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sekarang" className="text-sm font-medium text-foreground">
            Kata Sandi Saat Ini
          </label>
          <input
            id="sekarang"
            name="sekarang"
            type="password"
            required
            autoComplete="current-password"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="baru" className="text-sm font-medium text-foreground">
            Kata Sandi Baru
          </label>
          <input
            id="baru"
            name="baru"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="konfirmasi" className="text-sm font-medium text-foreground">
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            id="konfirmasi"
            name="konfirmasi"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {status && (
          <p className={`text-sm ${status.berhasil ? "text-status-safe" : "text-destructive"}`}>
            {status.pesan}
          </p>
        )}
        <button
          type="submit"
          disabled={sedangProses}
          className="h-9 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {sedangProses ? "Menyimpan..." : "Simpan Kata Sandi"}
        </button>
      </div>
    </form>
  );
}
