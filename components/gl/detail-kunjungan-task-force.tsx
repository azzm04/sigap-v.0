import { simpanKunjunganTaskForce } from "@/app/gl/[idJaminan]/actions";
import { BantuanInfo } from "@/components/ui/bantuan-info";
import { Card } from "@/components/ui/card";
import { FormAksi } from "@/components/ui/form-aksi";

// Form manual PIC Task Force (Tanggal Masuk/Pulang Pasien/Lokasi LAKA) --
// lihat CLAUDE.md bagian 5 & 7 soal Peringatan PIC Task Force.
export function DetailKunjunganTaskForce({
  idJaminan,
  tanggalMasuk,
  tanggalPulangPasien,
  lokasi,
}: {
  idJaminan: string;
  tanggalMasuk: string | null;
  tanggalPulangPasien: string | null;
  lokasi: string | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-foreground sm:text-base">
        Kunjungan PIC Task Force
        <BantuanInfo>
          Diisi PIC Task Force setelah datang ke rumah sakit. Tanggal Masuk
          menandai kasus ini mulai dipantau. Tanggal Pulang Pasien
          menandai korban sudah pulang dari rumah sakit — kalau masih
          kosong dan sudah lewat ambang hari, GL ini akan muncul di
          Peringatan PIC Task Force. Lokasi LAKA otomatis dari berkas
          DASI kalau sudah ter-impor dan cocok — kalau belum, isi manual
          di sini (tetap tertimpa otomatis begitu berkas DASI-nya ada).
        </BantuanInfo>
      </h3>

      <Card className="min-w-0">
        <FormAksi
          action={simpanKunjunganTaskForce}
          labelTombol="Simpan"
          judulGagal="Gagal Menyimpan Data Kunjungan"
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap"
          kelasBarisTombol="flex shrink-0 items-end"
        >
          <input type="hidden" name="idJaminan" value={idJaminan} />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tanggalMasuk"
              className="text-xs md:text-sm font-medium text-foreground"
            >
              Tanggal Masuk
            </label>
            <input
              id="tanggalMasuk"
              name="tanggalMasuk"
              type="date"
              defaultValue={tanggalMasuk ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tanggalPulangPasien"
              className="text-xs md:text-sm font-medium text-foreground"
            >
              Tanggal Pulang Pasien
            </label>
            <input
              id="tanggalPulangPasien"
              name="tanggalPulangPasien"
              type="date"
              defaultValue={tanggalPulangPasien ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
            />
          </div>
          <div className="flex flex-1 min-w-40 flex-col gap-1.5">
            <label htmlFor="lokasi" className="text-xs md:text-sm font-medium text-foreground">
              Lokasi LAKA {lokasi ? "" : "(manual, DASI belum ada)"}
            </label>
            <input
              id="lokasi"
              name="lokasi"
              defaultValue={lokasi ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </FormAksi>
      </Card>
    </section>
  );
}
