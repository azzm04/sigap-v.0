import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, pengguna, statusProsesPusat, tinjauan } from "../db/schema";

// Disederhanakan jadi 2 tahap tetap atas arahan eksplisit pemilik proyek
export const TAHAP_PROSES_PUSAT = ["Berkas Diajukan Ke Pusat", "Berkas Selesai"] as const;

// Tahap yang memicu status_pembayaran otomatis jadi Paid ketika petugas mencatatnya (lihat app/gl/[idJaminan]/actions.ts, catatTahapProses)
export const TAHAP_PEMICU_PAID = "Berkas Selesai";
export const TAHAP_JRCARE_DONE = "Done";

// Tahap yang membuat GL keluar dari Peringatan PIC Pengajuan (lib/gl/peringatan.ts) yaitu:
// -- BUKAN lewat status_pembayaran jadi Paid (beda dari TAHAP_PEMICU_PAID di atas), karena "sudah diajukan ke pusat" belum tentu "sudah dibayar"
// Jika GL-nya sudah punya Laporan Survei TKP, DAN sudah punya KSKK
// kalau dokumennya baru lengkap belakangan, GL otomatis hilang dari
// peringatan tanpa petugas perlu pilih ulang tahapnya.
export const TAHAP_KELUAR_PERINGATAN = "Berkas Diajukan Ke Pusat";

export async function ambilPilihanTahapProses(): Promise<string[]> {
  return [...TAHAP_PROSES_PUSAT];
}

export async function tandaiBerkasSelesai(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  idJaminan: string,
  userId: number,
  catatan: string,
): Promise<void> {
  await tx.insert(statusProsesPusat).values({ idJaminan, tahap: TAHAP_PEMICU_PAID, userId });
  await tx.insert(tinjauan).values({
    idJaminan,
    userId,
    catatan,
    diabaikan: true,
    alasanAbaikan: catatan,
  });
  await tx
    .update(glMirror)
    .set({ statusPembayaran: "Paid", tahapan: TAHAP_JRCARE_DONE })
    .where(eq(glMirror.idJaminan, idJaminan));
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
