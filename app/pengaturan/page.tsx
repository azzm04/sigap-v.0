import { HeaderApp } from "@/app/header-app";
import { ambilAmbangHari } from "@/lib/pengaturan";
import { ubahAmbangHari } from "./actions";
import { FormUnggah } from "./form-unggah";

export default async function PengaturanPage() {
  const ambangHari = await ambilAmbangHari();

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex max-w-xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="text-base font-semibold text-foreground">Ambang Hari Peringatan</h2>
          <p className="text-sm text-muted-foreground">
            GL yang sudah mencapai jumlah hari ini atau lebih (dan memenuhi syarat lain) akan
            muncul di Papan Peringatan.
          </p>
          <form action={ubahAmbangHari} className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ambangHari" className="text-sm font-medium text-foreground">
                Ambang hari
              </label>
              <input
                id="ambangHari"
                name="ambangHari"
                type="number"
                min={1}
                step={1}
                defaultValue={ambangHari}
                required
                className="h-9 w-32 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Simpan
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="text-base font-semibold text-foreground">Unggah Berkas Ekspor</h2>
          <p className="text-sm text-muted-foreground">
            Unggah berkas ekspor .xlsx &ldquo;KLAIM REPORT&rdquo; dari JRCare untuk memperbarui
            data GL. Berkas diproses langsung dan tidak disimpan di server.
          </p>
          <FormUnggah />
        </section>
      </main>
    </div>
  );
}
