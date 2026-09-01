import { Download, Eye, Share2 } from "lucide-react";
import Link from "next/link";
import { FilterPelimpahan, type NilaiFilterPelimpahan } from "@/components/gl/filter-pelimpahan";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { ambilDaftarPelimpahan } from "@/lib/gl/daftar-pelimpahan";
import { TAHAP_BELUM_LIMPAH } from "@/lib/gl/pelimpahan";
import { ambilOpsiFilter } from "@/lib/gl/queries";

function bangunQuery(
  nilaiFilter: NilaiFilterPelimpahan,
  tambahan: Record<string, string> = {},
): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  for (const [kunci, nilai] of Object.entries(tambahan)) params.set(kunci, nilai);
  return params.toString();
}

export default async function PelimpahanPage({
  searchParams,
}: {
  searchParams: Promise<NilaiFilterPelimpahan & { halaman?: string; ukuran?: string }>;
}) {
  const sp = await searchParams;
  const halaman = sp.halaman ? Number(sp.halaman) : 1;

  const [opsiFilter, hasil] = await Promise.all([
    ambilOpsiFilter(),
    ambilDaftarPelimpahan({
      halaman,
      ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
      cari: sp.cari || undefined,
      loketPelimpahan: sp.loket_pelimpahan || undefined,
      picPengajuan: sp.pic_pengajuan || undefined,
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
    }),
  ]);

  const nilaiFilter: NilaiFilterPelimpahan = {
    cari: sp.cari,
    loket_pelimpahan: sp.loket_pelimpahan,
    pic_pengajuan: sp.pic_pengajuan,
    dari: sp.dari,
    sampai: sp.sampai,
  };

  const totalSemuaLoket = hasil.jumlahPerLoket.reduce((jml, l) => jml + l.jumlah, 0);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title={
            <span className="inline-flex items-center gap-1.5 text-lg md:text-xl">
              Pelimpahan
              <BantuanInfo>
                GL yang tahap proses pusat terkininya &quot;{TAHAP_BELUM_LIMPAH}&quot; — berkasnya
                masih menunggu dilimpahkan ke loket cabang lain, dan selama itu belum bisa
                diajukan ke pusat. Begitu PIC Pengajuan mencatat tahap &quot;Berkas Diajukan Ke
                Pusat&quot;, GL otomatis hilang dari daftar ini.
              </BantuanInfo>
            </span>
          }
        />

        <div className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-status-near/30 bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="absolute inset-0 z-0 bg-status-near-bg/40" aria-hidden="true" />
          <div className="z-10 flex items-center gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-status-near/30 bg-status-near-bg">
              <Share2 className="size-7 text-status-near" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-status-near">{hasil.total}</span>
              <span className="text-sm text-muted-foreground">
                {nilaiFilter.loket_pelimpahan
                  ? `GL belum dilimpah di ${nilaiFilter.loket_pelimpahan}`
                  : "GL belum dilimpah"}
              </span>
            </div>
          </div>
          <a
            href={`/api/ekspor-pelimpahan?${bangunQuery(nilaiFilter)}`}
            className="z-10 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium text-foreground hover:bg-muted md:w-auto"
          >
            <Download className="size-4" />
            Ekspor Data
          </a>
        </div>

        {hasil.jumlahPerLoket.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <span className="text-sm font-semibold text-foreground">
              Sebaran per Loket Cabang{" "}
              <span className="font-normal text-muted-foreground">
                ({totalSemuaLoket} GL, klik untuk menyaring)
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {hasil.jumlahPerLoket.map((l) => {
                const aktif = nilaiFilter.loket_pelimpahan === l.loket;
                return (
                  <Link
                    key={l.loket}
                    href={`/pelimpahan?${bangunQuery(
                      { ...nilaiFilter, loket_pelimpahan: aktif ? undefined : l.loket },
                      { halaman: "1" },
                    )}`}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      aktif
                        ? "border-primary bg-status-info-bg text-primary"
                        : "border-input text-foreground hover:bg-muted"
                    }`}
                  >
                    {l.loket}
                    <span className="font-mono font-bold">{l.jumlah}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <FilterPelimpahan
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
                  <th className="px-3 py-2 text-left font-semibold text-foreground">
                    Nama Rumah Sakit
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Loket Cabang
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    PIC Pengajuan
                  </th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Tgl GL
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
                    <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada GL yang ditandai &quot;{TAHAP_BELUM_LIMPAH}&quot;.
                    </td>
                  </tr>
                )}
                {hasil.baris.map((b) => (
                  <tr
                    key={b.idJaminan}
                    className="border-t border-border align-top hover:bg-muted/40"
                  >
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
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {b.loketPelimpahan ? (
                        <Badge tone="warn">{b.loketPelimpahan}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{b.picPengajuan ?? "-"}</td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      {formatTanggal(b.tglGl)}
                    </td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      {formatWaktu(b.dicatatPada)}
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
              basePath="/pelimpahan"
              filterAktif={nilaiFilter}
              labelSatuan="GL belum dilimpah"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={hasil.halaman}
                totalHalaman={hasil.totalHalaman}
                ukuran={hasil.ukuran}
                filterAktif={nilaiFilter}
                basePath="/pelimpahan"
              />

              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={hasil.halaman}
                  totalHalaman={hasil.totalHalaman}
                  buatUrl={(h) =>
                    `/pelimpahan?${bangunQuery(nilaiFilter, {
                      ukuran: String(hasil.ukuran),
                      halaman: String(h),
                    })}`
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
