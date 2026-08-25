"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const TAB_ITEMS = [
  { kunci: "gl", label: "Daftar GL" },
  { kunci: "catatan", label: "Catatan Tinjauan" },
] as const;

export type TabPeringatanKey = (typeof TAB_ITEMS)[number]["kunci"];

/**
 * Tab switcher untuk halaman Laporan Peringatan.
 * State tab dikelola lewat URL search param `tab` agar terpreservasi saat navigasi.
 */
export function TabPeringatan({
  tabAktif,
  children,
  slotCatatan,
}: {
  tabAktif: TabPeringatanKey;
  children: ReactNode;
  slotCatatan: ReactNode;
}) {
  const searchParams = useSearchParams();

  function buatUrlTab(tab: string): string {
    const params = new URLSearchParams(searchParams.toString());
    // Reset halaman saat pindah tab
    params.delete("halaman");
    params.delete("halaman_catatan");
    // Reset filter catatan saat pindah ke tab GL dan sebaliknya
    if (tab === "gl") {
      params.delete("tab");
      params.delete("cari_catatan");
      params.delete("label");
    } else {
      params.set("tab", tab);
      // Bersihkan filter GL yang tidak relevan di tab catatan
      params.delete("cari");
      params.delete("loket");
      params.delete("status_tinjauan");
      params.delete("dari");
      params.delete("sampai");
    }
    const qs = params.toString();
    return `/peringatan${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex border-b border-border">
        {TAB_ITEMS.map((item) => {
          const aktif = tabAktif === item.kunci;
          return (
            <Link
              key={item.kunci}
              href={buatUrlTab(item.kunci)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                aktif
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {aktif && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </div>

      {tabAktif === "gl" ? children : slotCatatan}
    </div>
  );
}
