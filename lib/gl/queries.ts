import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

const UKURAN_HALAMAN = 20;

export interface FilterDaftarGL {
  loket?: string;
  tahapan?: string;
  statusPembayaran?: string;
  /** ISO "YYYY-MM-DD", batas bawah Tgl GL */
  dari?: string;
  /** ISO "YYYY-MM-DD", batas atas Tgl GL */
  sampai?: string;
  /** Dicocokkan ke Nama Korban atau Nomor ID Jaminan */
  cari?: string;
  halaman?: number;
}

export interface BarisDaftarGL {
  idJaminan: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  tglGl: string;
  glStatus: string;
  tahapan: string;
  statusPembayaran: string;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
}

export interface HasilDaftarGL {
  baris: BarisDaftarGL[];
  total: number;
  halaman: number;
  totalHalaman: number;
}

// Daftar nilai enum untuk dropdown filter dibaca langsung dari data yang
// benar-benar ada, bukan daftar tetap di kode (CLAUDE.md aturan keras #3).
export async function ambilOpsiFilter() {
  const [loket, tahapan, statusPembayaran] = await Promise.all([
    db.selectDistinct({ nilai: glMirror.loket }).from(glMirror).orderBy(asc(glMirror.loket)),
    db.selectDistinct({ nilai: glMirror.tahapan }).from(glMirror).orderBy(asc(glMirror.tahapan)),
    db
      .selectDistinct({ nilai: glMirror.statusPembayaran })
      .from(glMirror)
      .orderBy(asc(glMirror.statusPembayaran)),
  ]);

  return {
    loket: loket.map((r) => r.nilai),
    tahapan: tahapan.map((r) => r.nilai),
    statusPembayaran: statusPembayaran.map((r) => r.nilai),
  };
}

// Diekspor supaya lib/gl/ekspor.ts memakai aturan penyaringan yang persis
// sama, bukan menyalin ulang logikanya.
export function bangunKondisiDaftarGL(filter: FilterDaftarGL) {
  const kondisi = [];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.tahapan) kondisi.push(eq(glMirror.tahapan, filter.tahapan));
  if (filter.statusPembayaran) kondisi.push(eq(glMirror.statusPembayaran, filter.statusPembayaran));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    kondisi.push(or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola)));
  }
  return kondisi.length > 0 ? and(...kondisi) : undefined;
}

// Query di server, hanya mengambil kolom yang benar-benar ditampilkan di
// tabel (CLAUDE.md aturan keras #4) — bukan seluruh baris gl_mirror.
export async function ambilDaftarGL(filter: FilterDaftarGL): Promise<HasilDaftarGL> {
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const kondisi = bangunKondisiDaftarGL(filter);

  const [{ nilai: total }] = await db.select({ nilai: count() }).from(glMirror).where(kondisi);

  const baris = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tglGl: glMirror.tglGl,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      statusPembayaran: glMirror.statusPembayaran,
      nilaiDiajukan: glMirror.nilaiDiajukan,
      nilaiDisetujui: glMirror.nilaiDisetujui,
    })
    .from(glMirror)
    .where(kondisi)
    // id sebagai penentu urutan kedua: banyak baris berbagi tgl_gl yang sama,
    // tanpa ini urutan antar-halaman tidak stabil (baris bisa terlewat atau
    // muncul dua kali saat berpindah halaman).
    .orderBy(desc(glMirror.tglGl), desc(glMirror.id))
    .limit(UKURAN_HALAMAN)
    .offset((halaman - 1) * UKURAN_HALAMAN);

  return {
    baris,
    total,
    halaman,
    totalHalaman: Math.max(1, Math.ceil(total / UKURAN_HALAMAN)),
  };
}
