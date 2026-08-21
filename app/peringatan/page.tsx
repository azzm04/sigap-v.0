import Link from "next/link";
import { HeaderApp } from "@/app/header-app";
import { formatTanggal } from "@/lib/format";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import { abaikanGL } from "./actions";

export default async function PapanPeringatanPage() {
  const { baris, ambangHari } = await ambilPapanPeringatan();

  return (
    <div className="min-h-screen bg-background">
      <HeaderApp />

      <main className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Papan Peringatan</h2>
          <p className="text-sm text-muted-foreground">
            GL yang sudah {ambangHari} hari atau lebih, masih di tahap Verifikasi User atau
            Done, dan belum dibayar.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">{baris.length} GL perlu ditinjau</p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Nomor ID Jaminan
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Nama Korban
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Loket</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Nama Rumah Sakit
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tgl GL</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tahapan</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Status Pembayaran
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Umur (hari)
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {baris.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Tidak ada GL yang perlu ditinjau saat ini.
                  </td>
                </tr>
              )}
              {baris.map((b) => (
                <tr key={b.idJaminan} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/gl/${encodeURIComponent(b.idJaminan)}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {b.idJaminan}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.namaKorban}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.loket}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.namaRumahSakit ?? "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(b.tglGl)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.tahapan}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.statusPembayaran}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-destructive">
                    {b.umurHari}
                  </td>
                  <td className="px-3 py-2">
                    <form action={abaikanGL} className="flex items-center gap-1">
                      <input type="hidden" name="idJaminan" value={b.idJaminan} />
                      <input
                        type="text"
                        name="alasan"
                        required
                        placeholder="Alasan abaikan..."
                        className="h-7 w-36 rounded border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                      />
                      <button
                        type="submit"
                        className="h-7 shrink-0 rounded border border-input px-2 text-xs whitespace-nowrap hover:bg-muted"
                      >
                        Abaikan
                      </button>
                    </form>
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
