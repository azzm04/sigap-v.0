import { config } from "dotenv";

// Skrip sekali-jalan: mengisi gl_mirror.tanggal_masuk dari tgl_kejadian
// (Tgl LAKA DASI) untuk baris yang tgl_kejadian-nya sudah ada (dari impor
// DASI) tapi tanggal_masuk masih kosong (PIC Task Force belum sempat isi
// manual). Arah sebaliknya dari
// scripts/backfill-tgl-kejadian-dari-tanggal-masuk.ts -- sesuai arahan
// pemilik proyek, kedua tanggal ini dianggap sama secara operasional.
// Idempoten -- aman dijalankan berkali-kali (WHERE tanggal_masuk IS NULL
// memastikan baris yang sudah terisi, baik manual oleh PIC Task Force
// maupun otomatis dari impor DASI berikutnya, tidak pernah tertimpa ulang).
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../lib/db");
  const { glMirror } = await import("../lib/db/schema");
  const { and, isNotNull, isNull, sql } = await import("drizzle-orm");

  const hasil = await db
    .update(glMirror)
    .set({ tanggalMasuk: sql`${glMirror.tglKejadian}` })
    .where(and(isNotNull(glMirror.tglKejadian), isNull(glMirror.tanggalMasuk)))
    .returning({ id: glMirror.id, idJaminan: glMirror.idJaminan });

  console.log(`Backfill selesai: ${hasil.length} baris tanggal_masuk diisi dari tgl_kejadian.`);
  for (const b of hasil) console.log("-", b.idJaminan);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill gagal:", error);
    process.exit(1);
  });
