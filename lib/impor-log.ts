import { and, count, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { imporLog } from "./db/schema";
import { ambilBatasRiwayat } from "./pengaturan";

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

// Log Data: gabungan riwayat impor, "Hapus Semua Data", dan pemulihan lewat
// halaman Sampah -- lihat lib/db/schema.ts, kolom jenis di imporLog. Tidak
// memuat data pribadi (nama berkas dan angka agregat saja), aman ditampilkan
// apa adanya.
//
// Batas jumlah baris tidak di-hardcode (CLAUDE.md aturan keras #2 -- sama
// semangatnya dengan ambang hari peringatan), diambil dari pengaturan
// "batas_riwayat_log" lewat ambilBatasRiwayat(), diatur di halaman
// Pengaturan. Kalau riwayat lebih panjang dari batas ini, halaman Kelola
// Data menampilkan tautan "Detail Riwayat" ke /kelola-data/riwayat yang
// menampilkan seluruh riwayat dengan pagination (lihat
// ambilRiwayatLogDataBerhalaman di bawah).
export async function ambilRiwayatLogData(): Promise<BarisLogData[]> {
  const batas = await ambilBatasRiwayat();
  const baris = await db.select().from(imporLog).orderBy(desc(imporLog.diimporPada)).limit(batas);
  return baris.map((b) => ({ ...b, jenis: b.jenis as JenisLogData }));
}

export async function ambilTotalLogData(): Promise<number> {
  const [baris] = await db.select({ total: count() }).from(imporLog);
  return baris?.total ?? 0;
}

export interface FilterRiwayatLogData {
  halaman?: number;
  ukuran?: number;
}

export interface HasilRiwayatLogData {
  baris: BarisLogData[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
}

const UKURAN_HALAMAN_BAWAAN = 25;

// Dipakai halaman /kelola-data/riwayat -- versi lengkap Log Data dengan
// pagination, tidak dibatasi ambilBatasRiwayat() seperti ambilRiwayatLogData().
export async function ambilRiwayatLogDataBerhalaman(
  filter: FilterRiwayatLogData = {},
): Promise<HasilRiwayatLogData> {
  const ukuran = filter.ukuran && filter.ukuran > 0 ? filter.ukuran : UKURAN_HALAMAN_BAWAAN;
  const halaman = filter.halaman && filter.halaman > 0 ? filter.halaman : 1;

  const [baris, total] = await Promise.all([
    db
      .select()
      .from(imporLog)
      .orderBy(desc(imporLog.diimporPada))
      .limit(ukuran)
      .offset((halaman - 1) * ukuran),
    ambilTotalLogData(),
  ]);

  return {
    baris: baris.map((b) => ({ ...b, jenis: b.jenis as JenisLogData })),
    total,
    halaman,
    ukuran,
    totalHalaman: Math.max(1, Math.ceil(total / ukuran)),
  };
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
