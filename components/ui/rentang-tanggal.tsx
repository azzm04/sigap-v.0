"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTanggal } from "@/lib/format";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Sengaja mengikuti mockup: Minggu di kolom pertama, Senin dan Selasa
// sama-sama disingkat "Se" (bukan salah ketik).
const NAMA_HARI = ["Mi", "Se", "Se", "Ra", "Ka", "Ju", "Sa"];

function keIso(d: Date): string {
  const tahun = d.getFullYear();
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

function dariIso(iso: string): Date {
  const [tahun, bulan, hari] = iso.split("-").map(Number);
  return new Date(tahun, bulan - 1, hari);
}

function bangunGrid(bulanTampil: Date): Date[] {
  const tahun = bulanTampil.getFullYear();
  const bulan = bulanTampil.getMonth();
  const awalBulan = new Date(tahun, bulan, 1);
  const mulaiGrid = new Date(tahun, bulan, 1 - awalBulan.getDay());
  return Array.from(
    { length: 42 },
    (_, i) => new Date(mulaiGrid.getFullYear(), mulaiGrid.getMonth(), mulaiGrid.getDate() + i),
  );
}

export interface RentangTanggalProps {
  /** ISO "YYYY-MM-DD" */
  dari?: string;
  /** ISO "YYYY-MM-DD" */
  sampai?: string;
  onTerapkan: (dari: string | undefined, sampai: string | undefined) => void;
  className?: string;
}

export function RentangTanggal({ dari, sampai, onTerapkan, className }: RentangTanggalProps) {
  const [terbuka, setTerbuka] = useState(false);
  const [bulanTampil, setBulanTampil] = useState(() => (dari ? dariIso(dari) : new Date()));
  const [awal, setAwal] = useState<Date | null>(dari ? dariIso(dari) : null);
  const [akhir, setAkhir] = useState<Date | null>(sampai ? dariIso(sampai) : null);
  const [hover, setHover] = useState<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function tutupKalauDiLuar(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    }
    document.addEventListener("mousedown", tutupKalauDiLuar);
    return () => document.removeEventListener("mousedown", tutupKalauDiLuar);
  }, []);

  function buka() {
    const awalBaru = dari ? dariIso(dari) : null;
    const akhirBaru = sampai ? dariIso(sampai) : null;
    setAwal(awalBaru);
    setAkhir(akhirBaru);
    setHover(null);
    setBulanTampil(awalBaru ?? akhirBaru ?? new Date());
    setTerbuka(true);
  }

  function pilihTanggal(tgl: Date) {
    if (!awal || akhir) {
      setAwal(tgl);
      setAkhir(null);
      setHover(null);
      return;
    }
    let mulai = awal;
    let selesai = tgl;
    if (selesai < mulai) {
      [mulai, selesai] = [selesai, mulai];
    }
    setAwal(mulai);
    setAkhir(selesai);
    setHover(null);
    onTerapkan(keIso(mulai), keIso(selesai));
    setTerbuka(false);
  }

  function reset(e: React.MouseEvent) {
    e.stopPropagation();
    setAwal(null);
    setAkhir(null);
    setHover(null);
    onTerapkan(undefined, undefined);
    setTerbuka(false);
  }

  const grid = bangunGrid(bulanTampil);

  // Selama baru tanggal awal yang dipilih (akhir belum ada), tanggal yang
  // sedang di-hover dipakai sebagai pratinjau akhir sementara — supaya
  // petugas melihat rentang yang akan terbentuk sebelum benar-benar klik.
  let previewAwal: Date | null = null;
  let previewAkhir: Date | null = null;
  if (awal && akhir) {
    previewAwal = awal;
    previewAkhir = akhir;
  } else if (awal) {
    const acuan = hover ?? awal;
    previewAwal = awal < acuan ? awal : acuan;
    previewAkhir = awal < acuan ? acuan : awal;
  }

  const jumlahHari =
    previewAwal && previewAkhir
      ? Math.round((previewAkhir.getTime() - previewAwal.getTime()) / 86400000) + 1
      : null;
  const adaNilai = Boolean(dari && sampai);
  const labelTampil = dari && sampai ? `${formatTanggal(dari)} - ${formatTanggal(sampai)}` : "Pilih rentang tanggal";

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => (terbuka ? setTerbuka(false) : buka())}
        aria-label="Pilih rentang Tgl GL"
        className="flex h-8 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "flex-1 truncate text-left text-[11px]",
            adaNilai ? "font-mono" : "text-muted-foreground",
          )}
        >
          {labelTampil}
        </span>
        {adaNilai && (
          <X
            className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={reset}
          />
        )}
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {terbuka && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="bg-primary px-4 py-3 text-primary-foreground">
            <div className="text-xs opacity-80">
              {NAMA_BULAN[bulanTampil.getMonth()]} {bulanTampil.getFullYear()}
            </div>
            <div className="text-lg font-bold">
              {jumlahHari !== null ? `${jumlahHari} Hari` : "Pilih tanggal awal"}
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear(), bulanTampil.getMonth() - 1, 1))}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="w-20 text-center text-sm font-medium text-foreground">
                {NAMA_BULAN[bulanTampil.getMonth()]}
              </span>
              <button
                type="button"
                onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear(), bulanTampil.getMonth() + 1, 1))}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear() - 1, bulanTampil.getMonth(), 1))}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Tahun sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium text-foreground">
                {bulanTampil.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setBulanTampil(new Date(bulanTampil.getFullYear() + 1, bulanTampil.getMonth(), 1))}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Tahun berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 px-3 pb-1 text-center text-[11px] font-medium text-muted-foreground">
            {NAMA_HARI.map((h, i) => (
              <span key={i} className={i === 0 || i === 6 ? "text-status-late" : undefined}>
                {h}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 px-3 pb-3 text-center text-xs">
            {grid.map((tgl, i) => {
              const diBulanIni = tgl.getMonth() === bulanTampil.getMonth();
              const isoTgl = keIso(tgl);
              const isAwal = previewAwal ? isoTgl === keIso(previewAwal) : false;
              const isAkhir = previewAkhir ? isoTgl === keIso(previewAkhir) : false;
              const diDalamRentang = Boolean(
                previewAwal && previewAkhir && tgl > previewAwal && tgl < previewAkhir,
              );
              const weekend = i % 7 === 0 || i % 7 === 6;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pilihTanggal(tgl)}
                  onMouseEnter={() => {
                    if (awal && !akhir) setHover(tgl);
                  }}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "flex h-7 items-center justify-center rounded-full",
                    !diBulanIni && "text-muted-foreground/40",
                    diBulanIni && weekend && !isAwal && !isAkhir && "text-status-late",
                    diBulanIni && !weekend && !isAwal && !isAkhir && "text-foreground",
                    diDalamRentang && "rounded-none bg-accent-bright/25",
                    (isAwal || isAkhir) && "bg-accent-bright font-semibold text-white",
                  )}
                >
                  {tgl.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
