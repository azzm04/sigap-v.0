import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, pengguna, statusProsesPusat, tinjauan } from "../db/schema";
import { TAHAP_BELUM_LIMPAH } from "./pelimpahan";

// Urutannya mewakili alur maju: berkas menunggu dilimpahkan ke loket lain,
// lalu (opsional) masih diproses/direvisi di loket tujuan, lalu diajukan ke
// pusat, lalu selesai. TAHAP_BELUM_LIMPAH dan TAHAP_DALAM_PROSES tidak wajib
// dilalui -- cuma untuk GL yang berkasnya memang perlu berpindah loket
// (lihat lib/gl/pelimpahan.ts) dan/atau masih direvisi di loket tujuan
// sebelum benar-benar siap diajukan ke pusat.
export const TAHAP_PROSES_PUSAT = [
  TAHAP_BELUM_LIMPAH,
  "Berkas Dalam Proses",
  "Berkas Diajukan Ke Pusat",
  "Berkas Selesai",
] as const;

// Dipakai setelah pelimpahan selesai tapi berkas masih direvisi (mis.
// JRCare perlu dikoreksi ulang) di loket tujuan -- jadi belum bisa langsung
// diajukan ke pusat meski proses pelimpahannya sendiri sudah kelar. Arahan
// pemilik proyek: BEBAS dicatat tanpa syarat dokumen (beda dari
// TAHAP_BELUM_LIMPAH dan TAHAP_KELUAR_PERINGATAN di bawah yang mensyaratkan
// KSKK dan/atau Laporan Survei TKP) -- justru dipakai saat dokumen memang
// belum lengkap/masih direvisi. GL di tahap ini TETAP muncul di Papan
// Peringatan PIC Pengajuan karena belum diajukan ke pusat (lihat
// lib/gl/peringatan.ts, yang hanya mengecualikan TAHAP_KELUAR_PERINGATAN).
export const TAHAP_DALAM_PROSES = "Berkas Dalam Proses";

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

// Dipanggil dari lib/sumber-data/normalizer.ts di setiap impor JRCare biasa
// (bukan Sentralisasi Pembayaran) saat baris yang diimpor sudah membawa
// status_pembayaran "Paid" langsung dari sumbernya -- artinya pusat sendiri
// sudah memprosesnya, tapi petugas belum sempat (atau lupa) mencatat "Berkas
// Selesai" secara manual di sini. Tanpa ini, Tahap Proses di Sistem Pusat
// bisa nyangkut selamanya di tahap lama (mis. "Berkas Belum Di Limpah")
// walau gl_mirror sendiri sudah Paid/Done -- GL-nya jadi kelihatan
// kontradiktif di halaman detail, dan tetap nongol di halaman Pelimpahan
// padahal sudah tuntas.
//
// SENGAJA tidak seperti tandaiBerkasSelesai(): tidak menyentuh gl_mirror
// (statusPembayaran/tahapan di sini SUDAH diisi normalizer persis dari baris
// impor itu sendiri -- memaksa tahapan jadi "Done" di sini berisiko menimpa
// nilai asli dari pusat kalau suatu saat ada kombinasi Paid+tahapan lain) dan
// tidak mengunci lewat tinjauan.diabaikan (tidak perlu -- GL Paid memang
// sudah otomatis keluar dari Peringatan PIC Pengajuan tanpa penguncian, beda
// dari kasus Sentralisasi Pembayaran yang memang perlu memaksa Unpaid->Paid
// dan menguncinya supaya tidak tertimpa balik oleh impor JRCare berikutnya).
export async function catatBerkasSelesaiOtomatis(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  idJaminan: string,
  userId: number,
): Promise<void> {
  const [terkini] = await tx
    .select({ tahap: statusProsesPusat.tahap })
    .from(statusProsesPusat)
    .where(eq(statusProsesPusat.idJaminan, idJaminan))
    .orderBy(desc(statusProsesPusat.dicatatPada))
    .limit(1);

  if (terkini?.tahap === TAHAP_PEMICU_PAID) return;

  await tx.insert(statusProsesPusat).values({ idJaminan, tahap: TAHAP_PEMICU_PAID, userId });
}

export interface BarisTahapProses {
  id: number;
  tahap: string;
  /** Hanya terisi untuk tahap TAHAP_BELUM_LIMPAH -- loket tujuan pelimpahan */
  loketPelimpahan: string | null;
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
      loketPelimpahan: statusProsesPusat.loketPelimpahan,
      dicatatPada: statusProsesPusat.dicatatPada,
      namaPengguna: pengguna.username,
    })
    .from(statusProsesPusat)
    .innerJoin(pengguna, eq(statusProsesPusat.userId, pengguna.id))
    .where(eq(statusProsesPusat.idJaminan, idJaminan))
    .orderBy(desc(statusProsesPusat.dicatatPada));
}
