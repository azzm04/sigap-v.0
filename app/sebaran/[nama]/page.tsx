import { ChevronsLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatRupiah, formatTanggal, tanggalHariIniWIB } from "@/lib/format";
import { ambilDetailRumahSakit } from "@/lib/gl/sebaran";

export default async function DetailRumahSakitPage({
  params,
}: {
  params: Promise<{ nama: string }>;
}) {
  const { nama: namaMentah } = await params;
  const namaRumahSakit = decodeURIComponent(namaMentah);
  const detail = await ambilDetailRumahSakit(namaRumahSakit);

  if (detail.totalGL === 0) notFound();

  return (
    <AppShell breadcrumbAkhir={namaRumahSakit}>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/sebaran"
          className="flex w-fit items-center gap-1 text-xs leading-relaxed text-muted-foreground hover:text-foreground sm:text-sm"
        >
          <ChevronsLeft className="size-4 shrink-0" />
          Kembali ke Sebaran Rumah Sakit
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="inline-flex flex-wrap items-center gap-1.5 text-lg font-semibold text-foreground md:text-xl">
              {namaRumahSakit}
              <BantuanInfo>
                Rincian GL bertipe klaim GL untuk rumah sakit ini. Tabel di bawah HANYA mencakup GL
                berstatus Active dan Unpaid, dipecah per Tahapan -- GL yang sudah Paid tidak dipecah
                per tahapan (urusannya sudah selesai) dan hanya dijumlahkan di baris &quot;Total
                Paid&quot;. Nominal diambil dari Nilai Disetujui, bukan Nilai Diajukan.
              </BantuanInfo>
            </h2>
            <span className="text-sm text-muted-foreground">
              Per {formatTanggal(tanggalHariIniWIB())}
            </span>
          </div>
          <a
            href={`/api/ekspor-sebaran-rumah-sakit?nama=${encodeURIComponent(namaRumahSakit)}`}
            className="flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-4" />
            Ekspor Data
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Total GL" value={detail.totalGL.toLocaleString("id-ID")} />
          <StatCard
            label="GL Berstatus Cancel"
            value={detail.totalCancel.toLocaleString("id-ID")}
            tone="warn"
          />
        </div>

        <Card className="min-w-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">No</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground">
                    Tahapan GL
                  </th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap text-foreground">
                    Jumlah GL
                  </th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap text-foreground">
                    Nominal (Nilai Disetujui)
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.tahapan.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      Tidak ada GL Unpaid untuk rumah sakit ini.
                    </td>
                  </tr>
                )}
                {detail.tahapan.map((t, indeks) => (
                  <tr key={t.tahapan} className="border-t border-border">
                    <td className="px-3 py-2.5 whitespace-nowrap">{indeks + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{t.tahapan}</td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      {t.jumlah.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      {formatRupiah(t.nominal)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-status-near-bg font-semibold text-foreground">
                  <td className="px-3 py-2.5 whitespace-nowrap" colSpan={2}>
                    Total Unpaid
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {detail.totalUnpaid.jumlah.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {formatRupiah(detail.totalUnpaid.nominal)}
                  </td>
                </tr>
                <tr className="border-t border-border bg-status-safe-bg font-semibold text-foreground">
                  <td className="px-3 py-2.5 whitespace-nowrap" colSpan={2}>
                    Total Paid
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {detail.totalPaid.jumlah.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {formatRupiah(detail.totalPaid.nominal)}
                  </td>
                </tr>
                <tr className="border-t border-border bg-status-info-bg font-semibold text-foreground">
                  <td className="px-3 py-2.5 whitespace-nowrap" colSpan={2}>
                    Total GL Aktif
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {detail.totalAktif.jumlah.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                    {formatRupiah(detail.totalAktif.nominal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
