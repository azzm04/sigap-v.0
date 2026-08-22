import { and, count, countDistinct, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

// Tahap 2 (CLAUDE.md bagian 6): "Halaman sebaran ... rumah sakit". Dihitung
// dari GL aktif saja (tipe klaim GL, status Active, belum di-soft-delete)
// — sama seperti grafik lain di beranda — supaya tidak ikut menghitung GL
// yang dibatalkan, jalur Reimbursement, atau yang sudah "dihapus".
const KONDISI_GL_AKTIF = and(
  isNull(glMirror.dihapusPada),
  eq(glMirror.tipeKlaim, "GL"),
  eq(glMirror.glStatus, "Active"),
);

export interface SebaranRumahSakit {
  namaRumahSakit: string;
  loket: string;
  jumlah: number;
}

const LABEL_RS_KOSONG = "(Tidak diisi)";

// Dikelompokkan per (namaRumahSakit, loket) — pada data yang ada tiap rumah
// sakit hanya muncul di satu loket, tapi kalau suatu saat ada yang tercatat
// di lebih dari satu loket, baris itu tetap dipisah apa adanya alih-alih
// disembunyikan.
export async function ambilSebaranRumahSakit(): Promise<SebaranRumahSakit[]> {
  const baris = await db
    .select({ namaRumahSakit: glMirror.namaRumahSakit, loket: glMirror.loket, jumlah: count() })
    .from(glMirror)
    .where(KONDISI_GL_AKTIF)
    .groupBy(glMirror.namaRumahSakit, glMirror.loket)
    .orderBy(desc(count()));

  return baris.map((b) => ({
    namaRumahSakit: b.namaRumahSakit ?? LABEL_RS_KOSONG,
    loket: b.loket,
    jumlah: b.jumlah,
  }));
}

// Jumlah nama rumah sakit unik dari GL aktif — baris dengan rumah sakit
// kosong otomatis tidak ikut terhitung (COUNT DISTINCT mengabaikan NULL).
export async function ambilTotalRumahSakitMitra(): Promise<number> {
  const [{ nilai }] = await db
    .select({ nilai: countDistinct(glMirror.namaRumahSakit) })
    .from(glMirror)
    .where(KONDISI_GL_AKTIF);
  return nilai;
}

export async function ambilTotalGLAktif(): Promise<number> {
  const [{ nilai }] = await db.select({ nilai: count() }).from(glMirror).where(KONDISI_GL_AKTIF);
  return nilai;
}
