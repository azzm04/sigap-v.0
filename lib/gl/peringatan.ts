import { and, eq } from "drizzle-orm";
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
  tglGl: string;
  tahapan: string;
  statusPembayaran: string;
  umurHari: number;
}

export interface HasilPeringatan {
  baris: BarisPeringatan[];
  ambangHari: number;
}

// Papan peringatan Tahap 1 (CLAUDE.md bagian 6 dan 7). Pra-saring di SQL
// dengan syarat yang murah (tipe klaim, status GL, status pembayaran) supaya
// tidak menarik ribuan baris Paid/Cancel yang jelas tidak relevan, lalu
// syarat yang lebih rumit (tahapan + ambang umur) dicek lewat
// apakahMasukPeringatan agar satu-satunya sumber kebenaran aturan tetap
// fungsi yang sama dengan yang diuji di aturan-peringatan.test.ts.
export async function ambilPapanPeringatan(): Promise<HasilPeringatan> {
  const ambangHari = await ambilAmbangHari();

  const kandidat = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tglGl: glMirror.tglGl,
      tahapan: glMirror.tahapan,
      tipeKlaim: glMirror.tipeKlaim,
      glStatus: glMirror.glStatus,
      statusPembayaran: glMirror.statusPembayaran,
    })
    .from(glMirror)
    .where(
      and(
        eq(glMirror.tipeKlaim, "GL"),
        eq(glMirror.glStatus, "Active"),
        eq(glMirror.statusPembayaran, "Unpaid"),
      ),
    );

  const diabaikanBaris = await db
    .selectDistinct({ idJaminan: tinjauan.idJaminan })
    .from(tinjauan)
    .where(eq(tinjauan.diabaikan, true));
  const idDiabaikan = new Set(diabaikanBaris.map((b) => b.idJaminan));

  const baris = kandidat
    .filter((b) => !idDiabaikan.has(b.idJaminan))
    .map((b) => ({ ...b, umurHari: hitungUmurHari(b.tglGl) }))
    .filter((b) => apakahMasukPeringatan(b, ambangHari))
    // Prioritas belum jelas (akhiran "00" — lihat CLAUDE.md bagian 7 dan 8),
    // jadi urutkan berdasarkan umur tertinggi sampai dikonfirmasi.
    .sort((a, b) => b.umurHari - a.umurHari)
    .map(({ idJaminan, namaKorban, loket, namaRumahSakit, tglGl, tahapan, statusPembayaran, umurHari }) => ({
      idJaminan,
      namaKorban,
      loket,
      namaRumahSakit,
      tglGl,
      tahapan,
      statusPembayaran,
      umurHari,
    }));

  return { baris, ambangHari };
}
