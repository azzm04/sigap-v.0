import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { formatWaktu } from "@/lib/format";
import { ambilRiwayatLogDataBerhalaman, type JenisLogData } from "@/lib/impor-log";

const LABEL_JENIS: Record<JenisLogData, string> = {
  impor: "Impor",
  impor_sentralisasi: "Impor Sentralisasi Pembayaran",
  hapus: "Hapus Semua Data",
  pulihkan: "Pulihkan",
  hapus_permanen: "Hapus Permanen",
  sinkron_sheets: "Sinkron Google Sheets",
};

const TONE_JENIS: Record<JenisLogData, "info" | "danger" | "ok"> = {
  impor: "info",
  impor_sentralisasi: "info",
  hapus: "danger",
  pulihkan: "ok",
  hapus_permanen: "danger",
  sinkron_sheets: "info",
};

function buatUrlHalaman(ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  params.set("ukuran", String(ukuran));
  params.set("halaman", String(halaman));
  return `/kelola-data/riwayat?${params.toString()}`;
}

export default async function RiwayatLogDataPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string; ukuran?: string }>;
}) {
  const sp = await searchParams;
  const hasil = await ambilRiwayatLogDataBerhalaman({
    halaman: sp.halaman ? Number(sp.halaman) : undefined,
    ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/kelola-data"
            className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Kelola Data
          </Link>
          <PageHeader
            title="Detail Riwayat Log Data"
            description={
              <span className="text-sm text-muted-foreground">
                Seluruh aktivitas yang mengubah data GL -- impor, hapus semua data, pemulihan, dan sinkronisasi.
              </span>
            }
          />
        </div>

        <Card>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-table-header">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Waktu</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Jenis</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Nama Berkas</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Hasil</th>
                  <th className="px-3 py-2 text-right font-semibold text-foreground">Jumlah Baris</th>
                  <th className="px-3 py-2 text-right font-semibold text-foreground">Baru</th>
                  <th className="px-3 py-2 text-right font-semibold text-foreground">Berubah</th>
                </tr>
              </thead>
              <tbody>
                {hasil.baris.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada aktivitas yang tercatat.
                    </td>
                  </tr>
                )}
                {hasil.baris.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{formatWaktu(r.diimporPada)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={TONE_JENIS[r.jenis]} className="w-fit">
                        {LABEL_JENIS[r.jenis]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.namaBerkas ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.berhasil ? (
                        <Badge tone="ok">Berhasil</Badge>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge tone="danger" className="w-fit">
                            Ditolak
                          </Badge>
                          {r.alasanPenolakan && (
                            <span className="text-xs whitespace-normal text-muted-foreground">
                              {r.alasanPenolakan}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.jumlahBaris.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.jumlahBaru.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.jumlahBerubah.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-1 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PilihanUkuranHalaman
              ukuran={hasil.ukuran}
              total={hasil.total}
              basePath="/kelola-data/riwayat"
              labelSatuan="aktivitas"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={hasil.halaman}
                totalHalaman={hasil.totalHalaman}
                ukuran={hasil.ukuran}
                basePath="/kelola-data/riwayat"
              />

              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={hasil.halaman}
                  totalHalaman={hasil.totalHalaman}
                  buatUrl={(h) => buatUrlHalaman(hasil.ukuran, h)}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
