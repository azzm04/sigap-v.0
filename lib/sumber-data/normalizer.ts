import { eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, glSnapshot } from "../db/schema";
import { catatBerkasSelesaiOtomatis } from "../gl/tahap-proses";
import type { BarisGL } from "./index";

export interface HasilNormalisasi {
  jumlahBaris: number;
  jumlahBaru: number;
  jumlahBerubah: number;
}

// userId opsional -- skrip seed data dummy (scripts/seed.ts) memanggil ini
// sebelum ada akun petugas untuk diatribusikan, jadi catatan otomatis
// "Berkas Selesai" di bawah cukup dilewati kalau tidak ada userId.
export async function normalisasiDanSimpan(
  baris: BarisGL[],
  userId?: number,
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
        // dihapusPada dikosongkan lagi kalau ID Jaminan ini pernah dihapus
        // tapi muncul lagi di impor ini berkas ekspor tetap jadi sumber kebenaran paling baru.
        await tx
          .update(glMirror)
          .set({ ...b, diimporPada: new Date(), dihapusPada: null })
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

      // Bukan cuma saat berubah -- GL yang sudah Paid sejak sebelum
      // perbaikan ini juga harus disamakan di impor pertama berikutnya,
      // bukan cuma yang baru berubah jadi Paid di impor ini.
      if (userId != null && b.statusPembayaran === "Paid") {
        await catatBerkasSelesaiOtomatis(tx, b.idJaminan, userId);
      }
    }
  });

  return { jumlahBaris: baris.length, jumlahBaru, jumlahBerubah };
}
