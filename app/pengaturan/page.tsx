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
      <div className="flex max-w-3xl flex-col gap-6 p-8">
        <PageHeader
          title="Pengaturan"
          description="Kelola ambang batas peringatan dan kata sandi akun."
        />

        <Card
          title="Ambang Hari Peringatan"
          description="GL yang sudah mencapai jumlah hari ini atau lebih (dan memenuhi syarat lain) akan muncul di Papan Peringatan."
        >
          <form action={ubahAmbangHari} className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
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
                className="h-9 w-32 rounded-lg border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
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

        <p className="text-xs text-muted-foreground">
          Aplikasi tidak pernah menyentuh DASI atau JRCare secara langsung. Data hanya masuk lewat
          unggahan berkas ekspor di halaman Kelola Data.
        </p>
      </div>
    </AppShell>
  );
}
