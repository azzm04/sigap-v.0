"use client";

import { createContext, useContext, useState } from "react";

interface SidebarCtx {
  terbuka: boolean;
  buka: () => void;
  tutup: () => void;
  toggle: () => void;
}

const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [terbuka, setTerbuka] = useState(false);

  const value: SidebarCtx = {
    terbuka,
    buka: () => setTerbuka(true),
    tutup: () => setTerbuka(false),
    toggle: () => setTerbuka((v) => !v),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSidebar() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar dipakai di luar SidebarProvider");
  return ctx;
}
