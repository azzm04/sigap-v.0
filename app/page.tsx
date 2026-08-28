import { AppShell } from "@/components/layout/app-shell";
import { FilterGL, type NilaiFilterGL } from "@/components/gl/filter-gl";
import { GrafikSebaranTahapan, GrafikStatusPembayaran, GrafikTrenBulanan } from "@/components/gl/grafik";
import { KartuKinerjaPengajuanPusat } from "@/components/gl/kartu-kinerja-pusat";
import { KartuRingkasanGL } from "@/components/gl/kartu-ringkasan";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { TabelGL } from "@/components/gl/tabel-gl";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { Pagination } from "@/components/ui/pagination";
import { hitungUmurHari } from "@/lib/format";
import { ambilDaftarGL, ambilOpsiFilter } from "@/lib/gl/queries";
import {
  ambilKartuRingkasan,
  ambilKinerjaPengajuanPusat,
  ambilSebaranStatusPembayaran,
  ambilSebaranTahapan,
  ambilTrenBulanan,
} from "@/lib/gl/ringkasan";
import { ambilAmbangHari } from "@/lib/pengaturan";

function buatUrlHalaman(nilaiFilter: NilaiFilterGL, halaman: number): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("halaman", String(halaman));
  return `/?${params.toString()}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<NilaiFilterGL & { halaman?: string; ukuran?: string }>;
}) {
  const sp = await searchParams;

  const [opsiFilter, hasil, ringkasan, kinerjaPusat, sebaranTahapan, sebaranStatusPembayaran, trenBulanan, ambangHari] =
    await Promise.all([
      ambilOpsiFilter(),
      ambilDaftarGL({
        loket: sp.loket || undefined,
        tahapan: sp.tahapan || undefined,
        statusPembayaran: sp.status_pembayaran || undefined,
        glStatus: sp.gl_status || undefined,
        picTaskForce: sp.pic_task_force || undefined,
        picPengajuan: sp.pic_pengajuan || undefined,
        dari: sp.dari || undefined,
        sampai: sp.sampai || undefined,
        cari: sp.cari || undefined,
        halaman: sp.halaman ? Number(sp.halaman) : 1,
        ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
      }),
      ambilKartuRingkasan(),
      ambilKinerjaPengajuanPusat({
        picPengajuan: sp.pic_pengajuan || undefined,
        dari: sp.dari || undefined,
        sampai: sp.sampai || undefined,
      }),
      ambilSebaranTahapan(),
      ambilSebaranStatusPembayaran(),
      ambilTrenBulanan(),
      ambilAmbangHari(),
    ]);

  const dataTabel = hasil.baris.map((b) => ({ ...b, umurHari: hitungUmurHari(b.tglGl) }));
  const nilaiFilterGL: NilaiFilterGL = {
    cari: sp.cari,
    loket: sp.loket,
    tahapan: sp.tahapan,
    status_pembayaran: sp.status_pembayaran,
    gl_status: sp.gl_status,
    pic_task_force: sp.pic_task_force,
    pic_pengajuan: sp.pic_pengajuan,
    dari: sp.dari,
    sampai: sp.sampai,
  };

  return (
    <AppShell>
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <KartuRingkasanGL data={ringkasan} />

        <hr className="border-t border-border/60" />

        <div className="flex flex-col gap-4">
          <GrafikSebaranTahapan data={sebaranTahapan} />
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <GrafikStatusPembayaran data={sebaranStatusPembayaran} />
            <GrafikTrenBulanan data={trenBulanan} />
          </div>
        </div>

        <hr className="border-t border-border/60" />

        <KartuKinerjaPengajuanPusat data={kinerjaPusat} />

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <FilterGL nilai={nilaiFilterGL} opsi={opsiFilter} ukuran={hasil.ukuran} />

          <TabelGL data={dataTabel} ambangHari={ambangHari} className="rounded-none border-0 border-t" />

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PilihanUkuranHalaman ukuran={hasil.ukuran} total={hasil.total} filterAktif={nilaiFilterGL} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={hasil.halaman}
                totalHalaman={hasil.totalHalaman}
                ukuran={hasil.ukuran}
                filterAktif={nilaiFilterGL}
              />

              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={hasil.halaman}
                  totalHalaman={hasil.totalHalaman}
                  buatUrl={(h) => buatUrlHalaman(sp, h)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
