import { AppShell } from "@/components/layout/app-shell";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { DistribusiRumahSakit } from "@/components/sebaran/distribusi-rumah-sakit";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import {
  ambilSebaranRumahSakit,
  ambilTotalGLAktif,
  ambilTotalRumahSakitMitra,
} from "@/lib/gl/sebaran";
import { PILIHAN_UKURAN_HALAMAN } from "@/lib/gl/ukuran-halaman";
import { BantuanInfo } from "@/components/ui/bantuan-info";

const UKURAN_HALAMAN_DEFAULT = 10;
const JUMLAH_TOP = 10;

function sanitisasiUkuran(nilai: number | undefined): number {
  return nilai && (PILIHAN_UKURAN_HALAMAN as readonly number[]).includes(nilai)
    ? nilai
    : UKURAN_HALAMAN_DEFAULT;
}

export default async function SebaranPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string; ukuran?: string }>;
}) {
  const sp = await searchParams;
  const halamanDiminta = sp.halaman ? Number(sp.halaman) : 1;
  const ukuran = sanitisasiUkuran(sp.ukuran ? Number(sp.ukuran) : undefined);

  const [semuaRumahSakit, totalMitra, totalGLAktif, peringatan] = await Promise.all([
    ambilSebaranRumahSakit(),
    ambilTotalRumahSakitMitra(),
    ambilTotalGLAktif(),
    ambilPapanPeringatan({ ukuran: 1 }),
  ]);

  const totalBaris = semuaRumahSakit.length;
  const totalHalaman = Math.max(1, Math.ceil(totalBaris / ukuran));
  const halaman = Math.min(Math.max(1, halamanDiminta), totalHalaman);
  const barisHalaman = semuaRumahSakit.slice((halaman - 1) * ukuran, halaman * ukuran);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-8">
        <PageHeader
          title={
            <span className="text-lg md:text-xl font-semibold">Sebaran Data Rumah Sakit
            <BantuanInfo>
              Analisis distribusi Guarantee Letter berdasarkan rumah sakit mitra.
            </BantuanInfo>
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard label="Total Rumah Sakit Mitra" value={totalMitra.toLocaleString("id-ID")} />
          <StatCard
            label="Total GL Aktif"
            value={totalGLAktif.toLocaleString("id-ID")}
            hint={
              <span className="text-status-late">
                {peringatan.total.toLocaleString("id-ID")} Perlu Ditinjau
              </span>
            }
          />
        </div>

        <Card title={`Distribusi per Rumah Sakit (Top ${JUMLAH_TOP})`}>
          <DistribusiRumahSakit data={semuaRumahSakit.slice(0, JUMLAH_TOP)} />
        </Card>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Detail Rekapitulasi Rumah Sakit</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Rumah Sakit</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Loket/Area
                  </th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap text-foreground">
                    Total GL
                  </th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap text-foreground">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody>
                {barisHalaman.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada data rumah sakit dari GL aktif.
                    </td>
                  </tr>
                )}
                {barisHalaman.map((rs) => (
                  <tr
                    key={`${rs.namaRumahSakit}-${rs.loket}`}
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground">{rs.namaRumahSakit}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{rs.loket}</td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      {rs.jumlah.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-primary">
                      {totalGLAktif === 0 ? "0.0%" : `${((rs.jumlah / totalGLAktif) * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PilihanUkuranHalaman
              ukuran={ukuran}
              total={totalBaris}
              basePath="/sebaran"
              labelSatuan="Rumah Sakit"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={halaman}
                totalHalaman={totalHalaman}
                ukuran={ukuran}
                basePath="/sebaran"
              />
              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={halaman}
                  totalHalaman={totalHalaman}
                  buatUrl={(h) => `/sebaran?ukuran=${ukuran}&halaman=${h}`}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Kolom Loket/Area ditampilkan apa adanya dari berkas ekspor. Apakah loket 0400601
          mencakup seluruh cabang Semarang termasuk Pati masih menunggu konfirmasi klien.
        </p>
      </div>
    </AppShell>
  );
}
