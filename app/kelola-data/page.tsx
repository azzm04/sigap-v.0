import Link from "next/link";
import { ChevronRight, Database, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { FormUnggah } from "@/components/kelola-data/form-unggah";
import { HapusSemuaDialog } from "@/components/kelola-data/hapus-semua-dialog";
import { SinkronSheetsButton } from "@/components/kelola-data/sinkron-sheets-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatWaktu } from "@/lib/format";
import {
  ambilRiwayatLogData,
  ambilTotalLogData,
  ambilWaktuImporTerakhirBerhasil,
  type JenisLogData,
} from "@/lib/impor-log";
import { ambilTotalBarisAktif } from "@/lib/gl/sampah";
import { BantuanInfo } from "@/components/ui/bantuan-info";

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

export default async function KelolaDataPage() {
  const [riwayat, totalLogData, totalBarisAktif, diimporTerakhir] = await Promise.all([
    ambilRiwayatLogData(),
    ambilTotalLogData(),
    ambilTotalBarisAktif(),
    ambilWaktuImporTerakhirBerhasil(),
  ]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-8">
        <PageHeader
          title={
            <span className="text-lg font-semibold text-foreground">Kelola Data
            <BantuanInfo>
              Satu tempat untuk mengunggah berkas ekspor JRCare (KLAIM REPORT), berkas Data Pelengkap DASI, atau berkas Sentralisasi Pembayaran, format .xlsx atau .csv. Bisa unggah beberapa berkas sekaligus — sistem akan otomatis mendeteksi jenis tiap berkas.
            </BantuanInfo>
            </span>
          }
        />

        <Card>
          <FormUnggah />
        </Card>

        <Card
          title="Log Data"
          description={`${riwayat.length.toLocaleString("id-ID")} aktivitas terakhir yang mengubah data GL — impor, hapus semua data, dan pemulihan.`}
          actions={
            totalLogData > riwayat.length ? (
              <Link
                href="/kelola-data/riwayat"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-foreground hover:underline"
              >
                Detail Riwayat
                <ChevronRight className="size-3.5" />
              </Link>
            ) : undefined
          }
        >
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
                {riwayat.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Belum ada aktivitas yang tercatat.
                    </td>
                  </tr>
                )}
                {riwayat.map((r) => (
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
        </Card>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold text-foreground">
                    {totalBarisAktif.toLocaleString("id-ID")} baris GL aktif
                  </span>
                  <Badge tone="ok" pill>
                    Sinkron
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  Terakhir diperbarui: {diimporTerakhir ? formatWaktu(diimporTerakhir) : "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2 lg:shrink-0">
              <SinkronSheetsButton />
              <Link href="/kelola-data/sampah" className={buttonVariants({ variant: "outline" })}>
                <Trash2 />
                Buka Keranjang Sampah
              </Link>
              <HapusSemuaDialog totalBaris={totalBarisAktif} />
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
