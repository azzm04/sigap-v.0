"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pengguna } from "@/lib/db/schema";
import { hapusPicRumahSakit, simpanPicRumahSakit } from "@/lib/gl/pic";
import { simpanTandaTangan } from "@/lib/laporan-tkp/tanda-tangan";
import { setAmbangHari } from "@/lib/pengaturan";

function revalidasiTampilanPic() {
  revalidatePath("/pengaturan");
  revalidatePath("/");
  revalidatePath("/peringatan");
}

export async function simpanPic(formData: FormData) {
  const idMentah = formData.get("id");
  const namaRumahSakit = formData.get("namaRumahSakit");
  const picTaskForce = formData.get("picTaskForce");
  const picPengajuan = formData.get("picPengajuan");

  if (typeof namaRumahSakit !== "string" || !namaRumahSakit.trim()) {
    throw new Error("Nama Rumah Sakit wajib diisi.");
  }

  await simpanPicRumahSakit({
    id: typeof idMentah === "string" && idMentah ? Number(idMentah) : undefined,
    namaRumahSakit,
    picTaskForce: typeof picTaskForce === "string" ? picTaskForce : null,
    picPengajuan: typeof picPengajuan === "string" ? picPengajuan : null,
  });

  revalidasiTampilanPic();
}

export async function hapusPic(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Baris PIC tidak valid.");
  }

  await hapusPicRumahSakit(Number(id));

  revalidasiTampilanPic();
}

const TIPE_GAMBAR_DIIZINKAN = ["image/png", "image/jpeg"];
const UKURAN_MAKS_GAMBAR = 2 * 1024 * 1024; // 2 MB, cukup untuk gambar tanda tangan

// Simpan/perbarui tanda tangan untuk Laporan Survei TKP (lib/laporan-tkp/).
// Gambar cuma diganti kalau petugas benar-benar unggah file baru --
// mengosongkan input file di form edit tidak menghapus gambar yang sudah ada.
export async function simpanTandaTanganAction(formData: FormData) {
  const pemilik = formData.get("pemilik");
  const namaTampil = formData.get("namaTampil");
  const jabatan = formData.get("jabatan");
  const berkas = formData.get("gambar");

  if (typeof pemilik !== "string" || !pemilik) {
    throw new Error("Pemilik tanda tangan tidak valid.");
  }

  let gambar: string | undefined;
  if (berkas instanceof File && berkas.size > 0) {
    if (!TIPE_GAMBAR_DIIZINKAN.includes(berkas.type)) {
      throw new Error("Gambar tanda tangan harus format PNG atau JPEG.");
    }
    if (berkas.size > UKURAN_MAKS_GAMBAR) {
      throw new Error("Ukuran gambar tanda tangan maksimal 2 MB.");
    }
    const arrayBuffer = await berkas.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    gambar = `data:${berkas.type};base64,${base64}`;
  }

  await simpanTandaTangan({
    pemilik,
    ...(gambar !== undefined ? { gambar } : {}),
    namaTampil: typeof namaTampil === "string" ? namaTampil.trim() || null : null,
    jabatan: typeof jabatan === "string" ? jabatan.trim() || null : null,
  });

  revalidatePath("/pengaturan");
}

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
