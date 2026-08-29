import { AppShell } from "@/components/layout/app-shell";
import { FormKataSandi } from "@/components/pengaturan/form-kata-sandi";
import { PicRumahSakit } from "@/components/pengaturan/pic-rumah-sakit";
import { TandaTanganLaporanTkp } from "@/components/pengaturan/tanda-tangan";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { ambilSemuaPicRumahSakit } from "@/lib/gl/pic";
import {
  ambilSemuaTandaTangan,
  PEMILIK_KEPALA_CABANG,
  PEMILIK_PETUGAS_SURVEI,
} from "@/lib/laporan-tkp/tanda-tangan";
import { ambilAmbangHari, ambilBatasRiwayat } from "@/lib/pengaturan";
import { ubahAmbangHari, ubahBatasRiwayat } from "./actions";

export default async function PengaturanPage() {
  const [ambangHari, batasRiwayat, picRumahSakit, daftarTandaTangan] = await Promise.all([
    ambilAmbangHari(),
    ambilBatasRiwayat(),
    ambilSemuaPicRumahSakit(),
    ambilSemuaTandaTangan(),
  ]);

  return (
    <AppShell>
      {/* Ubah max-w-2xl menjadi max-w-6xl agar ada ruang lebih lebar untuk 2 kolom */}
      <div className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title = {
            <span className="text-lg font-semibold">
              Pengaturan
            <BantuanInfo>Kelola ambang batas peringatan dan kata sandi akun.</BantuanInfo>
            </span>
          }
        />

        {/* Bungkus Card dengan Grid: 1 kolom di HP, 2 kolom di tablet (md) ke atas */}
        <div className="grid grid-cols-2 items-start gap-6 md:grid-cols-2">
          <Card
            title={
              <span className="inline-flex items-center gap-1.5">
                Ambang Hari Peringatan
              </span>
            }
            description={
              <span className="text-sm">
                Jumlah hari sejak Tanggal Kejadian (Tgl LAKA DASI) yang menjadi ambang batas
                peringatan. Jika GL sudah melewati ambang ini, status GL akan berubah menjadi
                Peringatan.
              </span>
            }
          >
            <form
              action={ubahAmbangHari}
              className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <div className="flex w-full flex-col gap-1.5 sm:w-auto">
                <Label htmlFor="ambangHari" required>
                  Ambang hari
                </Label>
                <input
                  id="ambangHari"
                  name="ambangHari"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={ambangHari}
                  required
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-32"
                />
              </div>
              <button
                type="submit"
                className="h-10 w-full shrink-0 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:w-auto"
              >
                Simpan Perubahan
              </button>
            </form>

            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                Batas Riwayat Log Data
              </h4>
              <p className="text-sm text-muted-foreground">
                Jumlah baris riwayat log data yang ditampilkan di halaman Kelola Data. Jika riwayat lebih panjang dari batas ini, halaman Kelola Data menampilkan `Detail Riwayat`
              </p>
              <form
                action={ubahBatasRiwayat}
                className="flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <div className="flex w-full flex-col gap-1.5 sm:w-auto">
                  <Label htmlFor="batasRiwayat" required>
                    Batas riwayat
                  </Label>
                  <input
                    id="batasRiwayat"
                    name="batasRiwayat"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={batasRiwayat}
                    required
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-32"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 w-full shrink-0 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover sm:w-auto"
                >
                  Simpan Perubahan
                </button>
              </form>
            </div>
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1.5">
                Ubah Kata Sandi
                <BantuanInfo>
                  Ganti kata sandi Anda secara berkala untuk menjaga keamanan akun SIGAP.
                </BantuanInfo>
              </span>
            }
          >
            <FormKataSandi />
          </Card>
        </div>

        <PicRumahSakit data={picRumahSakit} />

        <TandaTanganLaporanTkp
          daftarTandaTangan={daftarTandaTangan}
          pemilikKepalaCabang={PEMILIK_KEPALA_CABANG}
          pemilikPetugasSurvei={PEMILIK_PETUGAS_SURVEI}
        />

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Aplikasi tidak pernah menyentuh DASI atau JRCare secara langsung. Data
          hanya masuk lewat unggahan berkas ekspor di halaman Kelola Data.
        </p>
      </div>
    </AppShell>
  );
}
