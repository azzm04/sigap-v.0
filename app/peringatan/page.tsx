import Link from "next/link";
import { Download, Eye, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { FilterCatatan, type NilaiFilterCatatan } from "@/components/gl/filter-catatan";
import { FilterPeringatan, type NilaiFilterPeringatan } from "@/components/gl/filter-peringatan";
import { FilterTaskForce, type NilaiFilterTaskForce } from "@/components/gl/filter-task-force";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { TabPeringatan, type TabPeringatanKey } from "@/components/gl/tab-peringatan";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatRupiah, formatTanggal, formatWaktu } from "@/lib/format";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import { ambilPeringatanTaskForce } from "@/lib/gl/peringatan-task-force";
import { ambilOpsiFilter } from "@/lib/gl/queries";
import { ambilSemuaTinjauan } from "@/lib/gl/semua-tinjauan";

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

function buatUrlHalaman(nilaiFilter: NilaiFilterPeringatan, ukuran: number, halaman: number): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran", String(ukuran));
  params.set("halaman", String(halaman));
  return `/peringatan?${params.toString()}`;
}

function buatUrlHalamanCatatan(
  nilaiFilter: NilaiFilterCatatan,
  ukuran: number,
  halaman: number,
): string {
  const params = new URLSearchParams();
  params.set("tab", "catatan");
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran_catatan", String(ukuran));
  params.set("halaman_catatan", String(halaman));
  return `/peringatan?${params.toString()}`;
}

function buatUrlHalamanTaskForce(
  nilaiFilter: NilaiFilterTaskForce,
  ukuran: number,
  halaman: number,
): string {
  const params = new URLSearchParams();
  params.set("tab", "task-force");
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("ukuran_task_force", String(ukuran));
  params.set("halaman_task_force", String(halaman));
  return `/peringatan?${params.toString()}`;
}

