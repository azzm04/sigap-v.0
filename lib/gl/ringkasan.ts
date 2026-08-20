import { and, count, desc, eq, max, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { ambilPapanPeringatan } from "./peringatan";

export interface KartuRingkasan {
  totalGL: number;
  totalUnpaid: number;
  totalPeringatan: number;
  diimporTerakhir: Date | null;
}

export async function ambilKartuRingkasan(): Promise<KartuRingkasan> {
  const [[{ totalGL }], [{ totalUnpaid }], [{ diimporTerakhir }], { baris: peringatan }] =
    await Promise.all([
      db.select({ totalGL: count() }).from(glMirror).where(eq(glMirror.tipeKlaim, "GL")),
      db
        .select({ totalUnpaid: count() })
        .from(glMirror)
        .where(
          and(
            eq(glMirror.tipeKlaim, "GL"),
            eq(glMirror.glStatus, "Active"),
            eq(glMirror.statusPembayaran, "Unpaid"),
          ),
        ),
      db.select({ diimporTerakhir: max(glMirror.diimporPada) }).from(glMirror),
      ambilPapanPeringatan(),
    ]);

  return {
    totalGL,
    totalUnpaid,
    totalPeringatan: peringatan.length,
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
    .where(and(eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
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
    .where(and(eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
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
    .where(eq(glMirror.tipeKlaim, "GL"))
    .groupBy(kolomBulan)
    .orderBy(kolomBulan);
}
