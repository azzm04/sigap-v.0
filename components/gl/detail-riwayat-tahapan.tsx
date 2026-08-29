import { BantuanInfo } from "@/components/ui/bantuan-info";
import type { BarisRiwayatTahapan } from "@/lib/gl/detail";
import { formatWaktu } from "@/lib/format";

// Riwayat perubahan Tahapan/Status Verifikasi/Status Pembayaran dari
// gl_snapshot -- lihat CLAUDE.md bagian 5, satu baris per impor yang
// benar-benar mengubah nilainya (bukan tiap impor).
export function DetailRiwayatTahapan({ riwayat }: { riwayat: BarisRiwayatTahapan[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        Riwayat Tahapan
        {riwayat.length <= 1 && (
          <BantuanInfo>
            Riwayat baru mulai tercatat sejak GL ini pertama kali diimpor ke
            SIGAP. Belum ada perubahan tahapan yang tercatat di luar keadaan
            saat ini.
          </BantuanInfo>
        )}
      </h3>

      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-[720px] w-full text-xs sm:text-sm">
          <thead className="bg-surface-table-header">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                Dicatat pada
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                Tahapan
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                Status Verifikasi
              </th>
              <th className="px-3 py-2 text-left font-semibold text-foreground text-xs md:text-sm">
                Status Pembayaran
              </th>
            </tr>
          </thead>
          <tbody>
            {riwayat.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono whitespace-nowrap text-xs md:text-sm">
                  {formatWaktu(r.direkamPada)}
                </td>
                <td className="px-3 py-2 whitespace-normal wrap-break-words text-xs md:text-sm">
                  {r.tahapan}
                </td>
                <td className="px-3 py-2 whitespace-normal wrap-break-words text-xs md:text-sm">
                  {r.statusVerifikasi ?? "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                  {r.statusPembayaran}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
