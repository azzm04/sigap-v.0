import { FormTahapProses } from "@/components/gl/form-tahap-proses";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import type { BarisTahapProses } from "@/lib/gl/tahap-proses";
import { TAHAP_PEMICU_PAID } from "@/lib/gl/tahap-proses";
import { formatWaktu } from "@/lib/format";

// Tahap proses di sistem pusat (Sub Pra-Verifikasi s.d. Berkas Selesai) --
// dicatat manual karena SIGAP tidak terhubung ke sistem pusat (CLAUDE.md
// bagian 5, status_proses_pusat). Mencapai "Berkas Selesai" memicu
// Status Pembayaran otomatis jadi Paid, lihat FormTahapProses untuk
// pop-up konfirmasinya.
export function DetailTahapProsesPusat({
  idJaminan,
  pilihanTahapProses,
  tahapTerkini,
  daftarLoket,
}: {
  idJaminan: string;
  pilihanTahapProses: string[];
  tahapTerkini: BarisTahapProses | null;
  daftarLoket: string[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        Tahap Proses di Sistem Pusat
        <BantuanInfo>
          Diisi manual oleh petugas berdasarkan pengecekan langsung di
          sistem pusat, karena SIGAP tidak terhubung ke sistem pusat.
          Tahap boleh dipilih bebas sesuai kondisi terkini. Memilih
          &quot;Berkas Belum Di Limpah&quot; mewajibkan pilih loket cabang
          tujuan, dan GL-nya masuk ke halaman Pelimpahan sampai tahap
          berikutnya dicatat. Dua tahap pertama sama-sama mensyaratkan
          Laporan Survei TKP dan KSKK sudah ada. Begitu tahap &quot;Berkas
          Selesai&quot; dicatat, Status Pembayaran otomatis menjadi Paid.
        </BantuanInfo>
      </h3>

      <Card className="min-w-0">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm md:text-base font-medium text-muted-foreground">
            Tahap terkini
          </span>
          {tahapTerkini ? (
            <span className="text-sm md:text-base font-semibold text-foreground">
              {tahapTerkini.tahap}
              {tahapTerkini.loketPelimpahan ? ` — ${tahapTerkini.loketPelimpahan}` : ""}{" "}
              <span className="font-normal text-muted-foreground">
                — dicatat {formatWaktu(tahapTerkini.dicatatPada)} oleh{" "}
                {tahapTerkini.namaPengguna}
              </span>
            </span>
          ) : (
            <span className="text-sm md:text-base text-muted-foreground">
              Belum pernah dicatat.
            </span>
          )}
        </div>

        <FormTahapProses
          idJaminan={idJaminan}
          pilihanTahapProses={pilihanTahapProses}
          tahapPemicuPaid={TAHAP_PEMICU_PAID}
          daftarLoket={daftarLoket}
        />
      </Card>
    </section>
  );
}
