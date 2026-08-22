"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { glMirror, imporLog } from "@/lib/db/schema";
import { normalisasiDanSimpan } from "@/lib/sumber-data/normalizer";
import { GalatValidasiImpor, parseBerkasEkspor } from "@/lib/sumber-data/sumber-impor";

function revalidasiTampilanGL() {
  revalidatePath("/");
  revalidatePath("/peringatan");
  revalidatePath("/sebaran");
  revalidatePath("/kelola-data");
  revalidatePath("/kelola-data/sampah");
}

export interface StatusUnggah {
  berhasil: boolean;
  pesan: string;
}

// Berkas diproses seluruhnya di memori (arrayBuffer), tidak pernah ditulis ke
// disk — sesuai CLAUDE.md aturan keras #4 soal data pribadi di berkas ekspor.
export async function unggahBerkas(
  _sebelumnya: StatusUnggah | undefined,
  formData: FormData,
): Promise<StatusUnggah> {
  const berkas = formData.get("berkas");

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { berhasil: false, pesan: "Pilih berkas .xlsx terlebih dahulu." };
  }

  const namaBerkas = berkas.name;
  const arrayBuffer = await berkas.arrayBuffer();

  let baris;
  try {
    baris = parseBerkasEkspor(arrayBuffer);
  } catch (error) {
    const alasan =
      error instanceof GalatValidasiImpor
        ? error.masalah.join(" | ")
        : "Galat tak terduga saat membaca berkas.";

    await db.insert(imporLog).values({
      jenis: "impor",
      namaBerkas,
      jumlahBaris: 0,
      jumlahBaru: 0,
      jumlahBerubah: 0,
      berhasil: false,
      alasanPenolakan: alasan,
    });

    revalidatePath("/kelola-data");
    return { berhasil: false, pesan: `Berkas ditolak. ${alasan}` };
  }

  const hasil = await normalisasiDanSimpan(baris);

  await db.insert(imporLog).values({
    jenis: "impor",
    namaBerkas,
    jumlahBaris: hasil.jumlahBaris,
    jumlahBaru: hasil.jumlahBaru,
    jumlahBerubah: hasil.jumlahBerubah,
    berhasil: true,
  });

  revalidatePath("/");
  revalidatePath("/peringatan");
  revalidatePath("/kelola-data");

  return {
    berhasil: true,
    pesan: `Berhasil diimpor: ${hasil.jumlahBaris} baris diproses, ${hasil.jumlahBaru} baru, ${hasil.jumlahBerubah} berubah.`,
  };
}

// Soft delete: menandai seluruh baris gl_mirror yang masih aktif dengan
// timestamp yang sama, dalam satu UPDATE -- itulah yang menyatukan mereka
// sebagai satu "batch" yang bisa dipulihkan bersama lewat halaman Sampah
// (lib/gl/sampah.ts). gl_snapshot, tinjauan, dan impor_log tidak disentuh
// supaya riwayat tetap utuh kalau nanti dipulihkan.
export async function hapusSemuaData() {
  const baris = await db
    .update(glMirror)
    .set({ dihapusPada: new Date() })
    .where(isNull(glMirror.dihapusPada))
    .returning({ id: glMirror.id });

  await db.insert(imporLog).values({
    jenis: "hapus",
    jumlahBaris: baris.length,
    jumlahBaru: 0,
    jumlahBerubah: 0,
    berhasil: true,
  });

  revalidasiTampilanGL();
}

// Mengembalikan satu batch: hanya baris yang dihapusPada-nya masih persis
// sama dengan batch ini -- baris yang sudah "hidup lagi" lewat impor ulang
// (dihapusPada sudah null, lihat normalizer.ts) otomatis tidak ikut ter-
// pengaruh.
export async function pulihkanBatch(formData: FormData) {
  const waktuIso = formData.get("dihapusPada");
  if (typeof waktuIso !== "string" || !waktuIso) {
    throw new Error("Batch tidak valid.");
  }

  const baris = await db
    .update(glMirror)
    .set({ dihapusPada: null })
    .where(eq(glMirror.dihapusPada, new Date(waktuIso)))
    .returning({ id: glMirror.id });

  await db.insert(imporLog).values({
    jenis: "pulihkan",
    jumlahBaris: baris.length,
    jumlahBaru: 0,
    jumlahBerubah: 0,
    berhasil: true,
  });

  revalidasiTampilanGL();
}

// Hapus permanen: BENAR-BENAR menghapus baris dari gl_mirror (bukan soft
// delete), termasuk seluruh gl_snapshot dan tinjauan miliknya lewat
// ON DELETE CASCADE (lib/db/schema.ts). Tidak bisa dibatalkan -- beda dari
// hapusSemuaData/pulihkanBatch yang cuma menyembunyikan. Tidak perlu
// revalidatePath ke "/", "/peringatan", "/sebaran" karena baris ini sudah
// tersembunyi dari sana sejak di-soft-delete.
export async function hapusPermanenBatch(formData: FormData) {
  const waktuIso = formData.get("dihapusPada");
  if (typeof waktuIso !== "string" || !waktuIso) {
    throw new Error("Batch tidak valid.");
  }

  const baris = await db
    .delete(glMirror)
    .where(eq(glMirror.dihapusPada, new Date(waktuIso)))
    .returning({ id: glMirror.id });

  await db.insert(imporLog).values({
    jenis: "hapus_permanen",
    jumlahBaris: baris.length,
    jumlahBaru: 0,
    jumlahBerubah: 0,
    berhasil: true,
  });

  revalidatePath("/kelola-data");
  revalidatePath("/kelola-data/sampah");
}
