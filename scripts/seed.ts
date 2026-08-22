import { config } from "dotenv";

// Harus dijalankan sebelum modul lain diimpor: lib/db/index.ts membaca
// DATABASE_URL saat modul dimuat. Next.js otomatis memuat .env.local untuk
// aplikasi, tapi skrip mandiri seperti ini tidak, jadi dimuat manual di sini.
// Impor modul yang bergantung pada DATABASE_URL memakai import() dinamis
// supaya urutan evaluasinya pasti setelah config() ini jalan.
config({ path: ".env.local" });

async function main() {
  const { sumberDummy } = await import("../lib/sumber-data/sumber-dummy");
  const { normalisasiDanSimpan } = await import(
    "../lib/sumber-data/normalizer"
  );
  const { db } = await import("../lib/db");
  const { pengaturan } = await import("../lib/db/schema");
  const { KUNCI_AMBANG_HARI } = await import("../lib/pengaturan");

  const baris = await sumberDummy.ambilGL();
  const hasil = await normalisasiDanSimpan(baris);

  // Isi hanya kalau belum pernah diisi — jangan timpa nilai yang mungkin
  // sudah diubah petugas lewat halaman pengaturan.
  await db
    .insert(pengaturan)
    .values([{ kunci: KUNCI_AMBANG_HARI, nilai: "14" }])
    .onConflictDoNothing({ target: pengaturan.kunci });

  console.log(
    `Seed selesai: ${hasil.jumlahBaris} baris diproses, ${hasil.jumlahBaru} baru, ${hasil.jumlahBerubah} berubah.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
