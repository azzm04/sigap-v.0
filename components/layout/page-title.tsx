"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { labelHalamanAktif } from "./nav-items";

export function PageTitle({
  asalHref,
  akhir,
}: {
  /** Halaman asal kalau route ini bisa dibuka dari beberapa konteks (mis. Detail GL dari Papan Peringatan) */
  asalHref?: string;
  /** Segmen breadcrumb tambahan di akhir, mis. nama entitas pada halaman detail */
  akhir?: string;
}) {
  const pathname = usePathname();
  const label = labelHalamanAktif(pathname, asalHref);

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">Dashboard</span>
      <span className="shrink-0 text-muted-foreground">/</span>
      <span
        className={cn(
          "shrink-0",
          akhir ? "text-muted-foreground" : "font-semibold text-foreground",
        )}
      >
        {label}
      </span>
      {akhir && (
        <>
          <span className="shrink-0 text-muted-foreground">/</span>
          <span className="truncate font-semibold text-foreground">{akhir}</span>
        </>
      )}
    </div>
  );
}
