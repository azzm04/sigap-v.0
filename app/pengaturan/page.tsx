import { AppShell } from "@/components/layout/app-shell";
import { FormKataSandi } from "@/components/pengaturan/form-kata-sandi";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { ambilAmbangHari } from "@/lib/pengaturan";
import { ubahAmbangHari } from "./actions";

export default async function PengaturanPage() {
  const ambangHari = await ambilAmbangHari();

  return (
    <AppShell>
      {/* Ubah max-w-2xl menjadi max-w-6xl agar ada ruang lebih lebar untuk 2 kolom */}
      <div className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Pengaturan"
          description="Kelola ambang batas peringatan dan kata sandi akun."
        />

        {/* Bungkus Card dengan Grid: 1 kolom di HP, 2 kolom di tablet (md) ke atas */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <Card
            title="Ambang Hari Peringatan"
            description="GL yang sudah mencapai jumlah hari ini atau lebih (dan memenuhi syarat lain) akan muncul di Papan Peringatan."
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
          </Card>

          <Card
            title="Ubah Kata Sandi"
            description="Ganti kata sandi Anda secara berkala untuk menjaga keamanan akun SIGAP."
          >
            <FormKataSandi />
          </Card>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Aplikasi tidak pernah menyentuh DASI atau JRCare secara langsung. Data
          hanya masuk lewat unggahan berkas ekspor di halaman Kelola Data.
        </p>
      </div>
    </AppShell>
  );
}
