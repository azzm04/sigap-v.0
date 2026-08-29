import { simpanKskk } from "@/app/gl/[idJaminan]/actions";
import { type BarisDokumen, TabelDokumen } from "@/components/gl/tabel-dokumen";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";

// Unggah KSKK (PDF, di luar sistem) + tabel gabungan dokumen GL (KSKK +
// riwayat Laporan Survei TKP) -- lihat components/gl/tabel-dokumen.tsx.
export function DetailKskk({
  idJaminan,
  kskkNamaBerkas,
  daftarDokumen,
  dokumenTerkunci,
}: {
  idJaminan: string;
  kskkNamaBerkas: string | null;
  daftarDokumen: BarisDokumen[];
  dokumenTerkunci: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        KSKK
        <BantuanInfo>
          KSKK tidak bisa dibuat otomatis oleh SIGAP -- unggah berkas PDF hasil kerja PIC
          Pengajuan di luar sistem.
        </BantuanInfo>
      </h3>

      <Card className="min-w-0">
        <form action={simpanKskk} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="idJaminan" value={idJaminan} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kskk" className="text-sm md:text-base font-medium text-foreground">
              {kskkNamaBerkas ? "Ganti berkas KSKK (PDF)" : "Berkas KSKK (PDF)"}
            </label>
            <input
              id="kskk"
              name="kskk"
              type="file"
              accept="application/pdf"
              className="text-sm text-foreground file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:text-sm file:font-medium file:text-foreground sm:w-80"
            />
          </div>
          <button
            type="submit"
            className="h-9 w-fit shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Unggah KSKK
          </button>
        </form>
      </Card>

      {daftarDokumen.length > 0 && (
        <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
          Dokumen GL (Laporan Survei TKP &amp; KSKK)
        </h3>
      )}
      <TabelDokumen idJaminan={idJaminan} daftar={daftarDokumen} terkunci={dokumenTerkunci} />
    </section>
  );
}
