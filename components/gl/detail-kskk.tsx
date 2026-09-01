import { simpanKskk } from "@/app/gl/[idJaminan]/actions";
import { type BarisDokumen, TabelDokumen } from "@/components/gl/tabel-dokumen";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { FormAksi } from "@/components/ui/form-aksi";

// Unggah KSKK (PDF, di luar sistem) + tabel gabungan dokumen GL (KSKK +
// riwayat Laporan Survei TKP) -- lihat components/gl/tabel-dokumen.tsx.
export function DetailKskk({
  idJaminan,
  kskkNamaBerkas,
  kskkTempelTtd,
  daftarDokumen,
  dokumenTerkunci,
}: {
  idJaminan: string;
  kskkNamaBerkas: string | null;
  /** Penanda pada KSKK yang sudah terunggah -- dipakai sebagai nilai awal checkbox */
  kskkTempelTtd: boolean;
  daftarDokumen: BarisDokumen[];
  dokumenTerkunci: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        KSKK
        <BantuanInfo>
          KSKK tidak bisa dibuat otomatis oleh SIGAP -- unggah berkas PDF hasil kerja PIC
          Pengajuan di luar sistem. Tanda tangan Kepala Cabang dan Mobile Service ditempelkan
          SIGAP saat berkas dibuka, memakai gambar dari halaman Pengaturan. Lepas centangnya
          untuk KSKK GL pelimpahan yang sudah bertanda tangan dari loket lain, supaya tanda
          tangannya tidak dobel.
        </BantuanInfo>
      </h3>

      <Card className="min-w-0">
        <FormAksi
          action={simpanKskk}
          labelTombol="Unggah KSKK"
          labelTombolProses="Mengunggah..."
          judulGagal="Gagal Mengunggah KSKK"
          className="flex min-w-0 flex-col gap-3"
          kelasBarisTombol="order-3"
        >
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

          <label
            htmlFor="tempelTtd"
            className="flex w-fit items-start gap-2 text-sm leading-relaxed text-foreground"
          >
            <input
              id="tempelTtd"
              name="tempelTtd"
              type="checkbox"
              defaultChecked={kskkTempelTtd}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span>
              Tanda tangan Kepala Cabang &amp; Mobile Service
              <span className="block text-xs text-muted-foreground">
                Lepas centang kalau berkasnya sudah bertanda tangan dari loket lain (GL
                pelimpahan).
              </span>
            </span>
          </label>
        </FormAksi>
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
