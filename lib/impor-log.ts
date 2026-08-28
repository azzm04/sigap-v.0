import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { imporLog } from "./db/schema";

export type JenisLogData =
  | "impor"
  | "impor_sentralisasi"
  | "hapus"
  | "pulihkan"
  | "hapus_permanen"
  | "sinkron_sheets";

export interface BarisLogData {
  id: number;
  jenis: JenisLogData;
  namaBerkas: string | null;
  diimporPada: Date;
  jumlahBaris: number;
  jumlahBaru: number;
  jumlahBerubah: number;
  berhasil: boolean;
  alasanPenolakan: string | null;
}

const BATAS_RIWAYAT = 100;

// Log Data: gabungan riwayat impor, "Hapus Semua Data", dan pemulihan lewat
// halaman Sampah -- lihat lib/db/schema.ts, kolom jenis di imporLog. Tidak
// memuat data pribadi (nama berkas dan angka agregat saja), aman ditampilkan
// apa adanya.
export async function ambilRiwayatLogData(): Promise<BarisLogData[]> {
  const baris = await db.select().from(imporLog).orderBy(desc(imporLog.diimporPada)).limit(BATAS_RIWAYAT);
  return baris.map((b) => ({ ...b, jenis: b.jenis as JenisLogData }));
}

// Dipakai label "Terakhir diperbarui" di Kelola Data: kapan unggahan
// BERHASIL terakhir kali, bukan sekadar percobaan (yang bisa saja ditolak).
// Disaring jenis="impor" supaya baris "Hapus Semua Data"/"Pulihkan" tidak
// ikut dianggap impor.
export async function ambilWaktuImporTerakhirBerhasil(): Promise<Date | null> {
  const [baris] = await db
    .select({ diimporPada: imporLog.diimporPada })
    .from(imporLog)
    .where(and(eq(imporLog.jenis, "impor"), eq(imporLog.berhasil, true)))
    .orderBy(desc(imporLog.diimporPada))
    .limit(1);

  return baris?.diimporPada ?? null;
}
