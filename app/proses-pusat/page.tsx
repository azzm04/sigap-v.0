import { Download, Eye, Send } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { FilterProsesPusat, type NilaiFilterProsesPusat } from "@/components/gl/filter-proses-pusat";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { ambilDaftarProsesPusat } from "@/lib/gl/proses-pusat";
import { ambilOpsiFilter } from "@/lib/gl/queries";
import { ambilKinerjaPengajuanPusat } from "@/lib/gl/ringkasan";
import { TAHAP_KELUAR_PERINGATAN } from "@/lib/gl/tahap-proses";
import { enkripsiTeks } from "@/lib/gl/token-url";

function bangunQuery(nilaiFilter: NilaiFilterProsesPusat): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  return params.toString();
}

function buatUrlHalaman(nilaiFilter: NilaiFilterProsesPusat, ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran", String(ukuran));
  params.set("halaman", String(halaman));
  return `/proses-pusat?${params.toString()}`;
}

export default async function ProsesPusatPage({
  searchParams,
}: {
  searchParams: Promise<NilaiFilterProsesPusat & { halaman?: string; ukuran?: string }>;
}) {
  const sp = await searchParams;
  const halaman = sp.halaman ? Number(sp.halaman) : 1;

  const [opsiFilter, hasil, kinerjaPusat] = await Promise.all([
    ambilOpsiFilter(),
    ambilDaftarProsesPusat({
      halaman,
      ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
      cari: sp.cari || undefined,
      picPengajuan: sp.pic_pengajuan || undefined,
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
    }),
    ambilKinerjaPengajuanPusat({
      picPengajuan: sp.pic_pengajuan || undefined,
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
    }),
  ]);

  const nilaiFilter: NilaiFilterProsesPusat = {
    cari: sp.cari,
    pic_pengajuan: sp.pic_pengajuan,
    dari: sp.dari,
    sampai: sp.sampai,
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title={
            <span className="inline-flex items-center gap-1.5 text-lg md:text-xl">
              Proses Pusat
              <BantuanInfo>
                GL yang sudah diajukan ke pusat (tahap &quot;{TAHAP_KELUAR_PERINGATAN}&quot;) dan
                masih menunggu pembayaran — sudah keluar dari tangan PIC Pengajuan, jadi tidak
                lagi muncul di Papan Peringatan. Begitu lunas, GL otomatis hilang dari daftar ini
                juga.
              </BantuanInfo>
            </span>
          }
        />

        <div className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-primary/30 bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="absolute inset-0 z-0 bg-primary/5" aria-hidden="true" />
          <div className="z-10 flex items-center gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-status-info-bg">
              <Send className="size-7 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-primary">{hasil.total}</span>
              <span className="text-sm text-muted-foreground">GL Sudah Diajukan ke Pusat</span>
            </div>
          </div>
          {/* Ekspor memakai query string yang sama dengan halamannya, jadi
              berkas yang terunduh persis mengikuti filter yang sedang aktif. */}
          <a
            href={`/api/ekspor-proses-pusat?${bangunQuery(nilaiFilter)}`}
            className="z-10 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium text-foreground hover:bg-muted md:w-auto"
          >
            <Download className="size-4" />
            Ekspor Data
          </a>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <FilterProsesPusat
            nilai={nilaiFilter}
            ukuran={hasil.ukuran}
            opsi={{ picPengajuan: opsiFilter.picPengajuan }}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Korban</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Nomor ID Jaminan
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Nomor Surat Jaminan
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Rumah Sakit</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    PIC Pengajuan
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Tgl GL
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Tahap Proses
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Dicatat pada
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Status Pembayaran
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {hasil.baris.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada GL yang sudah diajukan ke pusat.
                    </td>
                  </tr>
                )}
                {hasil.baris.map((b) => (
                  <tr key={b.idJaminan} className="border-t border-border align-top hover:bg-muted/40">
                    <td className="px-3 py-2.5 whitespace-nowrap">{b.namaKorban}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/gl/${encodeURIComponent(b.tokenUrl)}`}
                        className="font-mono text-primary underline-offset-2 hover:underline"
                      >
                        {b.idJaminan}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      {b.nomorSuratJaminan ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{b.namaRumahSakit ?? "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{b.picPengajuan ?? "-"}</td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      {formatTanggal(b.tglGl)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone="info">{b.tahapProses}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      {formatWaktu(b.tahapDicatatPada)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge
                        tone={b.statusPembayaran === "Paid" ? "solidOk" : "warn"}
                        pill={b.statusPembayaran === "Paid"}
                      >
                        {b.statusPembayaran}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/gl/${encodeURIComponent(b.tokenUrl)}`}
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

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PilihanUkuranHalaman
              ukuran={hasil.ukuran}
              total={hasil.total}
              basePath="/proses-pusat"
              filterAktif={nilaiFilter}
              labelSatuan="GL di proses pusat"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={hasil.halaman}
                totalHalaman={hasil.totalHalaman}
                ukuran={hasil.ukuran}
                filterAktif={nilaiFilter}
                basePath="/proses-pusat"
              />

              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={hasil.halaman}
                  totalHalaman={hasil.totalHalaman}
                  buatUrl={(h) => buatUrlHalaman(nilaiFilter, hasil.ukuran, h)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
