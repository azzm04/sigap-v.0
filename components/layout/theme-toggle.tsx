"use client";

import { Moon, Sun } from "lucide-react";
import { useTransition } from "react";
import { alihkanTema } from "@/lib/tema";

export function ThemeToggle({ tema }: { tema: "light" | "dark" }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    document.documentElement.classList.toggle("dark");
    startTransition(async () => {
      await alihkanTema(tema);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={tema === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={tema === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
