import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { PILIHAN_UKURAN_HALAMAN } from "./ukuran-halaman";

const UKURAN_HALAMAN_DEFAULT = 25;

function sanitisasiUkuran(nilai: number | undefined): number {
  return nilai && (PILIHAN_UKURAN_HALAMAN as readonly number[]).includes(nilai)
    ? nilai
    : UKURAN_HALAMAN_DEFAULT;
}

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
  /** Jumlah baris per halaman, harus salah satu dari PILIHAN_UKURAN_HALAMAN */
  ukuran?: number;
}

export interface BarisDaftarGL {
  idJaminan: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  tglGl: string;
  tipeKlaim: string;
  tipeCidera: string;
  nomorSuratJaminan: string | null;
  glStatus: string;
  tahapan: string;
  statusVerifikasi: string | null;
  statusPembayaran: string;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
}

export interface HasilDaftarGL {
  baris: BarisDaftarGL[];
  total: number;
  halaman: number;
  /** Ukuran halaman yang sudah disanitisasi (bukan sekadar echo dari filter) */
  ukuran: number;
  totalHalaman: number;
}

// Daftar nilai enum untuk dropdown filter dibaca langsung dari data yang
// benar-benar ada, bukan daftar tetap di kode (CLAUDE.md aturan keras #3).
export async function ambilOpsiFilter() {
  const kondisiAktif = isNull(glMirror.dihapusPada);
  const [loket, tahapan, statusPembayaran] = await Promise.all([
    db
      .selectDistinct({ nilai: glMirror.loket })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.loket)),
    db
      .selectDistinct({ nilai: glMirror.tahapan })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.tahapan)),
    db
      .selectDistinct({ nilai: glMirror.statusPembayaran })
      .from(glMirror)
      .where(kondisiAktif)
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
  // Baris yang di-soft-delete lewat "Hapus Semua Data" tidak pernah muncul
  // di tampilan mana pun (lihat lib/db/schema.ts, kolom dihapusPada).
  const kondisi = [isNull(glMirror.dihapusPada)];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.tahapan) kondisi.push(eq(glMirror.tahapan, filter.tahapan));
  if (filter.statusPembayaran) kondisi.push(eq(glMirror.statusPembayaran, filter.statusPembayaran));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola));
    if (kondisiCari) kondisi.push(kondisiCari);
  }
  return and(...kondisi);
}

// Query di server, hanya mengambil kolom yang benar-benar ditampilkan di
// tabel (CLAUDE.md aturan keras #4) — bukan seluruh baris gl_mirror.
export async function ambilDaftarGL(filter: FilterDaftarGL): Promise<HasilDaftarGL> {
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const ukuran = sanitisasiUkuran(filter.ukuran);
  const kondisi = bangunKondisiDaftarGL(filter);

  const [{ nilai: total }] = await db.select({ nilai: count() }).from(glMirror).where(kondisi);

  const baris = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tglGl: glMirror.tglGl,
      tipeKlaim: glMirror.tipeKlaim,
      tipeCidera: glMirror.tipeCidera,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      statusVerifikasi: glMirror.statusVerifikasi,
      statusPembayaran: glMirror.statusPembayaran,
      nilaiDiajukan: glMirror.nilaiDiajukan,
      nilaiDisetujui: glMirror.nilaiDisetujui,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      tglPembayaran: glMirror.tglPembayaran,
    })
    .from(glMirror)
    .where(kondisi)
    // id sebagai penentu urutan kedua: banyak baris berbagi tgl_gl yang sama,
    // tanpa ini urutan antar-halaman tidak stabil (baris bisa terlewat atau
    // muncul dua kali saat berpindah halaman).
    .orderBy(desc(glMirror.tglGl), desc(glMirror.id))
    .limit(ukuran)
    .offset((halaman - 1) * ukuran);

  return {
    baris,
    total,
    halaman,
    ukuran,
    totalHalaman: Math.max(1, Math.ceil(total / ukuran)),
  };
}
