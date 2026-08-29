import Link from "next/link";
import { Eye } from "lucide-react";
import { FilterTaskForce, type NilaiFilterTaskForce } from "@/components/gl/filter-task-force";
import { PeringatanFooterHalaman } from "@/components/gl/peringatan-footer-halaman";
import { Badge } from "@/components/ui/badge";
import { formatTanggalOpsional } from "@/lib/format";
import type { HasilPeringatanTaskForce } from "@/lib/gl/peringatan-task-force";

function buatUrlHalaman(nilaiFilter: NilaiFilterTaskForce, ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  params.set("tab", "task-force");
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran_task_force", String(ukuran));
  params.set("halaman_task_force", String(halaman));
  return `/peringatan?${params.toString()}`;
}

// Tab "Kunjungan Rumah Sakit" -- Peringatan PIC Task Force (CLAUDE.md
// bagian 7), independen dari aturan Peringatan PIC Pengajuan di tab GL.
export function PeringatanTabTaskForce({
  hasil,
  nilaiFilter,
  opsiPicTaskForce,
}: {
  hasil: HasilPeringatanTaskForce;
  nilaiFilter: NilaiFilterTaskForce;
  opsiPicTaskForce: string[];
}) {
  const filterAktif = { tab: "task-force", ...nilaiFilter };

  return (
    <>
      <FilterTaskForce
        nilai={nilaiFilter}
        opsi={{ picTaskForce: opsiPicTaskForce }}
        ukuran={hasil.ukuran}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-table-header">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Korban</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Nomor ID Jaminan
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">
                Nama Rumah Sakit
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                PIC Task Force
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Loket
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tahapan
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tanggal Masuk
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap text-foreground">
                Umur (hari)
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">
                Data Belum Lengkap
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Status Tinjauan
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {hasil.baris.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  Tidak ada GL yang cocok dengan filter ini.
                </td>
              </tr>
            )}
            {hasil.baris.map((b) => (
              <tr
                key={b.idJaminan}
                className="border-t border-border border-l-[3px] border-l-status-late align-top transition-colors hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 whitespace-nowrap">{b.namaKorban}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Link
                    href={`/gl/${encodeURIComponent(b.tokenUrl)}?dari=peringatan`}
                    className="font-mono text-primary underline-offset-2 hover:underline"
                  >
                    {b.idJaminan}
                  </Link>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.namaRumahSakit ?? "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.picTaskForce ?? "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.loket}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge tone="info">{b.tahapan}</Badge>
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {formatTanggalOpsional(b.tanggalMasuk)}
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono font-bold text-status-late">
                      {b.umurSejakMasuk}
                    </span>
                    {b.sumberUmurTaskForce !== "tanggalMasuk" && (
                      <Badge
                        tone="neutral"
                        title={
                          b.sumberUmurTaskForce === "tglKejadian"
                            ? "Tanggal Masuk belum diisi PIC Task Force, dihitung dari Tgl LAKA (DASI) sebagai estimasi."
                            : "Tanggal Masuk dan Tgl LAKA (DASI) belum diisi, dihitung dari Tgl GL sebagai estimasi."
                        }
                      >
                        {b.sumberUmurTaskForce === "tglKejadian"
                          ? "berdasarkan Tgl LAKA"
                          : "berdasarkan Tgl GL"}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {!b.tanggalPulangPasien && (
                      <Badge tone="warn">Tanggal Pulang Pasien</Badge>
                    )}
                    {!b.lokasi && <Badge tone="warn">Lokasi LAKA</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge tone={b.sudahDitinjau ? "ok" : "neutral"}>
                    {b.sudahDitinjau ? "Sudah Ditinjau" : "Belum Ditinjau"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/gl/${encodeURIComponent(b.tokenUrl)}?dari=peringatan`}
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
        labelSatuan="GL menunggu kunjungan"
        buatUrl={(h) => buatUrlHalaman(nilaiFilter, hasil.ukuran, h)}
      />
    </>
  );
}
