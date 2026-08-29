import { tandaiDitinjau } from "@/app/gl/[idJaminan]/actions";
import { AksiCatatan } from "@/components/gl/aksi-catatan";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { BarisTinjauan } from "@/lib/gl/tinjauan";
import { formatWaktu } from "@/lib/format";

// Catatan tindak lanjut petugas + status Abaikan (CLAUDE.md bagian 5 & 7,
// tabel tinjauan) -- form tambah catatan baru, lalu tabel riwayat catatan
// yang sudah ada (bisa diedit/dihapus lewat AksiCatatan).
export function DetailTinjauan({
  idJaminan,
  catatanTinjauan,
}: {
  idJaminan: string;
  catatanTinjauan: BarisTinjauan[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground md:text-base">
        Tinjauan Petugas
      </h3>

      <Card className="min-w-0">
        <form action={tandaiDitinjau} className="flex min-w-0 flex-col gap-3">
          <input type="hidden" name="idJaminan" value={idJaminan} />
          <label
            htmlFor="catatan"
            className="text-sm md:text-base font-medium text-foreground"
          >
            Catatan
          </label>
          <Textarea
            id="catatan"
            name="catatan"
            required
            rows={3}
            className="min-w-0 text-sm md:text-base leading-relaxed"
            placeholder="Catatan hasil peninjauan GL ini..."
          />
          <Checkbox name="perluTindakLanjut" label="Perlu tindak lanjut" />

          <button
            type="submit"
            className="mt-1 h-8 w-fit rounded-lg bg-primary px-4 text-sm md:text-base font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Tandai Sudah Ditinjau
          </button>
        </form>
      </Card>

      {catatanTinjauan.length === 0 ? (
        <p className="text-sm md:text-base text-muted-foreground">
          Belum ada catatan tinjauan untuk GL ini.
        </p>
      ) : (
        <div className="mt-2 w-full overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-[720px] w-full text-xs sm:text-sm">
            <thead className="bg-surface-table-header">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                  Petugas
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                  Waktu
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-1/6">
                  Label / Status
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm w-3/6">
                  Catatan
                </th>
                <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {catatanTinjauan.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border align-top hover:bg-muted/50 transition-colors"
                >
                  <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap text-xs md:text-sm">
                    {c.namaPengguna}
                  </td>
                  <td className="px-3 py-3 font-mono text-muted-foreground whitespace-nowrap text-xs md:text-sm">
                    {formatWaktu(c.ditinjauPada)}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {!c.diabaikan && !c.perluTindakLanjut && (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {c.diabaikan && <Badge tone="danger">Diabaikan</Badge>}
                      {c.perluTindakLanjut && (
                        <Badge tone="info">Perlu tindak lanjut</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 min-w-[320px] max-w-[560px] whitespace-normal break-words leading-relaxed text-foreground text-xs md:text-sm">
                    {c.catatan}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm">
                    <AksiCatatan
                      id={c.id}
                      idJaminan={idJaminan}
                      catatanAwal={c.catatan}
                      perluTindakLanjutAwal={c.perluTindakLanjut}
                      diabaikan={c.diabaikan}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
