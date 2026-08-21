import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

// Tahap 2 (CLAUDE.md bagian 6): "Halaman sebaran per loket dan rumah sakit".
// Dihitung dari GL aktif saja (tipe klaim GL, status Active) — sama seperti
// grafik lain di beranda — supaya tidak ikut menghitung GL yang dibatalkan
// atau jalur Reimbursement.

export interface SebaranLoket {
  loket: string;
  jumlah: number;
}

export async function ambilSebaranLoket(): Promise<SebaranLoket[]> {
  return db
    .select({ loket: glMirror.loket, jumlah: count() })
    .from(glMirror)
    .where(and(eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.loket)
    .orderBy(desc(count()));
}

export interface SebaranRumahSakit {
  namaRumahSakit: string;
  jumlah: number;
}

const LABEL_RS_KOSONG = "(Tidak diisi)";

export async function ambilSebaranRumahSakit(): Promise<SebaranRumahSakit[]> {
  const baris = await db
    .select({ namaRumahSakit: glMirror.namaRumahSakit, jumlah: count() })
    .from(glMirror)
    .where(and(eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.namaRumahSakit)
    .orderBy(desc(count()));

  return baris.map((b) => ({
    namaRumahSakit: b.namaRumahSakit ?? LABEL_RS_KOSONG,
    jumlah: b.jumlah,
  }));
}
