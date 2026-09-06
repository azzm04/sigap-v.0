import { desc } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { hitungUmurHari } from "../format";
import { ambilPetaPicRumahSakit, cariPic } from "./pic";
import { bangunKondisiDaftarGL, type FilterDaftarGL } from "./queries";

export interface BarisEkspor {
  loket: string;
  idJaminan: string;
  namaKorban: string;
  nomorSuratJaminan: string | null;
  namaRumahSakit: string | null;
  picTaskForce: string | null;
  picPengajuan: string | null;
  tglGl: string;
  umurHari: number;
  tahapan: string;
  glStatus: string;
  statusPembayaran: string;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
}

// Ekspor Excel "hasil olahan": baris yang sama persis dengan yang tampil di tabel daftar GL untuk filter yang aktif, tanpa batas halaman.
export async function ambilDataUntukEkspor(filter: FilterDaftarGL): Promise<BarisEkspor[]> {
  const kondisi = await bangunKondisiDaftarGL(filter);

  const [baris, petaPic] = await Promise.all([
    db
      .select({
        loket: glMirror.loket,
        idJaminan: glMirror.idJaminan,
        namaKorban: glMirror.namaKorban,
        nomorSuratJaminan: glMirror.nomorSuratJaminan,
        namaRumahSakit: glMirror.namaRumahSakit,
        tglGl: glMirror.tglGl,
        tahapan: glMirror.tahapan,
        glStatus: glMirror.glStatus,
        statusPembayaran: glMirror.statusPembayaran,
        nilaiDiajukan: glMirror.nilaiDiajukan,
        nilaiDisetujui: glMirror.nilaiDisetujui,
      })
      .from(glMirror)
      .where(kondisi)
      .orderBy(desc(glMirror.tglGl), desc(glMirror.id)),
    ambilPetaPicRumahSakit(),
  ]);

  return baris.map((b) => ({
    ...b,
    umurHari: hitungUmurHari(b.tglGl),
    ...cariPic(petaPic, b.namaRumahSakit),
  }));
}
