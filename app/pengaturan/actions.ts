"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pengguna } from "@/lib/db/schema";
import { setAmbangHari } from "@/lib/pengaturan";

export async function ubahAmbangHari(formData: FormData) {
  const nilai = formData.get("ambangHari");
  const angka = Number(nilai);

  if (!Number.isFinite(angka) || !Number.isInteger(angka) || angka <= 0) {
    throw new Error("Ambang hari harus berupa bilangan bulat positif.");
  }

  await setAmbangHari(angka);

  revalidatePath("/pengaturan");
  revalidatePath("/peringatan");
  revalidatePath("/");
}

export interface StatusKataSandi {
  berhasil: boolean;
  pesan: string;
}

export async function ubahKataSandi(
  _sebelumnya: StatusKataSandi | undefined,
  formData: FormData,
): Promise<StatusKataSandi> {
  const session = await auth();
  if (!session?.user?.id) {
    return { berhasil: false, pesan: "Sesi tidak valid, silakan masuk ulang." };
  }

  const sekarang = formData.get("sekarang");
  const baru = formData.get("baru");
  const konfirmasi = formData.get("konfirmasi");

  if (typeof sekarang !== "string" || typeof baru !== "string" || typeof konfirmasi !== "string") {
    return { berhasil: false, pesan: "Semua kolom wajib diisi." };
  }
  if (baru.length < 8) {
    return { berhasil: false, pesan: "Kata sandi baru minimal 8 karakter." };
  }
  if (baru !== konfirmasi) {
    return { berhasil: false, pesan: "Konfirmasi kata sandi baru tidak cocok." };
  }

  const [user] = await db
    .select()
    .from(pengguna)
    .where(eq(pengguna.id, Number(session.user.id)))
    .limit(1);
  if (!user) {
    return { berhasil: false, pesan: "Akun tidak ditemukan." };
  }

  const cocok = await bcrypt.compare(sekarang, user.passwordHash);
  if (!cocok) {
    return { berhasil: false, pesan: "Kata sandi saat ini salah." };
  }

  const hashBaru = await bcrypt.hash(baru, 10);
  await db.update(pengguna).set({ passwordHash: hashBaru }).where(eq(pengguna.id, user.id));

  return { berhasil: true, pesan: "Kata sandi berhasil diperbarui." };
}
