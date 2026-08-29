import { config } from "dotenv";

// Skrip sekali-jalan: mengisi gl_mirror.tgl_kejadian (Tgl LAKA) dari
// tanggal_masuk untuk baris yang tanggal_masuk-nya sudah diisi PIC Task
// Force tapi tgl_kejadian masih kosong (belum ada data DASI yang cocok).
// Sesuai arahan pemilik proyek: kedua tanggal ini dianggap sama secara
// operasional. Idempoten -- aman dijalankan berkali-kali (WHERE tgl_kejadian
// IS NULL memastikan baris yang sudah terisi, baik dari sini maupun dari
// impor DASI asli, tidak pernah tertimpa ulang).
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { glMirror } = await import("../lib/db/schema");
  const { and, isNotNull, isNull, sql } = await import("drizzle-orm");

  const hasil = await db
    .update(glMirror)
    .set({ tglKejadian: sql`${glMirror.tanggalMasuk}` })
    .where(and(isNotNull(glMirror.tanggalMasuk), isNull(glMirror.tglKejadian)))
    .returning({ id: glMirror.id, idJaminan: glMirror.idJaminan });

  console.log(`Backfill selesai: ${hasil.length} baris tgl_kejadian diisi dari tanggal_masuk.`);
  for (const b of hasil) console.log("-", b.idJaminan);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill gagal:", error);
    process.exit(1);
  });
