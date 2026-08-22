import { count, desc, isNotNull, isNull } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

export interface BatchTerhapus {
  /** Menyatukan sebuah batch: seluruh baris yang dihapus lewat klik "Hapus Semua Data" yang sama berbagi nilai ini */
  dihapusPada: Date;
  jumlahBaris: number;
}

// Dikelompokkan per nilai dihapusPada yang identik -- satu klik "Hapus Semua
// Data" menulis timestamp yang sama untuk semua baris dalam satu UPDATE,
// jadi cukup untuk mengenali batch tanpa tabel terpisah.
export async function ambilBatchTerhapus(): Promise<BatchTerhapus[]> {
  const baris = await db
    .select({ dihapusPada: glMirror.dihapusPada, jumlahBaris: count() })
    .from(glMirror)
    .where(isNotNull(glMirror.dihapusPada))
    .groupBy(glMirror.dihapusPada)
    .orderBy(desc(glMirror.dihapusPada));

  return baris
    .filter((b): b is { dihapusPada: Date; jumlahBaris: number } => b.dihapusPada !== null)
    .map((b) => ({ dihapusPada: b.dihapusPada, jumlahBaris: b.jumlahBaris }));
}

// Total baris yang masih aktif (belum di-soft-delete) -- ditampilkan di
// Zona Berbahaya supaya petugas tahu persis berapa baris yang akan
// disembunyikan sebelum menekan "Hapus Semua Data".
export async function ambilTotalBarisAktif(): Promise<number> {
  const [{ nilai }] = await db
    .select({ nilai: count() })
    .from(glMirror)
    .where(isNull(glMirror.dihapusPada));
  return nilai;
}
