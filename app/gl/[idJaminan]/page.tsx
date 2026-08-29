import { ChevronsLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DetailKskk } from "@/components/gl/detail-kskk";
import { DetailKunjunganTaskForce } from "@/components/gl/detail-kunjungan-task-force";
import { DetailLaporanTkp } from "@/components/gl/detail-laporan-tkp";
import { DetailRingkasan } from "@/components/gl/detail-ringkasan";
import { DetailRiwayatTahapan } from "@/components/gl/detail-riwayat-tahapan";
import { DetailTahapProsesPusat } from "@/components/gl/detail-tahap-proses-pusat";
import { DetailTinjauan } from "@/components/gl/detail-tinjauan";
import { type BarisDokumen } from "@/components/gl/tabel-dokumen";
import { ambilDetailGL, ambilRiwayatTahapan } from "@/lib/gl/detail";
import { hitungStagnasi } from "@/lib/gl/stagnasi";
import {
  ambilPilihanTahapProses,
  ambilRiwayatTahapProses,
  TAHAP_KELUAR_PERINGATAN,
  TAHAP_PEMICU_PAID,
} from "@/lib/gl/tahap-proses";
import { ambilTinjauan } from "@/lib/gl/tinjauan";
import { dekripsiToken } from "@/lib/gl/token-url";
import { hitungUmurHari } from "@/lib/format";
import { ambilRiwayatLaporanTkp } from "@/lib/laporan-tkp/laporan";
import { ambilTandaTangan, PEMILIK_PETUGAS_SURVEI } from "@/lib/laporan-tkp/tanda-tangan";

