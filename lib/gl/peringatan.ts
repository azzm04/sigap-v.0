import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror, statusProsesPusat, tinjauan } from "../db/schema";
import { hitungUmurHari } from "../format";
import { ambilAmbangHari } from "../pengaturan";
import { apakahMasukPeringatan } from "./aturan-peringatan";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisPeringatan {
  idJaminan: string;
  /** Token terenkripsi untuk URL /gl/[token] -- lihat lib/gl/token-url.ts */
  tokenUrl: string;
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
  tglKejadian: string | null;
  lokasi: string | null;
  umurHari: number;
  /** true kalau sudah pernah ada catatan Tinjauan Petugas untuk GL ini (apa pun isinya) */
  sudahDitinjau: boolean;
  /** Tahap proses terkini di sistem pusat (lib/gl/tahap-proses.ts), null kalau belum pernah dicatat */
  tahapProses: string | null;
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
  /** Nilai persis dari nilai_referensi kategori tahap_proses_pusat */
  tahapProses?: string;
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
      tglKejadian: glMirror.tglKejadian,
      lokasi: glMirror.lokasi,
      sudahDitinjau: sql<boolean>`EXISTS (
        SELECT 1 FROM ${tinjauan}
        WHERE ${tinjauan.idJaminan} = ${glMirror.idJaminan}
      )`,
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

  // Diurutkan terbaru dulu supaya baris pertama yang ditemui per id_jaminan
  // adalah tahap terkininya (sama seperti pola di lib/gl/tahap-proses.ts).
  const semuaTahapProses = await db
    .select({ idJaminan: statusProsesPusat.idJaminan, tahap: statusProsesPusat.tahap })
    .from(statusProsesPusat)
    .orderBy(desc(statusProsesPusat.dicatatPada));
  const tahapTerkiniPerId = new Map<string, string>();
  for (const t of semuaTahapProses) {
    if (!tahapTerkiniPerId.has(t.idJaminan)) tahapTerkiniPerId.set(t.idJaminan, t.tahap);
  }

  const semuaBaris = kandidat
    .filter((b) => !idDiabaikan.has(b.idJaminan))
    .map((b) => ({
      ...b,
      tokenUrl: enkripsiIdJaminan(b.idJaminan),
      umurHari: hitungUmurHari(b.tglGl),
      sudahDitinjau: idSudahDitinjau.has(b.idJaminan),
      tahapProses: tahapTerkiniPerId.get(b.idJaminan) ?? null,
    }))
    .filter((b) => apakahMasukPeringatan(b, ambangHari))
    .filter((b) => {
      if (filter.statusTinjauan === "sudah") return b.sudahDitinjau;
      if (filter.statusTinjauan === "belum") return !b.sudahDitinjau;
      return true;
    })
    .filter((b) => !filter.tahapProses || b.tahapProses === filter.tahapProses)
    // Prioritas belum jelas (akhiran "00" — lihat CLAUDE.md bagian 7 dan 8),
    // jadi urutkan berdasarkan umur tertinggi sampai dikonfirmasi.
    .sort((a, b) => b.umurHari - a.umurHari)
    .map(
      ({
        idJaminan,
        tokenUrl,
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
        tglKejadian,
        lokasi,
        umurHari,
        sudahDitinjau,
        tahapProses,
      }) => ({
        idJaminan,
        tokenUrl,
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
        tglKejadian,
        lokasi,
        umurHari,
        sudahDitinjau,
        tahapProses,
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
