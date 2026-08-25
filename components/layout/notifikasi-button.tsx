"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTanggal } from "@/lib/format";
import type { BarisPeringatan } from "@/lib/gl/peringatan";

export function NotifikasiButton({
  items,
  total,
  sudahDilihatHariIni,
  tandaiDilihatAction,
}: {
  items: BarisPeringatan[];
  total: number;
  sudahDilihatHariIni: boolean;
  tandaiDilihatAction: () => Promise<void>;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const jumlah = total;

  // Munculin otomatis sekali di kunjungan pertama pada hari itu
  useEffect(() => {
    if (!sudahDilihatHariIni && jumlah > 0) {
      setTerbuka(true);
      void tandaiDilihatAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function tutupKalauDiLuar(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    }
    document.addEventListener("mousedown", tutupKalauDiLuar);
    return () => document.removeEventListener("mousedown", tutupKalauDiLuar);
  }, []);

  function toggle() {
    setTerbuka((sebelumnya) => {
      const selanjutnya = !sebelumnya;
      if (selanjutnya) void tandaiDilihatAction();
      return selanjutnya;
    });
  }

  const labelBadge = jumlah > 99 ? "99+" : String(jumlah);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={jumlah > 0 ? `${jumlah} GL perlu ditinjau` : "Tidak ada GL perlu ditinjau"}
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <Bell className="size-4" />
        {jumlah > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-late px-1 font-mono text-[10px] font-bold text-white">
            {labelBadge}
          </span>
        )}
      </button>

      {terbuka && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Perlu Ditinjau</span>
            <span className="font-mono text-xs text-muted-foreground">{jumlah} GL</span>
          </div>

          {jumlah === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada GL yang perlu ditinjau saat ini.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((b) => (
                <li key={b.idJaminan} className="border-b border-border last:border-0">
                  <Link
                    href={`/gl/${encodeURIComponent(b.tokenUrl)}?dari=peringatan`}
                    onClick={() => setTerbuka(false)}
                    className="flex flex-col gap-0.5 px-4 py-2.5 text-sm hover:bg-muted"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">{b.namaKorban}</span>
                      <span className="shrink-0 font-mono text-xs font-semibold text-status-late">
                        {b.umurHari} hari
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.tahapan} · {formatTanggal(b.tglGl)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/peringatan"
            onClick={() => setTerbuka(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted"
          >
            Lihat semua di Papan Peringatan
          </Link>
        </div>
      )}
    </div>
  );
}
