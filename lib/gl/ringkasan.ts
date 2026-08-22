import { and, count, desc, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { ambilPapanPeringatan } from "./peringatan";

// Baris yang di-soft-delete lewat "Hapus Semua Data" tidak pernah ikut
// dihitung di kartu ringkasan maupun grafik mana pun.
const KONDISI_AKTIF = isNull(glMirror.dihapusPada);

export interface KartuRingkasan {
  totalGL: number;
  totalUnpaid: number;
  totalPeringatan: number;
  /** Rata-rata umur (hari) GL bertipe GL, Active, dan Unpaid — seberapa lama tagihan yang belum dibayar sudah mengendap */
  rataRataUmurTagihan: number;
  diimporTerakhir: Date | null;
}

export async function ambilKartuRingkasan(): Promise<KartuRingkasan> {
  const [
    [{ totalGL }],
    [{ totalUnpaid, rataRataUmurTagihan }],
    [{ diimporTerakhir }],
    peringatan,
  ] = await Promise.all([
    db
      .select({ totalGL: count() })
      .from(glMirror)
      .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"))),
    db
      .select({
        totalUnpaid: count(),
        rataRataUmurTagihan: sql<number>`coalesce(avg(current_date - ${glMirror.tglGl})::float8, 0)`,
      })
      .from(glMirror)
      .where(
        and(
          KONDISI_AKTIF,
          eq(glMirror.tipeKlaim, "GL"),
          eq(glMirror.glStatus, "Active"),
          eq(glMirror.statusPembayaran, "Unpaid"),
        ),
      ),
    // Sengaja TIDAK disaring KONDISI_AKTIF: label ini menjawab "kapan data
    // terakhir diimpor", bukan "berapa baris yang tampil sekarang" — tetap
    // relevan walau seluruh data baru saja di-soft-delete.
    db.select({ diimporTerakhir: max(glMirror.diimporPada) }).from(glMirror),
    ambilPapanPeringatan(),
  ]);

  return {
    totalGL,
    totalUnpaid,
    totalPeringatan: peringatan.total,
    rataRataUmurTagihan: Number(rataRataUmurTagihan),
    diimporTerakhir: diimporTerakhir ?? null,
  };
}

export interface SebaranTahapan {
  tahapan: string;
  jumlah: number;
}

// Diurutkan berdasarkan jumlah, BUKAN urutan tahapan resmi — urutan proses
// GL belum dikonfirmasi klien (docs/domain-gl.md), jadi jangan menyiratkan
// urutan/funnel yang belum tentu benar.
export async function ambilSebaranTahapan(): Promise<SebaranTahapan[]> {
  return db
    .select({ tahapan: glMirror.tahapan, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.tahapan)
    .orderBy(desc(count()));
}

export interface SebaranStatusPembayaran {
  statusPembayaran: string;
  jumlah: number;
}

export async function ambilSebaranStatusPembayaran(): Promise<SebaranStatusPembayaran[]> {
  return db
    .select({ statusPembayaran: glMirror.statusPembayaran, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.statusPembayaran);
}

export interface TrenBulanan {
  bulan: string;
  jumlah: number;
}

export async function ambilTrenBulanan(): Promise<TrenBulanan[]> {
  const kolomBulan = sql<string>`to_char(${glMirror.tglGl}, 'YYYY-MM')`;

  return db
    .select({ bulan: kolomBulan, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL")))
    .groupBy(kolomBulan)
    .orderBy(kolomBulan);
}
