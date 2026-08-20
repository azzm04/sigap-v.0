import { eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, glSnapshot } from "../db/schema";
import type { BarisGL } from "./index";

export interface HasilNormalisasi {
  jumlahBaris: number;
  jumlahBaru: number;
  jumlahBerubah: number;
}

// Menulis BarisGL[] (dari sumber-dummy.ts atau sumber-impor.ts) ke gl_mirror,
// dan menyisipkan baris gl_snapshot baru hanya kalau tahapan/status_verifikasi/
// status_pembayaran berubah dari yang tersimpan sebelumnya. Lihat CLAUDE.md
// bagian 5, aturan penulisan gl_snapshot.
export async function normalisasiDanSimpan(
  baris: BarisGL[],
): Promise<HasilNormalisasi> {
  let jumlahBaru = 0;
  let jumlahBerubah = 0;

  await db.transaction(async (tx) => {
    for (const b of baris) {
      const [existing] = await tx
        .select({
          tahapan: glMirror.tahapan,
          statusVerifikasi: glMirror.statusVerifikasi,
          statusPembayaran: glMirror.statusPembayaran,
        })
        .from(glMirror)
        .where(eq(glMirror.idJaminan, b.idJaminan))
        .limit(1);

      const berubah =
        !existing ||
        existing.tahapan !== b.tahapan ||
        existing.statusVerifikasi !== b.statusVerifikasi ||
        existing.statusPembayaran !== b.statusPembayaran;

      if (!existing) {
        await tx.insert(glMirror).values({ ...b, diimporPada: new Date() });
        jumlahBaru++;
      } else {
        await tx
          .update(glMirror)
          .set({ ...b, diimporPada: new Date() })
          .where(eq(glMirror.idJaminan, b.idJaminan));
        if (berubah) jumlahBerubah++;
      }

      if (berubah) {
        await tx.insert(glSnapshot).values({
          idJaminan: b.idJaminan,
          tahapan: b.tahapan,
          statusVerifikasi: b.statusVerifikasi,
          statusPembayaran: b.statusPembayaran,
        });
      }
    }
  });

  return { jumlahBaris: baris.length, jumlahBaru, jumlahBerubah };
}
