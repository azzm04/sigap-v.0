import { config } from "dotenv";

// Sama seperti scripts/seed.ts: env harus dimuat sebelum modul yang bergantung padanya diimpor.
config({ path: ".env.local" });

// Hanya mengisi data referensi/konfigurasi minimal (ambang hari peringatan
// default, daftar nilai tahap proses pusat) -- TIDAK menyentuh data GL sama
// sekali. Aman dijalankan di lingkungan mana pun, termasuk yang sudah
// berisi data GL nyata (idempoten). Jalankan ini setelah migrasi schema
// baru menambah kategori nilai_referensi baru, tanpa perlu menjalankan
// seeder data dummy (npm run seed) yang akan ikut menambah 600 baris GL
// dummy.
async function main() {
  const { seedReferensiDanPengaturan } = await import("../lib/seed-data");

  await seedReferensiDanPengaturan();

  console.log("Seed data referensi/konfigurasi selesai.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed data referensi gagal:", err);
  process.exit(1);
});
