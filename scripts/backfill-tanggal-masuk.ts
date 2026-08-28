import { config } from "dotenv";
config({ path: ".env.local" });

// Skrip sekali-jalan: isi Tanggal Masuk = Tgl GL (perkiraan) untuk GL yang
// TERBIT SEBELUM bulan berjalan yang sedang diisi manual -- diminta
// eksplisit pemilik proyek, lihat percakapan terkait fitur Peringatan PIC
// Task Force. Bulan berjalan (BATAS_BULAN ke atas) SENGAJA tidak disentuh
// supaya PIC Task Force tetap mengisi manual seperti biasa untuk kasus
// yang masih aktif dipantau. Idempoten -- hanya menyentuh baris yang
// tanggal_masuk-nya masih NULL, aman dijalankan ulang.
const BATAS_BULAN = "2026-08-01";

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db");

  const hasil = await db.execute(sql`
    UPDATE gl_mirror
    SET tanggal_masuk = tgl_gl
    WHERE tanggal_masuk IS NULL
      AND dihapus_pada IS NULL
      AND tgl_gl < ${BATAS_BULAN}
    RETURNING id
  `);

  console.log(`Selesai: ${hasil.length} baris GL (sebelum ${BATAS_BULAN}) diisi Tanggal Masuk = Tgl GL.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Gagal:", e);
  process.exit(1);
});
