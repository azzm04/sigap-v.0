import { ChevronsLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { FilterGL, type NilaiFilterGL } from "@/components/gl/filter-gl";
import { LompatHalaman } from "@/components/gl/lompat-halaman";
import { TabelGL } from "@/components/gl/tabel-gl";
import { PilihanUkuranHalaman } from "@/components/gl/ukuran-halaman";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Pagination } from "@/components/ui/pagination";
import { hitungUmurHari } from "@/lib/format";
import { ambilAmbangHari } from "@/lib/pengaturan";
import { ambilDaftarGL, ambilOpsiFilter } from "@/lib/gl/queries";

export default async function DetailTahapanRumahSakitPage({
  params,
  searchParams,
}: {
  params: Promise<{ nama: string; tahapan: string }>;
  searchParams: Promise<NilaiFilterGL & { halaman?: string; ukuran?: string }>;
}) {
  const { nama: namaMentah, tahapan: tahapanMentah } = await params;
  const namaRumahSakit = decodeURIComponent(namaMentah);
  const tahapan = decodeURIComponent(tahapanMentah);
  const sp = await searchParams;
  const statusDuplikatNama =
    sp.status_duplikat_nama === "duplikat" || sp.status_duplikat_nama === "unik"
      ? sp.status_duplikat_nama
      : undefined;

  const [opsiFilter, hasil, ambangHari] = await Promise.all([
    ambilOpsiFilter(),
    ambilDaftarGL({
      namaRumahSakit,
      tahapan,
      statusPembayaran: sp.status_pembayaran || "Unpaid",
      glStatus: sp.gl_status || "Active",
      loket: sp.loket || undefined,
      picTaskForce: sp.pic_task_force || undefined,
      picPengajuan: sp.pic_pengajuan || undefined,
      dari: sp.dari || undefined,
      sampai: sp.sampai || undefined,
      cari: sp.cari || undefined,
      statusDuplikatNama,
      halaman: sp.halaman ? Number(sp.halaman) : 1,
      ukuran: sp.ukuran ? Number(sp.ukuran) : undefined,
    }),
    ambilAmbangHari(),
  ]);

  const dataTabel = hasil.baris.map((b) => ({ ...b, umurHari: hitungUmurHari(b.tglGl) }));
  const basePath = `/sebaran/${encodeURIComponent(namaRumahSakit)}/${encodeURIComponent(tahapan)}`;

  const nilaiFilterGL: NilaiFilterGL = {
    cari: sp.cari,
    loket: sp.loket,
    tahapan,
    status_pembayaran: sp.status_pembayaran || "Unpaid",
    gl_status: sp.gl_status || "Active",
    nama_rumah_sakit: namaRumahSakit,
    pic_task_force: sp.pic_task_force,
    pic_pengajuan: sp.pic_pengajuan,
    status_duplikat_nama: sp.status_duplikat_nama,
    dari: sp.dari,
    sampai: sp.sampai,
  };

  return (
    <AppShell breadcrumbAkhir={`${namaRumahSakit} — ${tahapan}`}>
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <Link
          href={`/sebaran/${encodeURIComponent(namaRumahSakit)}`}
          className="flex w-fit items-center gap-1 text-xs leading-relaxed text-muted-foreground hover:text-foreground sm:text-sm"
        >
          <ChevronsLeft className="size-4 shrink-0" />
          Kembali ke {namaRumahSakit}
        </Link>

        <h2 className="inline-flex flex-wrap items-center gap-1.5 text-lg font-semibold text-foreground md:text-xl">
          {namaRumahSakit} — {tahapan}
          <BantuanInfo>
            Daftar GL untuk rumah sakit dan tahapan ini, kolomnya sama seperti tabel di halaman
            Monitoring. Status Pembayaran diawali &quot;Unpaid&quot; sesuai angka yang baru
            diklik di halaman Sebaran Rumah Sakit, tapi tetap bisa diganti -- misalnya untuk
            melihat yang sudah Paid pada kombinasi rumah sakit + tahapan yang sama.
          </BantuanInfo>
        </h2>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          <FilterGL
            nilai={nilaiFilterGL}
            opsi={opsiFilter}
            ukuran={hasil.ukuran}
            basePath={basePath}
            terkunci
          />

          <TabelGL data={dataTabel} ambangHari={ambangHari} className="rounded-none border-0 border-t" />

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PilihanUkuranHalaman
              ukuran={hasil.ukuran}
              total={hasil.total}
              basePath={basePath}
              filterAktif={nilaiFilterGL}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <LompatHalaman
                halamanAktif={hasil.halaman}
                totalHalaman={hasil.totalHalaman}
                ukuran={hasil.ukuran}
                basePath={basePath}
                filterAktif={nilaiFilterGL}
              />

              <div className="flex justify-center sm:contents">
                <Pagination
                  halamanAktif={hasil.halaman}
                  totalHalaman={hasil.totalHalaman}
                  buatUrl={(h) => {
                    const p = new URLSearchParams();
                    for (const [kunci, nilai] of Object.entries(nilaiFilterGL)) {
                      if (nilai) p.set(kunci, nilai);
                    }
                    p.set("ukuran", String(hasil.ukuran));
                    p.set("halaman", String(h));
                    return `${basePath}?${p.toString()}`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
