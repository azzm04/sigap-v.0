"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror, tinjauan } from "@/lib/db/schema";

// Menandai status_pembayaran jadi Paid di gl_mirror kalau petugas mencentang
// "Tandai juga sebagai Sudah Dibayar" — dipakai saat GL sebenarnya sudah
// dibayar di pusat tapi berkas impor terakhir belum mencerminkannya. Ini
// koreksi MANUAL, bukan dari berkas ekspor: kalau nanti diimpor ulang dan
// berkasnya masih bilang Unpaid, status ini tertimpa lagi ke Unpaid
// (gl_mirror memang selalu mengikuti impor terakhir). GL tetap tidak akan
// muncul lagi di papan peringatan walau begitu, karena pengecualiannya dari
// baris tinjauan.diabaikan, terpisah dan permanen dari gl_mirror.
export async function tandaiDitinjau(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";
  const tandaiSudahDibayar = formData.get("tandaiSudahDibayar") === "on";

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db.transaction(async (tx) => {
    await tx.insert(tinjauan).values({
      idJaminan,
      userId,
      catatan: catatan.trim(),
      perluTindakLanjut,
      ...(tandaiSudahDibayar
        ? { diabaikan: true, alasanAbaikan: catatan.trim() }
        : {}),
    });

    if (tandaiSudahDibayar) {
      await tx
        .update(glMirror)
        .set({ statusPembayaran: "Paid" })
        .where(eq(glMirror.idJaminan, idJaminan));
    }
  });

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
  if (tandaiSudahDibayar) {
    revalidatePath("/");
    revalidatePath("/sebaran");
  }
}
