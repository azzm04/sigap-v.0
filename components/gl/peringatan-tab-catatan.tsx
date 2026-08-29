import Link from "next/link";
import { Eye } from "lucide-react";
import { FilterCatatan, type NilaiFilterCatatan } from "@/components/gl/filter-catatan";
import { PeringatanFooterHalaman } from "@/components/gl/peringatan-footer-halaman";
import { Badge } from "@/components/ui/badge";
import { formatWaktu } from "@/lib/format";
import type { HasilSemuaTinjauan } from "@/lib/gl/semua-tinjauan";

function buatUrlHalaman(nilaiFilter: NilaiFilterCatatan, ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  params.set("tab", "catatan");
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran_catatan", String(ukuran));
  params.set("halaman_catatan", String(halaman));
  return `/peringatan?${params.toString()}`;
}

// Tab "Catatan" -- seluruh riwayat tinjauan (termasuk yang diabaikan),
// lintas semua GL, bukan cuma yang sedang lewat ambang hari.
export function PeringatanTabCatatan({
  hasil,
  nilaiFilter,
}: {
  hasil: HasilSemuaTinjauan;
  nilaiFilter: NilaiFilterCatatan;
}) {
  const filterAktif = { tab: "catatan", ...nilaiFilter };

  return (
    <>
      <FilterCatatan nilai={nilaiFilter} ukuran={hasil.ukuran} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-table-header">
            <tr>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Petugas
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Waktu
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Nama Korban
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Nomor ID Jaminan
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Label / Status
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Catatan</th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.baris.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada catatan tinjauan yang sesuai filter.
                </td>
              </tr>
            )}
            {hasil.baris.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border align-top transition-colors hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 font-medium whitespace-nowrap text-foreground">
                  {c.namaPengguna}
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap text-muted-foreground">
                  {formatWaktu(c.ditinjauPada)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{c.namaKorban}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Link
                    href={`/gl/${encodeURIComponent(c.tokenUrl)}?dari=peringatan`}
                    className="font-mono text-primary underline-offset-2 hover:underline"
                  >
                    {c.idJaminan}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {!c.diabaikan && !c.perluTindakLanjut && (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {c.diabaikan && <Badge tone="danger">Diabaikan</Badge>}
                    {c.perluTindakLanjut && <Badge tone="info">Perlu tindak lanjut</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2.5 min-w-[320px] max-w-[560px] whitespace-normal break-words leading-relaxed text-foreground">
                  {c.catatan}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/gl/${encodeURIComponent(c.tokenUrl)}?dari=peringatan`}
                    className="flex h-8 w-fit items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium whitespace-nowrap text-foreground hover:bg-muted"
                  >
                    <Eye className="size-3.5" />
                    Detail GL
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PeringatanFooterHalaman
        ukuran={hasil.ukuran}
        total={hasil.total}
        halaman={hasil.halaman}
        totalHalaman={hasil.totalHalaman}
        filterAktif={filterAktif}
        labelSatuan="catatan ditemukan"
        buatUrl={(h) => buatUrlHalaman(nilaiFilter, hasil.ukuran, h)}
      />
    </>
  );
}