export default async function DetailGLPage({
  params,
  searchParams,
}: {
  params: Promise<{ idJaminan: string }>;
  searchParams: Promise<{ dari?: string }>;
}) {
  // Segmen route [idJaminan] sekarang berisi token terenkripsi, bukan
  // Nomor ID Jaminan asli -- lihat lib/gl/token-url.ts. Token yang rusak
  // atau dipalsukan (mis. hasil tebak-tebakan) gagal didekripsi dan
  // langsung 404, tanpa pernah menyentuh database.
  const { idJaminan: tokenMentah } = await params;
  const idJaminan = dekripsiToken(decodeURIComponent(tokenMentah));
  if (!idJaminan) notFound();

  const { dari } = await searchParams;
  const dariPeringatan = dari === "peringatan";

  const [detail, riwayat, catatanTinjauan, pilihanTahapProses, riwayatTahapProses, ttdPetugasSurvei, riwayatLaporanTkp] =
    await Promise.all([
      ambilDetailGL(idJaminan),
      ambilRiwayatTahapan(idJaminan),
      ambilTinjauan(idJaminan),
      ambilPilihanTahapProses(),
      ambilRiwayatTahapProses(idJaminan),
      ambilTandaTangan(PEMILIK_PETUGAS_SURVEI),
      ambilRiwayatLaporanTkp(idJaminan),
    ]);

  if (!detail) notFound();

  const umurHari = hitungUmurHari(detail.tglGl);
  const stagnasi = hitungStagnasi(riwayat, detail.tglGl);
  const diabaikanAktif = catatanTinjauan.find((c) => c.diabaikan) ?? null;
  const tahapTerkini = riwayatTahapProses[0] ?? null;
  // Begitu GL sudah "Berkas Diajukan Ke Pusat" atau "Berkas Selesai", KSKK
  // dan Laporan Survei TKP jadi bukti historis apa yang benar dikirim ke
  // pusat -- tombol Hapus di TabelDokumen dikunci (Ganti berkas tetap
  // aktif untuk koreksi). Mencegah GL "nyangkut" di Proses Pusat/status
  // Diajukan Ke Pusat tanpa dokumen yang jadi syaratnya. Guard yang sama
  // juga ditegakkan di server (hapusKskk/hapusLaporanTkp, actions.ts).
  const dokumenTerkunci =
    tahapTerkini?.tahap === TAHAP_KELUAR_PERINGATAN || tahapTerkini?.tahap === TAHAP_PEMICU_PAID;
  const namaPetugasSurvei = ttdPetugasSurvei?.namaTampil?.trim() || null;
  // Tgl Kejadian (Tgl LAKA DASI) boleh digantikan Tanggal Masuk -- keduanya
  // dianggap tanggal yang sama secara operasional (arahan pemilik proyek),
  // dan Tanggal Masuk sudah punya jalur isi manual sendiri di form
  // Kunjungan PIC Task Force, jadi tidak perlu input Tgl LAKA terpisah.
  // Lokasi TETAP wajib -- diisi manual di form yang sama kalau DASI belum ada.
  const tglKejadianEfektif = detail.tglKejadian ?? detail.tanggalMasuk;
  const dataLaporanTkpLengkap = !!detail.lokasi && !!tglKejadianEfektif;
  const perluTanggalSurveiManual = !detail.tanggalMasuk;

  // Laporan Survei TKP (bisa banyak, riwayat) dan KSKK (maks satu per GL,
  // lihat kolom kskk* di gl_mirror) disatukan jadi satu tabel dokumen --
  // lihat components/gl/tabel-dokumen.tsx.
  const daftarDokumen: BarisDokumen[] = [
    ...riwayatLaporanTkp.map((l) => ({
      jenis: "Laporan Survei TKP" as const,
      key: `tkp-${l.id}`,
      label: l.nomorLp,
      waktu: l.dibuatPada,
      petugas: l.namaPengguna,
      hrefLihat: `/api/laporan-tkp/${l.id}`,
      hrefUnduh: `/api/laporan-tkp/${l.id}?unduh=1`,
      laporanId: l.id,
    })),
    ...(detail.kskkNamaBerkas && detail.kskkDiunggahPada
      ? [
          {
            jenis: "KSKK" as const,
            key: "kskk",
            label: detail.kskkNamaBerkas,
            waktu: detail.kskkDiunggahPada,
            petugas: null,
            hrefLihat: `/api/kskk/${tokenMentah}`,
            hrefUnduh: `/api/kskk/${tokenMentah}?unduh=1`,
            laporanId: null,
          },
        ]
      : []),
  ].sort((a, b) => b.waktu.getTime() - a.waktu.getTime());

  return (
    <AppShell
      asalHref={dariPeringatan ? "/peringatan" : undefined}
      breadcrumbAkhir={detail.namaKorban}
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <Link
          href={dariPeringatan ? "/peringatan" : "/"}
          className="flex w-fit items-center gap-1 text-xs leading-relaxed text-muted-foreground hover:text-foreground sm:text-sm"
        >
          <ChevronsLeft className="size-4 shrink-0" />
          Kembali ke {dariPeringatan ? "Papan Peringatan" : "daftar GL"}
        </Link>

        <DetailRingkasan
          detail={detail}
          umurHari={umurHari}
          stagnasi={stagnasi}
          diabaikanAktif={diabaikanAktif}
        />

        <DetailKunjunganTaskForce
          idJaminan={detail.idJaminan}
          tanggalMasuk={detail.tanggalMasuk}
          tanggalPulangPasien={detail.tanggalPulangPasien}
          lokasi={detail.lokasi}
        />

        <DetailLaporanTkp
          detail={detail}
          tglKejadianEfektif={tglKejadianEfektif}
          dataLaporanTkpLengkap={dataLaporanTkpLengkap}
          perluTanggalSurveiManual={perluTanggalSurveiManual}
          namaPetugasSurvei={namaPetugasSurvei}
        />

        <DetailKskk
          idJaminan={detail.idJaminan}
          kskkNamaBerkas={detail.kskkNamaBerkas}
          daftarDokumen={daftarDokumen}
          dokumenTerkunci={dokumenTerkunci}
        />

        <DetailRiwayatTahapan riwayat={riwayat} />

        <DetailTahapProsesPusat
          idJaminan={detail.idJaminan}
          pilihanTahapProses={pilihanTahapProses}
          tahapTerkini={tahapTerkini}
        />

        <DetailTinjauan idJaminan={detail.idJaminan} catatanTinjauan={catatanTinjauan} />
      </div>
    </AppShell>
  );
}
