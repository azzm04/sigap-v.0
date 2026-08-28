import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { laporanSurveiTkp, pengguna } from "../db/schema";

export interface BarisLaporanTkp {
  id: number;
  nomorLp: string;
  alamatKorban: string;
  uraianKesimpulan: string;
  namaSaksi: string;
  ttdSaksi: string | null;
  tanggalSurveiManual: string | null;
  dibuatPada: Date;
  namaPengguna: string;
}

export async function ambilRiwayatLaporanTkp(idJaminan: string): Promise<BarisLaporanTkp[]> {
  return db
    .select({
      id: laporanSurveiTkp.id,
      nomorLp: laporanSurveiTkp.nomorLp,
      alamatKorban: laporanSurveiTkp.alamatKorban,
      uraianKesimpulan: laporanSurveiTkp.uraianKesimpulan,
      namaSaksi: laporanSurveiTkp.namaSaksi,
      ttdSaksi: laporanSurveiTkp.ttdSaksi,
      tanggalSurveiManual: laporanSurveiTkp.tanggalSurveiManual,
      dibuatPada: laporanSurveiTkp.dibuatPada,
      namaPengguna: pengguna.username,
    })
    .from(laporanSurveiTkp)
    .innerJoin(pengguna, eq(laporanSurveiTkp.userId, pengguna.id))
    .where(eq(laporanSurveiTkp.idJaminan, idJaminan))
    .orderBy(desc(laporanSurveiTkp.dibuatPada));
}

export interface DetailLaporanTkp extends BarisLaporanTkp {
  idJaminan: string;
}

export async function ambilLaporanTkp(id: number): Promise<DetailLaporanTkp | null> {
  const [baris] = await db
    .select({
      id: laporanSurveiTkp.id,
      idJaminan: laporanSurveiTkp.idJaminan,
      nomorLp: laporanSurveiTkp.nomorLp,
      alamatKorban: laporanSurveiTkp.alamatKorban,
      uraianKesimpulan: laporanSurveiTkp.uraianKesimpulan,
      namaSaksi: laporanSurveiTkp.namaSaksi,
      ttdSaksi: laporanSurveiTkp.ttdSaksi,
      tanggalSurveiManual: laporanSurveiTkp.tanggalSurveiManual,
      dibuatPada: laporanSurveiTkp.dibuatPada,
      namaPengguna: pengguna.username,
    })
    .from(laporanSurveiTkp)
    .innerJoin(pengguna, eq(laporanSurveiTkp.userId, pengguna.id))
    .where(eq(laporanSurveiTkp.id, id))
    .limit(1);
  return baris ?? null;
}

export async function simpanLaporanTkp(input: {
  idJaminan: string;
  nomorLp: string;
  alamatKorban: string;
  uraianKesimpulan: string;
  namaSaksi: string;
  ttdSaksi: string | null;
  tanggalSurveiManual: string | null;
  userId: number;
}): Promise<{ id: number }> {
  const [baris] = await db
    .insert(laporanSurveiTkp)
    .values(input)
    .returning({ id: laporanSurveiTkp.id });
  return baris;
}
