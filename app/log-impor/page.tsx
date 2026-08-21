import { HeaderApp } from "@/app/header-app";
import { formatWaktu } from "@/lib/format";
import { ambilRiwayatImpor } from "@/lib/impor-log";

export default async function LogImporPage() {
  const riwayat = await ambilRiwayatImpor();

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Log Impor</h2>
          <p className="text-sm text-muted-foreground">
            Riwayat unggahan berkas ekspor, 100 terbaru.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Waktu</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Nama Berkas
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hasil</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Jumlah Baris
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Baru</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Berubah</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Belum ada berkas yang diunggah.
                  </td>
                </tr>
              )}
              {riwayat.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatWaktu(r.diimporPada)}</td>
                  <td className="px-3 py-2">{r.namaBerkas}</td>
                  <td className="px-3 py-2">
                    {r.berhasil ? (
                      <span className="rounded bg-green-600/10 px-2 py-0.5 text-green-700">
                        Berhasil
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="w-fit rounded bg-destructive/10 px-2 py-0.5 text-destructive">
                          Ditolak
                        </span>
                        {r.alasanPenolakan && (
                          <span className="text-xs text-muted-foreground">
                            {r.alasanPenolakan}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{r.jumlahBaris.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right">{r.jumlahBaru.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2 text-right">
                    {r.jumlahBerubah.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
