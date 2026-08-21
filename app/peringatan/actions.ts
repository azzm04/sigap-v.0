"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror, tinjauan } from "@/lib/db/schema";

// Abaikan menyingkirkan GL dari papan peringatan secara permanen — beda dari
// "tandai sudah ditinjau" yang cuma menandai (CLAUDE.md bagian 7). Dipakai
// petugas saat GL sebenarnya sudah dibayar di pusat tapi berkas impor
// terakhir belum mencerminkannya.
//
// Menandai status_pembayaran jadi Paid di gl_mirror supaya konsisten di
// seluruh tampilan (bukan cuma hilang dari papan peringatan). Ini koreksi
// MANUAL, bukan dari berkas ekspor — kalau nanti diimpor ulang dan
// berkasnya masih bilang Unpaid, status ini tertimpa lagi ke Unpaid
// (gl_mirror memang selalu mengikuti impor terakhir). GL tetap tidak akan
// muncul lagi di papan peringatan walau begitu, karena pengecualiannya
// dari baris tinjauan.diabaikan, terpisah dan permanen.
export async function abaikanGL(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const idJaminan = formData.get("idJaminan");
  const alasan = formData.get("alasan");

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof alasan !== "string" || !alasan.trim()) {
    throw new Error("Alasan mengabaikan wajib diisi.");
  }

  const userId = Number(session.user.id);

  await db.transaction(async (tx) => {
    await tx.insert(tinjauan).values({
      idJaminan,
      userId,
      catatan: alasan.trim(),
      diabaikan: true,
      alasanAbaikan: alasan.trim(),
    });

    await tx.update(glMirror).set({ statusPembayaran: "Paid" }).where(eq(glMirror.idJaminan, idJaminan));
  });

  revalidatePath("/peringatan");
  revalidatePath("/");
  revalidatePath("/sebaran");
  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
}
