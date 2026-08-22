"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export function HamburgerButton() {
  const { toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Buka menu navigasi"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted lg:hidden"
    >
      <Menu className="size-5" />
    </button>
  );
}
