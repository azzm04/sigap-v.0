import { FormLaporanTkp } from "@/components/gl/form-laporan-tkp";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import type { DetailGL } from "@/lib/gl/detail";
import { formatTanggal } from "@/lib/format";

// Generator Laporan Survei TKP (Tahap 2, CLAUDE.md bagian 6) -- ringkasan
// data otomatis + form input manual (Nomor LP, Alamat Korban, dst).
export function DetailLaporanTkp({
  detail,
  tglKejadianEfektif,
  dataLaporanTkpLengkap,
  perluTanggalSurveiManual,
  namaPetugasSurvei,
}: {
  detail: DetailGL;
  tglKejadianEfektif: string | null;
  dataLaporanTkpLengkap: boolean;
  perluTanggalSurveiManual: boolean;
  namaPetugasSurvei: string | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        Laporan Survei TKP
        <BantuanInfo>
          Nama Korban dan Tempat/Tgl Kecelakaan diambil otomatis dari data
          GL. Petugas Survei TETAP untuk semua laporan (bukan dari PIC GL
          ini) — hanya Nomor LP, Alamat Korban, Uraian dan Kesimpulan, Nama
          Saksi (+ Tanda Tangan Saksi, opsional) yang diisi manual.
          Hari/Tanggal Survei otomatis dari Tanggal Masuk kalau sudah
          diisi, kalau belum wajib diisi manual. Tanda tangan Kepala
          Cabang dan Petugas Survei diambil dari halaman Pengaturan.
        </BantuanInfo>
      </h3>

      {!dataLaporanTkpLengkap && (
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-status-near/30 bg-status-near-bg p-3 leading-relaxed sm:p-4 sm:text-sm">
          <p className="font-medium text-foreground">
            Data belum lengkap untuk membuat Laporan Survei TKP:
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            {!detail.lokasi && (
              <li>Lokasi LAKA belum terisi -- isi manual lewat form Kunjungan PIC Task Force di atas</li>
            )}
            {!tglKejadianEfektif && (
              <li>Tgl LAKA (DASI) dan Tanggal Masuk dua-duanya belum terisi</li>
            )}
          </ul>
        </div>
      )}

      <Card className="min-w-0">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Nama Korban (otomatis)" value={detail.namaKorban} />
          <Field label="Petugas Survei (tetap)" value={namaPetugasSurvei} />
          <Field
            label={
              detail.tglKejadian
                ? "Tempat/Tgl Kecelakaan (otomatis)"
                : "Tempat/Tgl Kecelakaan (otomatis, tanggal dari Tanggal Masuk)"
            }
            value={
              detail.lokasi && tglKejadianEfektif
                ? `${detail.lokasi}, ${formatTanggal(tglKejadianEfektif)}`
                : null
            }
          />
        </dl>

        <FormLaporanTkp
          idJaminan={detail.idJaminan}
          dataLaporanTkpLengkap={dataLaporanTkpLengkap}
          perluTanggalSurveiManual={perluTanggalSurveiManual}
        />
      </Card>
    </section>
  );
}
