import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import type { DetailGL } from "@/lib/gl/detail";
import type { BarisTinjauan } from "@/lib/gl/tinjauan";
import type { HasilStagnasi } from "@/lib/gl/stagnasi";
import { formatRupiah, formatTanggal, formatTanggalOpsional, formatWaktu } from "@/lib/format";

// Header ringkasan halaman detail GL: banner "diabaikan otomatis" (kalau
// ada) + kartu identitas/atribut lengkap. Digabung satu komponen karena
// keduanya sama-sama tampilan murni dari detail GL saat ini, tanpa form.
export function DetailRingkasan({
  detail,
  umurHari,
  stagnasi,
  diabaikanAktif,
}: {
  detail: DetailGL;
  umurHari: number;
  stagnasi: HasilStagnasi;
  diabaikanAktif: BarisTinjauan | null;
}) {
  return (
    <>
      {diabaikanAktif && (
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-primary/30 bg-status-info-bg p-3 text-xs leading-relaxed sm:p-4 sm:text-sm">
          <p className="font-medium break-words text-foreground">
            Status Pembayaran ditandai Paid secara manual lewat Tahap
            Proses di Sistem Pusat, bukan dari berkas impor.
          </p>
          <p className="break-words text-muted-foreground">
            Alasan: {diabaikanAktif.alasanAbaikan ?? diabaikanAktif.catatan} —
            oleh {diabaikanAktif.namaPengguna},{" "}
            {formatWaktu(diabaikanAktif.ditinjauPada)}
          </p>
        </div>
      )}

      <Card className="min-w-0">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="min-w-0 break-words text-base font-semibold leading-snug text-foreground sm:text-lg">
            {detail.namaKorban}
          </h2>
          <div className="flex min-w-0 flex-col gap-2 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="whitespace-nowrap">
              Umur GL:{" "}
              <span className="font-mono font-semibold text-foreground">
                {umurHari} hari
              </span>
            </span>
            <span className="break-words">
              Stagnasi:{" "}
              <span className="font-mono font-semibold text-foreground">
                {stagnasi.hariDiTahapan} hari
              </span>{" "}
              di tahapan ini
              {stagnasi.berdasarkanUmur && (
                <Badge
                  tone="neutral"
                  className="ml-1.5 mt-1 inline-block sm:mt-0"
                  title="Riwayat tahapan belum menangkap kapan GL ini masuk tahapan saat ini, jadi dipakai umur GL sebagai perkiraan."
                >
                  berdasarkan umur
                </Badge>
              )}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Field label="Nomor ID Jaminan" value={detail.idJaminan} mono />
          <Field
            label="Nomor Surat Jaminan"
            value={detail.nomorSuratJaminan}
            mono
          />
          <Field label="Loket" value={detail.loket} />
          <Field label="Nama Rumah Sakit" value={detail.namaRumahSakit} />
          <Field label="Tipe Klaim" value={detail.tipeKlaim} />
          <Field label="Tipe Cidera" value={detail.tipeCidera} />
          <Field label="Status GL" value={detail.glStatus} />
          <Field label="Tahapan" value={detail.tahapan} />
          <Field label="Status Verifikasi" value={detail.statusVerifikasi} />
          <Field
            label="Status Pembayaran"
            value={
              <Badge
                tone={detail.statusPembayaran === "Paid" ? "solidOk" : "warn"}
                pill={detail.statusPembayaran === "Paid"}
              >
                {detail.statusPembayaran}
              </Badge>
            }
          />
          <Field label="Tgl GL" value={formatTanggal(detail.tglGl)} mono />
          <Field
            label="Tgl Diajukan"
            value={formatTanggalOpsional(detail.tglDiajukan)}
            mono
          />
          <Field
            label="Tgl Verifikasi"
            value={formatTanggalOpsional(detail.tglVerifikasi)}
            mono
          />
          <Field
            label="Tgl LAKA (DASI)"
            value={formatTanggalOpsional(detail.tglKejadian)}
            mono
          />
          <Field label="Lokasi (DASI)" value={detail.lokasi ?? "-"} />
          <Field
            label="Tgl Pembayaran"
            value={formatTanggalOpsional(detail.tglPembayaran)}
            mono
          />
          <Field
            label="Nilai Diajukan"
            value={formatRupiah(detail.nilaiDiajukan)}
            mono
          />
          <Field
            label="Nilai Disetujui"
            value={formatRupiah(detail.nilaiDisetujui)}
            mono
          />
          <Field
            label="Jumlah Pembayaran"
            value={formatRupiah(detail.jumlahPembayaran)}
            mono
          />
        </dl>

        <p className="mt-4 text-xs text-muted-foreground">
          Data diimpor terakhir: {formatWaktu(detail.diimporPada)}
        </p>
      </Card>
    </>
  );
}
