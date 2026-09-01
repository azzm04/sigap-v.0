import { simpanTandaTanganAction } from "@/app/pengaturan/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormAksi } from "@/components/ui/form-aksi";
import { Label } from "@/components/ui/label";
import type { BarisTandaTangan } from "@/lib/laporan-tkp/tanda-tangan";
import { BantuanInfo } from "@/components/ui/bantuan-info";

function BarisFormTandaTangan({
  pemilik,
  label,
  data,
  placeholderNama,
}: {
  pemilik: string;
  label: string;
  data: BarisTandaTangan | undefined;
  placeholderNama: string;
}) {
  const idBase = pemilik.replace(/[^a-zA-Z0-9]/g, "-");

  return (
    <FormAksi
      action={simpanTandaTanganAction}
      labelTombol="Simpan"
      judulGagal={`Gagal Menyimpan Tanda Tangan ${label}`}
      className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-end"
      kelasBarisTombol="flex shrink-0 items-end"
      kelasTombol="h-8 px-4"
    >
      <input type="hidden" name="pemilik" value={pemilik} />

      <div className="flex w-full flex-col gap-1.5 sm:w-32">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {data?.gambar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.gambar}
            alt={`Tanda tangan ${label}`}
            className="h-12 w-fit max-w-32 rounded border border-border bg-white object-contain p-1"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Belum diunggah</span>
        )}
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-40">
        <Label htmlFor={`${idBase}-gambar`}>Gambar (PNG/JPEG)</Label>
        <input
          id={`${idBase}-gambar`}
          name="gambar"
          type="file"
          accept="image/png,image/jpeg"
          className="text-xs text-foreground file:mr-2 file:h-7 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:text-xs file:font-medium file:text-foreground"
        />
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-40">
        <Label htmlFor={`${idBase}-nama`}>Nama tampil</Label>
        <Input
          id={`${idBase}-nama`}
          name="namaTampil"
          defaultValue={data?.namaTampil ?? ""}
          placeholder={placeholderNama}
        />
      </div>

      <div className="flex w-full flex-col gap-1.5 sm:w-40">
        <Label htmlFor={`${idBase}-jabatan`}>Jabatan</Label>
        <Input id={`${idBase}-jabatan`} name="jabatan" defaultValue={data?.jabatan ?? ""} />
      </div>

    </FormAksi>
  );
}

export function TandaTanganLaporanTkp({
  daftarTandaTangan,
  pemilikKepalaCabang,
  pemilikPetugasSurvei,
}: {
  daftarTandaTangan: BarisTandaTangan[];
  pemilikKepalaCabang: string;
  pemilikPetugasSurvei: string;
}) {
  const peta = new Map(daftarTandaTangan.map((t) => [t.pemilik, t]));

  return (
    <Card
      title={
        <span className="text-base md:text-lg font-semibold">
          Tanda Tangan Laporan Survei TKP &amp; KSKK
          <BantuanInfo>
            Unggah tanda tangan digital (PNG/JPEG) dan nama tampil untuk Kepala Cabang Semarang dan Mobile Service. Dipakai di Laporan Survei TKP yang dibuat SIGAP, dan ditempelkan ke berkas KSKK saat dibuka -- kecuali kalau centang &quot;Tanda tangan Kepala Cabang &amp; Mobile Service&quot; dilepas saat mengunggah KSKK-nya.
          </BantuanInfo>
        </span>
      }
    >
      <BarisFormTandaTangan
        pemilik={pemilikKepalaCabang}
        label="Kepala Cabang Semarang"
        data={peta.get(pemilikKepalaCabang)}
        placeholderNama="Nama Kepala Cabang"
      />
      <BarisFormTandaTangan
        pemilik={pemilikPetugasSurvei}
        label="Mobile Service"
        data={peta.get(pemilikPetugasSurvei)}
        placeholderNama="Nama Mobile Service"
      />
    </Card>
  );
}
