import { db } from "./db";
import { nilaiReferensi, pengaturan } from "./db/schema";
import { KUNCI_AMBANG_HARI } from "./pengaturan";
import { KATEGORI_TAHAP_PROSES } from "./gl/tahap-proses";

// Daftar tahap proses di sistem pusat (Sub Pra-Verifikasi -> ... -> Berkas
// Selesai), lihat CLAUDE.md aturan keras #3 dan lib/gl/tahap-proses.ts.
const NILAI_TAHAP_PROSES_PUSAT = [
  "Berkas Asbah",
  "Berkas Batal",
  "Berkas Lengkap",
  "Berkas Rekomendasi",
  "Berkas Selesai",
  "Berkas Siap Dibayar",
  "Berkas Siap Diverifikasi",
  "Berkas Telah Diverifikasi",
  "Persetujuan Ka.Wilayah",
  "Sub Pra-Verifikasi",
];

// Mengisi data referensi/konfigurasi minimal yang WAJIB ada supaya
// aplikasi jalan benar -- ambang hari peringatan (aturan keras #2) dan
// daftar nilai tahap proses pusat (aturan keras #3). Sengaja dipisah dari
// seeder data dummy GL (scripts/seed.ts) supaya bisa dijalankan aman di
// lingkungan mana pun, termasuk yang sudah berisi data GL nyata --
// idempoten lewat onConflictDoNothing, tidak pernah menimpa nilai yang
// sudah diubah petugas lewat halaman pengaturan.
export async function seedReferensiDanPengaturan() {
  await db
    .insert(pengaturan)
    .values([{ kunci: KUNCI_AMBANG_HARI, nilai: "14" }])
    .onConflictDoNothing({ target: pengaturan.kunci });

  await db
    .insert(nilaiReferensi)
    .values(
      NILAI_TAHAP_PROSES_PUSAT.map((nilai) => ({
        kategori: KATEGORI_TAHAP_PROSES,
        nilai,
      })),
    )
    .onConflictDoNothing({ target: [nilaiReferensi.kategori, nilaiReferensi.nilai] });
}
