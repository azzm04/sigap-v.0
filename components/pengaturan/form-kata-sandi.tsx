"use client";

import { useActionState } from "react";
import { type StatusKataSandi, ubahKataSandi } from "@/app/pengaturan/actions";

export function FormKataSandi() {
  const [status, formAction, sedangProses] = useActionState<
    StatusKataSandi | undefined,
    FormData
  >(ubahKataSandi, undefined);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-5">
      {/* Ganti max-w-md menjadi w-full */}
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sekarang"
            className="text-sm font-medium text-foreground"
          >
            Kata Sandi Saat Ini
          </label>
          <input
            id="sekarang"
            name="sekarang"
            type="password"
            required
            autoComplete="current-password"
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
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
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="konfirmasi"
            className="text-sm font-medium text-foreground"
          >
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            id="konfirmasi"
            name="konfirmasi"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {status && (
            <p
              className={`text-sm ${status.berhasil ? "text-status-safe" : "text-destructive"}`}
            >
              {status.pesan}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={sedangProses}
          className="h-10 w-full shrink-0 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
        >
          {sedangProses ? "Menyimpan..." : "Simpan Kata Sandi"}
        </button>
      </div>
    </form>
  );
}
