import { unggahLaporanTkp } from "@/app/gl/[idJaminan]/actions";
import { FormLaporanTkp } from "@/components/gl/form-laporan-tkp";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { FormAksi } from "@/components/ui/form-aksi";
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
          GL. Mobile Service TETAP untuk semua laporan (bukan dari PIC GL
          ini) — hanya Nomor LP, Alamat Korban, Uraian dan Kesimpulan, Nama
          Saksi (+ Tanda Tangan Saksi, opsional) yang diisi manual.
          Hari/Tanggal Survei otomatis dari Tanggal Masuk kalau sudah
          diisi, kalau belum wajib diisi manual. Tanda tangan Kepala
          Cabang dan Mobile Service diambil dari halaman Pengaturan.
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

          </ul>
        </div>
      )}

      <Card className="min-w-0">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Nama Korban (otomatis)" value={detail.namaKorban} />
          <Field label="Mobile Service (tetap)" value={namaPetugasSurvei} />
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

      <Card className="min-w-0">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm md:text-base font-medium text-foreground">
            Atau unggah laporan yang sudah ada
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Untuk kasus lama yang Laporan Survei TKP-nya sudah pernah dibuat di luar SIGAP --
            tidak perlu diketik ulang lewat form di atas. Berkas PDF disimpan apa adanya,
            maksimal 10 MB, dan tetap dihitung sebagai Laporan Survei TKP untuk syarat
            kelengkapan dokumen.
          </span>
        </div>

        <FormAksi
          action={unggahLaporanTkp}
          labelTombol="Unggah Laporan"
          labelTombolProses="Mengunggah..."
          judulGagal="Gagal Mengunggah Laporan Survei TKP"
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
          kelasBarisTombol="flex shrink-0 items-end"
        >
          <input type="hidden" name="idJaminan" value={detail.idJaminan} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="berkasLaporanTkp"
              className="text-sm md:text-base font-medium text-foreground"
            >
              Berkas Laporan Survei TKP (PDF)
            </label>
            <input
              id="berkasLaporanTkp"
              name="berkas"
              type="file"
              accept="application/pdf"
              className="text-sm text-foreground file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:text-sm file:font-medium file:text-foreground sm:w-80"
            />
          </div>
        </FormAksi>
      </Card>

    </section>
  );
}
