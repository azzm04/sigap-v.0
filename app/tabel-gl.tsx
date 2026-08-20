"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { formatRupiah, formatTanggal } from "@/lib/format";
import type { BarisDaftarGL } from "@/lib/gl/queries";

export interface BarisTabelGL extends BarisDaftarGL {
  umurHari: number;
}

const kolom: ColumnDef<BarisTabelGL>[] = [
  { accessorKey: "loket", header: "Loket" },
  {
    accessorKey: "idJaminan",
    header: "Nomor ID Jaminan",
    cell: (info) => (
      <Link
        href={`/gl/${encodeURIComponent(info.getValue<string>())}`}
        className="text-primary underline-offset-2 hover:underline"
      >
        {info.getValue<string>()}
      </Link>
    ),
  },
  { accessorKey: "namaKorban", header: "Nama Korban" },
  {
    accessorKey: "namaRumahSakit",
    header: "Nama Rumah Sakit",
    cell: (info) => info.getValue<string | null>() ?? "-",
  },
  {
    accessorKey: "tglGl",
    header: "Tgl GL",
    cell: (info) => formatTanggal(info.getValue<string>()),
  },
  { accessorKey: "umurHari", header: "Umur (hari)" },
  { accessorKey: "tahapan", header: "Tahapan" },
  { accessorKey: "glStatus", header: "Status GL" },
  { accessorKey: "statusPembayaran", header: "Status Pembayaran" },
  {
    accessorKey: "nilaiDiajukan",
    header: "Nilai Diajukan",
    cell: (info) => formatRupiah(info.getValue<number>()),
  },
  {
    accessorKey: "nilaiDisetujui",
    header: "Nilai Disetujui",
    cell: (info) => formatRupiah(info.getValue<number>()),
  },
];

export function TabelGL({ data }: { data: BarisTabelGL[] }) {
  const table = useReactTable({
    data,
    columns: kolom,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground"
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
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
