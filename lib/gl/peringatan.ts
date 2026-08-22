import { and, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { glMirror, tinjauan } from "../db/schema";
import { hitungUmurHari } from "../format";
import { ambilAmbangHari } from "../pengaturan";
import { apakahMasukPeringatan } from "./aturan-peringatan";

export interface BarisPeringatan {
  idJaminan: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  tipeKlaim: string;
  tipeCidera: string;
  nomorSuratJaminan: string | null;
  tglGl: string;
  glStatus: string;
  tahapan: string;
  statusVerifikasi: string | null;
  statusPembayaran: string;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
  umurHari: number;
  /** true kalau sudah pernah ada catatan Tinjauan Petugas untuk GL ini (apa pun isinya) */
  sudahDitinjau: boolean;
}

// Ukuran halaman papan peringatan. Filter tahapan+ambang umur berjalan di
// JS (bukan SQL), jadi paginasi juga dilakukan di JS setelah seluruh baris
// yang lolos filter terkumpul — lihat komentar ambilPapanPeringatan().
const UKURAN_HALAMAN_PERINGATAN = 20;

export interface FilterPapanPeringatan {
  halaman?: number;
  ukuran?: number;
  /** Dicocokkan ke Nama Korban atau Nomor ID Jaminan */
  cari?: string;
  loket?: string;
  /** ISO "YYYY-MM-DD", batas bawah Tgl GL */
  dari?: string;
  /** ISO "YYYY-MM-DD", batas atas Tgl GL */
  sampai?: string;
  /** "sudah" = sudah ada catatan Tinjauan Petugas, "belum" = belum pernah ditinjau sama sekali */
  statusTinjauan?: "sudah" | "belum";
}

export interface HasilPeringatan {
  baris: BarisPeringatan[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
  ambangHari: number;
}

function bangunKondisiPeringatan(filter: FilterPapanPeringatan) {
  const kondisi = [
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.glStatus, "Active"),
    eq(glMirror.statusPembayaran, "Unpaid"),
  ];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola));
    if (kondisiCari) kondisi.push(kondisiCari);
  }
  return and(...kondisi);
}

// Papan peringatan Tahap 1 (CLAUDE.md bagian 6 dan 7). Pra-saring di SQL
// dengan syarat yang murah (tipe klaim, status GL, status pembayaran, dan
// filter petugas kalau ada) supaya tidak menarik ribuan baris Paid/Cancel
// yang jelas tidak relevan, lalu syarat yang lebih rumit (tahapan + ambang
// umur) dicek lewat apakahMasukPeringatan agar satu-satunya sumber
// kebenaran aturan tetap fungsi yang sama dengan yang diuji di
// aturan-peringatan.test.ts.
export async function ambilPapanPeringatan(
  filter: FilterPapanPeringatan = {},
): Promise<HasilPeringatan> {
  const ambangHari = await ambilAmbangHari();

  const kandidat = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tipeKlaim: glMirror.tipeKlaim,
      tipeCidera: glMirror.tipeCidera,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      tglGl: glMirror.tglGl,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      statusVerifikasi: glMirror.statusVerifikasi,
      statusPembayaran: glMirror.statusPembayaran,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      tglPembayaran: glMirror.tglPembayaran,
    })
    .from(glMirror)
    .where(bangunKondisiPeringatan(filter));

  // Diambil sekali tanpa filter diabaikan supaya dua kebutuhan (baris yang
  // permanen dikecualikan, dan status "sudah/belum ditinjau" untuk filter
  // petugas) sama-sama terjawab dari satu query.
  const tinjauanBaris = await db
    .select({ idJaminan: tinjauan.idJaminan, diabaikan: tinjauan.diabaikan })
    .from(tinjauan);
  const idDiabaikan = new Set(tinjauanBaris.filter((b) => b.diabaikan).map((b) => b.idJaminan));
  const idSudahDitinjau = new Set(tinjauanBaris.map((b) => b.idJaminan));

  const semuaBaris = kandidat
    .filter((b) => !idDiabaikan.has(b.idJaminan))
    .map((b) => ({
      ...b,
      umurHari: hitungUmurHari(b.tglGl),
      sudahDitinjau: idSudahDitinjau.has(b.idJaminan),
    }))
    .filter((b) => apakahMasukPeringatan(b, ambangHari))
    .filter((b) => {
      if (filter.statusTinjauan === "sudah") return b.sudahDitinjau;
      if (filter.statusTinjauan === "belum") return !b.sudahDitinjau;
      return true;
    })
    // Prioritas belum jelas (akhiran "00" — lihat CLAUDE.md bagian 7 dan 8),
    // jadi urutkan berdasarkan umur tertinggi sampai dikonfirmasi.
    .sort((a, b) => b.umurHari - a.umurHari)
    .map(
      ({
        idJaminan,
        namaKorban,
        loket,
        namaRumahSakit,
        tipeKlaim,
        tipeCidera,
        nomorSuratJaminan,
        tglGl,
        glStatus,
        tahapan,
        statusVerifikasi,
        statusPembayaran,
        jumlahPembayaran,
        tglPembayaran,
        umurHari,
        sudahDitinjau,
      }) => ({
        idJaminan,
        namaKorban,
        loket,
        namaRumahSakit,
        tipeKlaim,
        tipeCidera,
        nomorSuratJaminan,
        tglGl,
        glStatus,
        tahapan,
        statusVerifikasi,
        statusPembayaran,
        jumlahPembayaran,
        tglPembayaran,
        umurHari,
        sudahDitinjau,
      }),
    );

  const total = semuaBaris.length;
  const ukuran = filter.ukuran ?? UKURAN_HALAMAN_PERINGATAN;
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;
  const baris = semuaBaris.slice(mulai, mulai + ukuran);

  return { baris, total, halaman, ukuran, totalHalaman, ambangHari };
}
