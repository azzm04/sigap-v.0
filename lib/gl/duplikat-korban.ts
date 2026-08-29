import { isNull } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

// Tidak ada NIK/nomor identitas unik di berkas ekspor (docs/domain-gl.md),
// jadi "korban yang sama" hanya bisa didekati lewat kecocokan Nama Korban
function kunciNama(nama: string): string {
  return nama.trim().toUpperCase();
}

// Peta nama (dinormalisasi) -> jumlah baris GL aktif dengan nama itu,
// dihitung dari SELURUH gl_mirror (bukan cuma halaman/filter yang sedang
// ditampilkan) -- supaya badge "3 GL" tetap benar walau GL lain milik
// orang itu sedang tidak masuk filter yang aktif.
export async function ambilPetaJumlahGLPerKorban(): Promise<Map<string, number>> {
  const semua = await db
    .select({ namaKorban: glMirror.namaKorban })
    .from(glMirror)
    .where(isNull(glMirror.dihapusPada));

  const peta = new Map<string, number>();
  for (const b of semua) {
    const kunci = kunciNama(b.namaKorban);
    peta.set(kunci, (peta.get(kunci) ?? 0) + 1);
  }
  return peta;
}

export function jumlahGLKorban(peta: Map<string, number>, namaKorban: string): number {
  return peta.get(kunciNama(namaKorban)) ?? 0;
}
