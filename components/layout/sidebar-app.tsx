"use client";

import { LogOut, Shield, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { apakahNavAktif, NAV_ITEMS } from "./nav-items";
import { useSidebar } from "./sidebar-context";
import Image from "next/image";

export function SidebarApp({
  signOutAction,
  asalHref,
}: {
  signOutAction: () => Promise<void>;
  asalHref?: string;
}) {
  const pathname = usePathname();
  const { terbuka, tutup } = useSidebar();

  return (
    <>
      {/* Latar belakang gelap di mobile & tablet saat drawer terbuka */}
      {terbuka && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={tutup}
          aria-hidden="true"
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-8 transition-transform duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          terbuka ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
              <Image
                src="/logojr.png"
                alt="Logo SIGAP"
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-mono text-lg font-extrabold tracking-wide text-primary">
                GLTRACKER
              </h1>
              <p className="text-xs text-muted-foreground">Monitoring GL</p>
            </div>
          </div>
          <button
            type="button"
            onClick={tutup}
            aria-label="Tutup menu navigasi"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const aktif = apakahNavAktif(pathname, item, asalHref);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={tutup}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  aktif
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-border pt-4">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="size-5" />
              Keluar
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
