import Link from "next/link";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { pulihkanBatch } from "@/app/kelola-data/actions";
import { AppShell } from "@/components/layout/app-shell";
import { HapusPermanenDialog } from "@/components/kelola-data/hapus-permanen-dialog";
import { FormAksi } from "@/components/ui/form-aksi";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatWaktu } from "@/lib/format";
import { ambilBatchTerhapus } from "@/lib/gl/sampah";

export default async function SampahPage() {
  const batch = await ambilBatchTerhapus();

  return (
    <AppShell breadcrumbAkhir="Sampah">
      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/kelola-data"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Kelola Data
        </Link>

        <PageHeader
          title="Sampah Data GL"
          description="Data yang pernah dihapus lewat 'Hapus Semua Data' di Kelola Data. Anda dapat memulihkannya atau menghapusnya secara permanen."
        />

        <Card className="overflow-hidden p-0">
          {batch.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Trash2 className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Belum ada data yang dihapus.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-table-header">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Waktu Dihapus</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Aktivitas</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Jumlah Baris</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.map((b) => {
                    const waktuIso = b.dihapusPada.toISOString();
                    return (
                      <tr key={waktuIso} className="border-t border-border align-middle">
                        <td className="px-4 py-3 font-mono whitespace-nowrap text-foreground">
                          {formatWaktu(b.dihapusPada)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                              <Trash2 className="size-4" />
                            </div>
                            <span className="font-medium text-foreground">Hapus Semua Data</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                          {b.jumlahBaris.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <FormAksi
                              action={pulihkanBatch}
                              labelTombol="Pulihkan"
                              ikonTombol={<RotateCcw />}
                              labelTombolProses="Memulihkan..."
                              judulGagal="Gagal Memulihkan Data"
                              kelasTombol="h-8 px-3 text-xs"
                            >
                              <input type="hidden" name="dihapusPada" value={waktuIso} />
                            </FormAksi>
                            <HapusPermanenDialog dihapusPada={waktuIso} jumlahBaris={b.jumlahBaris} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
