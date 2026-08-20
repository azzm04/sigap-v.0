import Link from "next/link";
import { hitungUmurHari } from "@/lib/format";
import { ambilDaftarGL, ambilOpsiFilter } from "@/lib/gl/queries";
import {
  ambilKartuRingkasan,
  ambilSebaranStatusPembayaran,
  ambilSebaranTahapan,
  ambilTrenBulanan,
} from "@/lib/gl/ringkasan";
import { FilterGL, type NilaiFilterGL } from "./filter-gl";
import { GrafikSebaranTahapan, GrafikStatusPembayaran, GrafikTrenBulanan } from "./grafik";
import { HeaderApp } from "./header-app";
import { KartuRingkasanGL } from "./kartu-ringkasan";
import { TabelGL } from "./tabel-gl";

function buatUrlHalaman(nilaiFilter: NilaiFilterGL, halaman: number): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  params.set("halaman", String(halaman));
  return `/?${params.toString()}`;
}

function buatUrlEkspor(nilaiFilter: NilaiFilterGL): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(nilaiFilter)) {
    if (nilai) params.set(kunci, nilai);
  }
  return `/api/ekspor?${params.toString()}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<NilaiFilterGL & { halaman?: string }>;
}) {
  const sp = await searchParams;

  const [opsiFilter, hasil, ringkasan, sebaranTahapan, sebaranStatusPembayaran, trenBulanan] =
    await Promise.all([
      ambilOpsiFilter(),
      ambilDaftarGL({
        loket: sp.loket || undefined,
        tahapan: sp.tahapan || undefined,
        statusPembayaran: sp.status_pembayaran || undefined,
        dari: sp.dari || undefined,
        sampai: sp.sampai || undefined,
        cari: sp.cari || undefined,
        halaman: sp.halaman ? Number(sp.halaman) : 1,
      }),
      ambilKartuRingkasan(),
      ambilSebaranTahapan(),
      ambilSebaranStatusPembayaran(),
      ambilTrenBulanan(),
    ]);

  const dataTabel = hasil.baris.map((b) => ({ ...b, umurHari: hitungUmurHari(b.tglGl) }));

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex flex-col gap-6 p-6">
        <KartuRingkasanGL data={ringkasan} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GrafikSebaranTahapan data={sebaranTahapan} />
          <GrafikStatusPembayaran data={sebaranStatusPembayaran} />
          <GrafikTrenBulanan data={trenBulanan} />
        </div>

        <FilterGL nilai={sp} opsi={opsiFilter} />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{hasil.total} GL ditemukan</p>
          <a
            href={buatUrlEkspor(sp)}
            className="h-8 rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Ekspor Excel
          </a>
        </div>

        <TabelGL data={dataTabel} />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Halaman {hasil.halaman} dari {hasil.totalHalaman}
          </span>
          <div className="flex gap-4">
            {hasil.halaman > 1 && (
              <Link href={buatUrlHalaman(sp, hasil.halaman - 1)} className="underline">
                Sebelumnya
              </Link>
            )}
            {hasil.halaman < hasil.totalHalaman && (
              <Link href={buatUrlHalaman(sp, hasil.halaman + 1)} className="underline">
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