export default async function PapanPeringatanPage({
  searchParams,
}: {
  searchParams: Promise<
    NilaiFilterPeringatan & {
      halaman?: string;
      ukuran?: string;
      tab?: string;
      halaman_catatan?: string;
      ukuran_catatan?: string;
      cari_catatan?: string;
      label?: string;
      halaman_task_force?: string;
      ukuran_task_force?: string;
      cari_task_force?: string;
      pic_task_force?: string;
      status_tinjauan_task_force?: string;
      dari_task_force?: string;
      sampai_task_force?: string;
    }
  >;
}) {
  const sp = await searchParams;
  const tabAktif: TabPeringatanKey =
    sp.tab === "catatan" ? "catatan" : sp.tab === "task-force" ? "task-force" : "gl";
  const halaman = sp.halaman ? Number(sp.halaman) : 1;

  const statusTinjauan =
    sp.status_tinjauan === "sudah" || sp.status_tinjauan === "belum" ? sp.status_tinjauan : undefined;

  // Selalu ambil data GL (untuk counter di banner)
  const [opsiFilter, hasil] = await Promise.all([
    ambilOpsiFilter(),
    ambilPapanPeringatan({
      halaman,
      ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
      cari: sp.cari || undefined,
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
      statusTinjauan,
      picPengajuan: sp.pic_pengajuan || undefined,
    }),
  ]);
  const { baris, total, ukuran, totalHalaman, ambangHari } = hasil;

  const nilaiFilterPeringatan: NilaiFilterPeringatan = {
    cari: sp.cari,
    status_tinjauan: sp.status_tinjauan,
    pic_pengajuan: sp.pic_pengajuan,
    dari: sp.dari,
    sampai: sp.sampai,
  };

  // Ambil data catatan hanya saat tab catatan aktif
  const labelFilter =
    sp.label === "tindak_lanjut" || sp.label === "diabaikan" ? sp.label : undefined;

  const hasilCatatan = tabAktif === "catatan"
    ? await ambilSemuaTinjauan({
        halaman: sp.halaman_catatan ? Number(sp.halaman_catatan) : 1,
        ukuran: sp.ukuran_catatan ? Number(sp.ukuran_catatan) : undefined,
        cari: sp.cari_catatan || undefined,
        label: labelFilter,
      })
    : null;

  const nilaiFilterCatatan: NilaiFilterCatatan = {
    cari_catatan: sp.cari_catatan,
    label: sp.label,
  };

  // Ambil data Peringatan PIC Task Force hanya saat tab-nya aktif
  const statusTinjauanTaskForce =
    sp.status_tinjauan_task_force === "sudah" || sp.status_tinjauan_task_force === "belum"
      ? sp.status_tinjauan_task_force
      : undefined;

  const hasilTaskForce = tabAktif === "task-force"
    ? await ambilPeringatanTaskForce({
        halaman: sp.halaman_task_force ? Number(sp.halaman_task_force) : 1,
        ukuran: sp.ukuran_task_force ? Number(sp.ukuran_task_force) : undefined,
        cari: sp.cari_task_force || undefined,
        picTaskForce: sp.pic_task_force || undefined,
        statusTinjauan: statusTinjauanTaskForce,
        dari: sp.dari_task_force || undefined,
        sampai: sp.sampai_task_force || undefined,
      })
    : null;

  const nilaiFilterTaskForce: NilaiFilterTaskForce = {
    cari_task_force: sp.cari_task_force,
    pic_task_force: sp.pic_task_force,
    status_tinjauan_task_force: sp.status_tinjauan_task_force,
    dari_task_force: sp.dari_task_force,
    sampai_task_force: sp.sampai_task_force,
  };

  const bannerTotal = tabAktif === "task-force" ? (hasilTaskForce?.total ?? 0) : total;
  const bannerLabel =
    tabAktif === "task-force" ? "GL menunggu Hasil kunjungan Rumah Sakit" : "GL perlu Diajukan Ke Pusat";

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-8">
        <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-xl border border-status-late/30 bg-card p-6 shadow-sm md:flex-row md:items-center">
          <div className="absolute inset-0 z-0 bg-status-late/5" aria-hidden="true" />
          <div className="z-10 flex items-center gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-status-late/30 bg-status-late-bg">
              <TriangleAlert className="size-7 text-status-late" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold text-status-late">{bannerTotal}</span>
              <span className="text-sm text-muted-foreground">{bannerLabel}</span>
            </div>
          </div>
          <a
            href="/api/ekspor-peringatan"
            className="z-10 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium text-foreground hover:bg-muted md:w-auto"
          >
            <Download className="size-4" />
            Ekspor Data
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Daftar Guarantee Letter</h2>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-status-late" />
              &gt; {ambangHari} Hari
            </span>
          </div>

          <TabPeringatan
            tabAktif={tabAktif}
            slotTaskForce={
              hasilTaskForce && (
                <>
                  <FilterTaskForce
                    nilai={nilaiFilterTaskForce}
                    opsi={{ picTaskForce: opsiFilter.picTaskForce }}
                    ukuran={hasilTaskForce.ukuran}
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-table-header">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">
                            Nama Korban
                          </th>
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
                        {hasilTaskForce.baris.length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                              Tidak ada GL yang cocok dengan filter ini.
                            </td>
                          </tr>
                        )}
                        {hasilTaskForce.baris.map((b) => (
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
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {b.namaRumahSakit ?? "-"}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {b.picTaskForce ?? "-"}
                            </td>
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

                  <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <PilihanUkuranHalaman
                      ukuran={hasilTaskForce.ukuran}
                      total={hasilTaskForce.total}
                      basePath="/peringatan"
                      filterAktif={{ tab: "task-force", ...nilaiFilterTaskForce }}
                      labelSatuan="GL menunggu kunjungan"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                      <LompatHalaman
                        halamanAktif={hasilTaskForce.halaman}
                        totalHalaman={hasilTaskForce.totalHalaman}
                        ukuran={hasilTaskForce.ukuran}
                        basePath="/peringatan"
                        filterAktif={{ tab: "task-force", ...nilaiFilterTaskForce }}
                      />
                      <div className="flex justify-center sm:contents">
                        <Pagination
                          halamanAktif={hasilTaskForce.halaman}
                          totalHalaman={hasilTaskForce.totalHalaman}
                          buatUrl={(h) =>
                            buatUrlHalamanTaskForce(nilaiFilterTaskForce, hasilTaskForce.ukuran, h)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )
            }
            slotCatatan={
            hasilCatatan && (
              <>
                <FilterCatatan nilai={nilaiFilterCatatan} ukuran={hasilCatatan.ukuran} />

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
                        <th className="px-3 py-2 text-left font-semibold text-foreground">
                          Catatan
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasilCatatan.baris.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                            Belum ada catatan tinjauan yang sesuai filter.
                          </td>
                        </tr>
                      )}
                      {hasilCatatan.baris.map((c) => (
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
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {c.namaKorban}
                          </td>
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
                              {c.diabaikan && (
                                <Badge tone="danger">Diabaikan</Badge>
                              )}
                              {c.perluTindakLanjut && (
                                <Badge tone="info">Perlu tindak lanjut</Badge>
                              )}
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

                <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <PilihanUkuranHalaman
                    ukuran={hasilCatatan.ukuran}
                    total={hasilCatatan.total}
                    basePath="/peringatan"
                    filterAktif={{ tab: "catatan", ...nilaiFilterCatatan }}
                    labelSatuan="catatan ditemukan"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <LompatHalaman
                      halamanAktif={hasilCatatan.halaman}
                      totalHalaman={hasilCatatan.totalHalaman}
                      ukuran={hasilCatatan.ukuran}
                      basePath="/peringatan"
                      filterAktif={{ tab: "catatan", ...nilaiFilterCatatan }}
                    />
                    <div className="flex justify-center sm:contents">
                      <Pagination
                        halamanAktif={hasilCatatan.halaman}
                        totalHalaman={hasilCatatan.totalHalaman}
                        buatUrl={(h) => buatUrlHalamanCatatan(nilaiFilterCatatan, hasilCatatan.ukuran, h)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )
          }>
            {/* === Tab Daftar GL (konten existing) === */}
            <FilterPeringatan
              nilai={nilaiFilterPeringatan}
              opsi={{ picPengajuan: opsiFilter.picPengajuan }}
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

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <PilihanUkuranHalaman
                ukuran={ukuran}
                total={total}
                basePath="/peringatan"
                filterAktif={nilaiFilterPeringatan}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <LompatHalaman
                  halamanAktif={halaman}
                  totalHalaman={totalHalaman}
                  ukuran={ukuran}
                  basePath="/peringatan"
                  filterAktif={nilaiFilterPeringatan}
                />
                <div className="flex justify-center sm:contents">
                  <Pagination
                    halamanAktif={halaman}
                    totalHalaman={totalHalaman}
                    buatUrl={(h) => buatUrlHalaman(nilaiFilterPeringatan, ukuran, h)}
                  />
                </div>
              </div>
            </div>
          </TabPeringatan>
        </div>
      </div>
    </AppShell>
  );
}
