"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tinjauan } from "@/lib/db/schema";

export async function tandaiDitinjau(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db.insert(tinjauan).values({
    idJaminan,
    userId: Number(session.user.id),
    catatan: catatan.trim(),
    perluTindakLanjut,
  });

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
}
