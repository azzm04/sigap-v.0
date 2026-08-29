import { Download, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { type NilaiFilterCatatan } from "@/components/gl/filter-catatan";
import { type NilaiFilterPeringatan } from "@/components/gl/filter-peringatan";
import { type NilaiFilterTaskForce } from "@/components/gl/filter-task-force";
import { PeringatanTabCatatan } from "@/components/gl/peringatan-tab-catatan";
import { PeringatanTabGL } from "@/components/gl/peringatan-tab-gl";
import { PeringatanTabTaskForce } from "@/components/gl/peringatan-tab-task-force";
import { TabPeringatan, type TabPeringatanKey } from "@/components/gl/tab-peringatan";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import { ambilPeringatanTaskForce } from "@/lib/gl/peringatan-task-force";
import { ambilOpsiFilter } from "@/lib/gl/queries";
import { ambilSemuaTinjauan } from "@/lib/gl/semua-tinjauan";

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
  const statusDokumen =
    sp.status_dokumen === "lengkap" || sp.status_dokumen === "belum_lengkap" ? sp.status_dokumen : undefined;

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
      statusDokumen,
      picPengajuan: sp.pic_pengajuan || undefined,
    }),
  ]);
  const { baris, total, ukuran, totalHalaman, ambangHari } = hasil;

  const nilaiFilterPeringatan: NilaiFilterPeringatan = {
    cari: sp.cari,
    status_tinjauan: sp.status_tinjauan,
    status_dokumen: sp.status_dokumen,
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
                <PeringatanTabTaskForce
                  hasil={hasilTaskForce}
                  nilaiFilter={nilaiFilterTaskForce}
                  opsiPicTaskForce={opsiFilter.picTaskForce}
                />
              )
            }
            slotCatatan={
              hasilCatatan && (
                <PeringatanTabCatatan hasil={hasilCatatan} nilaiFilter={nilaiFilterCatatan} />
              )
            }
          >
            <PeringatanTabGL
              baris={baris}
              total={total}
              ukuran={ukuran}
              halaman={halaman}
              totalHalaman={totalHalaman}
              nilaiFilter={nilaiFilterPeringatan}
              opsiPicPengajuan={opsiFilter.picPengajuan}
            />
          </TabPeringatan>
        </div>
      </div>
    </AppShell>
  );
}
