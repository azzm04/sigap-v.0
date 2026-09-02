import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { laporanSurveiTkp, pengguna } from "../db/schema";

export interface BarisLaporanTkp {
  id: number;
  /** null untuk laporan unggahan -- lihat komentar laporanSurveiTkp di lib/db/schema.ts */
  nomorLp: string | null;
  alamatKorban: string | null;
  uraianKesimpulan: string | null;
  namaSaksi: string | null;
  /** Terisi berarti laporan sudah jadi dari luar, dikirim apa adanya tanpa di-generate */
  namaBerkas: string | null;
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
      namaBerkas: laporanSurveiTkp.namaBerkas,
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
      namaBerkas: laporanSurveiTkp.namaBerkas,
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

/** Label singkat untuk tabel dokumen dan kolom Google Sheets: Nomor LP untuk laporan buatan SIGAP, nama berkas untuk laporan unggahan. Jangan pakai nomorLp langsung -- nilainya bisa null. */
export function labelLaporanTkp(baris: {
  nomorLp: string | null;
  namaBerkas: string | null;
}): string {
  return baris.nomorLp?.trim() || baris.namaBerkas?.trim() || "Laporan Survei TKP";
}

/**
 * Isi berkas laporan unggahan (data URI base64). Dipisah dari
 * ambilLaporanTkp() supaya halaman detail dan tabel dokumen tidak ikut
 * menarik berkas belasan MB hanya untuk menampilkan namanya.
 */
export async function ambilBerkasLaporanTkp(
  id: number,
): Promise<{ berkas: string; namaBerkas: string | null } | null> {
  const [baris] = await db
    .select({ berkas: laporanSurveiTkp.berkas, namaBerkas: laporanSurveiTkp.namaBerkas })
    .from(laporanSurveiTkp)
    .where(eq(laporanSurveiTkp.id, id))
    .limit(1);
  if (!baris?.berkas) return null;
  return { berkas: baris.berkas, namaBerkas: baris.namaBerkas };
}

/**
 * Menyimpan Laporan Survei TKP yang SUDAH JADI dari luar sistem -- untuk
 * kasus lama yang laporannya sudah pernah dibuat sebelum SIGAP ada. Field
 * manual dibiarkan kosong: isinya sudah ada di dalam PDF, dan PDF itu
 * dikirim apa adanya tanpa pernah di-generate ulang.
 */
export async function simpanLaporanTkpUnggahan(input: {
  idJaminan: string;
  berkas: string;
  namaBerkas: string;
  userId: number;
}): Promise<{ id: number }> {
  const [baris] = await db
    .insert(laporanSurveiTkp)
    .values(input)
    .returning({ id: laporanSurveiTkp.id });
  return baris;
}
