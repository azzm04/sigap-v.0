"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tinjauan } from "@/lib/db/schema";

// Abaikan menyingkirkan GL dari papan peringatan secara permanen — beda dari
// "tandai sudah ditinjau" yang cuma menandai (CLAUDE.md bagian 7).
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

  await db.insert(tinjauan).values({
    idJaminan,
    userId: Number(session.user.id),
    catatan: alasan.trim(),
    diabaikan: true,
    alasanAbaikan: alasan.trim(),
  });

  revalidatePath("/peringatan");
  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
}
