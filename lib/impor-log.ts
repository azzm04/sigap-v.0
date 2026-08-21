import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { imporLog } from "./db/schema";

export interface BarisImporLog {
  id: number;
  namaBerkas: string;
  diimporPada: Date;
  jumlahBaris: number;
  jumlahBaru: number;
  jumlahBerubah: number;
  berhasil: boolean;
  alasanPenolakan: string | null;
}

const BATAS_RIWAYAT = 100;

// Tahap 2 (CLAUDE.md bagian 6): "Halaman log impor yang lebih rinci".
// Tidak memuat data pribadi (nama berkas dan angka agregat saja), aman
// ditampilkan apa adanya.
export async function ambilRiwayatImpor(): Promise<BarisImporLog[]> {
  return db.select().from(imporLog).orderBy(desc(imporLog.diimporPada)).limit(BATAS_RIWAYAT);
}

// Dipakai pengingat impor (Tahap 2): kapan unggahan BERHASIL terakhir kali,
// bukan sekadar percobaan (yang bisa saja ditolak).
export async function ambilWaktuImporTerakhirBerhasil(): Promise<Date | null> {
  const [baris] = await db
    .select({ diimporPada: imporLog.diimporPada })
    .from(imporLog)
    .where(eq(imporLog.berhasil, true))
    .orderBy(desc(imporLog.diimporPada))
    .limit(1);

  return baris?.diimporPada ?? null;
}
