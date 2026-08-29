import Link from "next/link";
import { Eye } from "lucide-react";
import { FilterPeringatan, type NilaiFilterPeringatan } from "@/components/gl/filter-peringatan";
import { PeringatanFooterHalaman } from "@/components/gl/peringatan-footer-halaman";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatTanggal, formatTanggalOpsional } from "@/lib/format";
import type { BarisPeringatan } from "@/lib/gl/peringatan";

function buatUrlHalaman(nilaiFilter: NilaiFilterPeringatan, ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran", String(ukuran));
  params.set("halaman", String(halaman));
  return `/peringatan?${params.toString()}`;
}

// Tab "Daftar GL" -- Peringatan PIC Pengajuan (CLAUDE.md bagian 7).
export function PeringatanTabGL({
  baris,
  total,
  ukuran,
  halaman,
  totalHalaman,
  nilaiFilter,
  opsiPicPengajuan,
}: {
  baris: BarisPeringatan[];
  total: number;
  ukuran: number;
  halaman: number;
  totalHalaman: number;
  nilaiFilter: NilaiFilterPeringatan;
  opsiPicPengajuan: string[];
}) {
  return (
    <>
      <FilterPeringatan
        nilai={nilaiFilter}
        opsi={{ picPengajuan: opsiPicPengajuan }}
        ukuran={ukuran}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-table-header">
            <tr>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tipe Klaim
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tipe Cidera
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">
                Nama Rumah Sakit
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                PIC Pengajuan
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Loket
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Nomor ID Jaminan
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Korban</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Nomor Surat Jaminan
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tgl GL
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tgl LAKA (DASI)
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Lokasi (DASI)</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                GL Status
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Tahapan</th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Status Pembayaran
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Jumlah Pembayaran
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Tgl Pembayaran
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap text-foreground">
                Umur (hari)
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap text-foreground">
                Umur Pengajuan
              </th>
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                Status Dokumen
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {baris.length === 0 && (
              <tr>
                <td colSpan={21} className="px-3 py-8 text-center text-muted-foreground">
                  Tidak ada GL yang cocok dengan filter ini.
                </td>
              </tr>
            )}
            {baris.map((b) => (
              <tr
                key={b.idJaminan}
                className="border-t border-border border-l-[3px] border-l-status-late align-top transition-colors hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 whitespace-nowrap">{b.tipeKlaim}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.tipeCidera}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.namaRumahSakit ?? "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.picPengajuan ?? "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{b.loket}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/gl/${encodeURIComponent(b.tokenUrl)}?dari=peringatan`}
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
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{b.namaKorban}</span>
                    {b.jumlahGLKorban > 1 && (
                      <Link
                        href={`/peringatan?cari=${encodeURIComponent(b.namaKorban)}`}
                        title={`Ada ${b.jumlahGLKorban} baris GL dengan Nama Korban persis sama -- kemungkinan korban yang sama, GL berbeda (mis. rawat jalan lanjutan). Klik untuk lihat semua.`}
                      >
                        <Badge tone="info" className="whitespace-nowrap">
                          {b.jumlahGLKorban} GL
                        </Badge>
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {b.nomorSuratJaminan ?? "-"}
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {formatTanggal(b.tglGl)}
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {formatTanggalOpsional(b.tglKejadian)}
                </td>
                <td className="px-3 py-2.5 min-w-[350px] max-w-[700px]  whitespace-normal break-words">
                  {b.lokasi ?? "-"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge tone={b.glStatus === "Active" ? "ok" : "danger"}>{b.glStatus}</Badge>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge tone="info">{b.tahapan}</Badge>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge tone="warn">{b.statusPembayaran}</Badge>
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {formatRupiah(b.jumlahPembayaran)}
                </td>
                <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                  {formatTanggalOpsional(b.tglPembayaran)}
                </td>
                <td className="px-3 py-2.5 text-center font-mono font-bold whitespace-nowrap text-status-late">
                  {b.umurHari}
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono font-bold text-status-late">{b.umurPengajuan}</span>
                    {b.pengajuanBerdasarkanTglGl && (
                      <Badge
                        tone="neutral"
                        title="Tanggal Pulang Pasien belum diisi PIC Task Force, dihitung dari Tgl GL sebagai estimasi."
                      >
                        berdasarkan Tgl GL
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge
                    tone={b.statusDokumen === "Siap Diajukan ke Pusat" ? "ok" : "warn"}
                    title="Berdasarkan ada/tidaknya Laporan Survei TKP dan KSKK yang sudah dibuat/diunggah untuk GL ini."
                  >
                    {b.statusDokumen}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge tone={b.sudahDitinjau ? "ok" : "neutral"} className="w-fit">
                      {b.sudahDitinjau ? "Sudah Ditinjau" : "Belum Ditinjau"}
                    </Badge>
                    <Link
                      href={`/gl/${encodeURIComponent(b.tokenUrl)}?dari=peringatan`}
                      className="flex h-8 w-fit items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium whitespace-nowrap text-foreground hover:bg-muted"
                    >
                      <Eye className="size-3.5" />
                      Detail GL
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PeringatanFooterHalaman
        ukuran={ukuran}
        total={total}
        halaman={halaman}
        totalHalaman={totalHalaman}
        filterAktif={nilaiFilter}
        buatUrl={(h) => buatUrlHalaman(nilaiFilter, ukuran, h)}
      />
    </>
  );
}
