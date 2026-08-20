import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, glSnapshot } from "../db/schema";

export interface DetailGL {
  idJaminan: string;
  tipeKlaim: string;
  tipeCidera: string;
  namaRumahSakit: string | null;
  loket: string;
  namaKorban: string;
  nomorSuratJaminan: string | null;
  tglGl: string;
  glStatus: string;
  tahapan: string;
  tglDiajukan: string | null;
  statusVerifikasi: string | null;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  tglVerifikasi: string | null;
  statusPembayaran: string;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
  diimporPada: Date;
}

export async function ambilDetailGL(idJaminan: string): Promise<DetailGL | null> {
  const [baris] = await db
    .select({
      idJaminan: glMirror.idJaminan,
      tipeKlaim: glMirror.tipeKlaim,
      tipeCidera: glMirror.tipeCidera,
      namaRumahSakit: glMirror.namaRumahSakit,
      loket: glMirror.loket,
      namaKorban: glMirror.namaKorban,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      tglGl: glMirror.tglGl,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      tglDiajukan: glMirror.tglDiajukan,
      statusVerifikasi: glMirror.statusVerifikasi,
      nilaiDiajukan: glMirror.nilaiDiajukan,
      nilaiDisetujui: glMirror.nilaiDisetujui,
      tglVerifikasi: glMirror.tglVerifikasi,
      statusPembayaran: glMirror.statusPembayaran,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      tglPembayaran: glMirror.tglPembayaran,
      diimporPada: glMirror.diimporPada,
    })
    .from(glMirror)
    .where(eq(glMirror.idJaminan, idJaminan))
    .limit(1);

  return baris ?? null;
}

export interface BarisRiwayatTahapan {
  id: number;
  tahapan: string;
  statusVerifikasi: string | null;
  statusPembayaran: string;
  direkamPada: Date;
}

// Riwayat tahapan dari gl_snapshot, sesuai CLAUDE.md bagian 5: baris baru
// hanya tersimpan saat ada perubahan, jadi jumlahnya bisa cuma satu (baseline)
// untuk GL yang belum pernah berubah sejak impor pertama.
export async function ambilRiwayatTahapan(idJaminan: string): Promise<BarisRiwayatTahapan[]> {
  return db
    .select({
      id: glSnapshot.id,
      tahapan: glSnapshot.tahapan,
      statusVerifikasi: glSnapshot.statusVerifikasi,
      statusPembayaran: glSnapshot.statusPembayaran,
      direkamPada: glSnapshot.direkamPada,
    })
    .from(glSnapshot)
    .where(eq(glSnapshot.idJaminan, idJaminan))
    .orderBy(asc(glSnapshot.direkamPada));
}
