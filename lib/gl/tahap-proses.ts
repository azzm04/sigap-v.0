import { asc, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { nilaiReferensi, pengguna, statusProsesPusat } from "../db/schema";

export const KATEGORI_TAHAP_PROSES = "tahap_proses_pusat";

// Tahap yang memicu status_pembayaran otomatis jadi Paid ketika petugas
// mencatatnya (lihat app/gl/[idJaminan]/actions.ts, catatTahapProses). Ini
// konstanta aturan bisnis yang memang tetap, bukan daftar enum terbuka —
// sama seperti TAHAPAN_DIPANTAU di lib/gl/aturan-peringatan.ts.
export const TAHAP_PEMICU_PAID = "Berkas Selesai";

// Daftar nilai tahap yang valid. Dibaca dari nilai_referensi, bukan
// di-hardcode di kode (CLAUDE.md aturan keras #3) — daftar ini bisa
// bertambah kalau klien menyebut tahap baru.
export async function ambilPilihanTahapProses(): Promise<string[]> {
  const baris = await db
    .select({ nilai: nilaiReferensi.nilai })
    .from(nilaiReferensi)
    .where(eq(nilaiReferensi.kategori, KATEGORI_TAHAP_PROSES))
    .orderBy(asc(nilaiReferensi.nilai));

  return baris.map((b) => b.nilai);
}

export interface BarisTahapProses {
  id: number;
  tahap: string;
  dicatatPada: Date;
  namaPengguna: string;
}

export async function ambilRiwayatTahapProses(
  idJaminan: string,
): Promise<BarisTahapProses[]> {
  return db
    .select({
      id: statusProsesPusat.id,
      tahap: statusProsesPusat.tahap,
      dicatatPada: statusProsesPusat.dicatatPada,
      namaPengguna: pengguna.username,
    })
    .from(statusProsesPusat)
    .innerJoin(pengguna, eq(statusProsesPusat.userId, pengguna.id))
    .where(eq(statusProsesPusat.idJaminan, idJaminan))
    .orderBy(desc(statusProsesPusat.dicatatPada));
}
