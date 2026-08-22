"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { apakahMasukPeringatan } from "@/lib/gl/aturan-peringatan";
import type { BarisDaftarGL } from "@/lib/gl/queries";

export interface BarisTabelGL extends BarisDaftarGL {
  umurHari: number;
}

const KOLOM_RATA_KANAN = new Set(["jumlahPembayaran"]);

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

function kolomTabelGL(): ColumnDef<BarisTabelGL>[] {
  return [
    { accessorKey: "tipeKlaim", header: "Tipe Klaim" },
    { accessorKey: "tipeCidera", header: "Tipe Cidera" },
    {
      accessorKey: "namaRumahSakit",
      header: "Nama Rumah Sakit",
      cell: (info) => info.getValue<string | null>() ?? "-",
    },
    { accessorKey: "loket", header: "Loket" },
    {
      accessorKey: "idJaminan",
      header: "Nomor ID Jaminan",
      cell: (info) => {
        const b = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/gl/${encodeURIComponent(b.idJaminan)}`}
              className="font-mono text-primary underline-offset-2 hover:underline"
            >
              {b.idJaminan}
            </Link>
            {b.statusVerifikasi && (
              <Badge tone={b.statusVerifikasi === "Verified" ? "ok" : "neutral"}>
                {b.statusVerifikasi}
              </Badge>
            )}
          </div>
        );
      },
    },
    { accessorKey: "namaKorban", header: "Nama Korban" },
    {
      accessorKey: "nomorSuratJaminan",
      header: "Nomor Surat Jaminan",
      cell: (info) => <span className="font-mono">{info.getValue<string | null>() ?? "-"}</span>,
    },
    {
      accessorKey: "tglGl",
      header: "Tgl GL",
      cell: (info) => <span className="font-mono">{formatTanggal(info.getValue<string>())}</span>,
    },
    {
      accessorKey: "glStatus",
      header: "GL Status",
      cell: (info) => {
        const status = info.getValue<string>();
        return <Badge tone={status === "Active" ? "ok" : "danger"}>{status}</Badge>;
      },
    },
    {
      accessorKey: "tahapan",
      header: "Tahapan",
      cell: (info) => <Badge tone="info">{info.getValue<string>()}</Badge>,
    },
    {
      accessorKey: "statusPembayaran",
      header: "Status Pembayaran",
      cell: (info) => {
        const status = info.getValue<string>();
        return <Badge tone={status === "Paid" ? "solidOk" : "warn"} pill={status === "Paid"}>{status}</Badge>;
      },
    },
    {
      accessorKey: "jumlahPembayaran",
      header: "Jumlah Pembayaran",
      cell: (info) => <span className="font-mono">{formatRupiah(info.getValue<number>())}</span>,
    },
    {
      accessorKey: "tglPembayaran",
      header: "Tgl Pembayaran",
      cell: (info) => (
        <span className="font-mono">{formatTanggalOpsional(info.getValue<string | null>())}</span>
      ),
    },
  ];
}

export function TabelGL({
  data,
  ambangHari,
  className,
}: {
  data: BarisTabelGL[];
  ambangHari: number;
  className?: string;
}) {
  const kolom = kolomTabelGL();
  const table = useReactTable({
    data,
    columns: kolom,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-card", className)}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-surface-table-header">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-3 py-2.5 font-semibold whitespace-nowrap text-foreground",
                    KOLOM_RATA_KANAN.has(header.column.id) ? "text-right" : "text-left",
                  )}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={kolom.length} className="px-3 py-8 text-center text-muted-foreground">
                Tidak ada GL yang cocok dengan filter ini.
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => {
            const alert = apakahMasukPeringatan(row.original, ambangHari);
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-t border-border transition-colors hover:bg-muted/40",
                  alert && "border-l-[3px] border-l-status-late",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-3 py-2.5 whitespace-nowrap",
                      KOLOM_RATA_KANAN.has(cell.column.id) && "text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
