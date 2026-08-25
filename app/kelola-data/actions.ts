"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { glMirror, imporLog } from "@/lib/db/schema";
import { normalisasiDanSimpan } from "@/lib/sumber-data/normalizer";
import { GalatValidasiImpor, parseBerkasEkspor } from "@/lib/sumber-data/sumber-impor";
import { GalatValidasiDASI, parseBerkasDASI, simpanDataDASI } from "@/lib/sumber-data/sumber-dasi";

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

  // 1. Coba parse sebagai data GL utama (JRCare)
  try {
    const baris = parseBerkasEkspor(arrayBuffer);
    const hasil = await normalisasiDanSimpan(baris);

    await db.insert(imporLog).values({
      jenis: "impor",
      namaBerkas,
      jumlahBaris: hasil.jumlahBaris,
      jumlahBaru: hasil.jumlahBaru,
      jumlahBerubah: hasil.jumlahBerubah,
      berhasil: true,
    });

    revalidasiTampilanGL();

    return {
      berhasil: true,
      pesan: `Berhasil diimpor (JRCare): ${hasil.jumlahBaris} baris diproses, ${hasil.jumlahBaru} baru, ${hasil.jumlahBerubah} berubah.`,
    };
  } catch (errorGL) {
    // 2. Jika gagal karena bukan format JRCare, coba parse sebagai data pelengkap (DASI)
    try {
      const barisDASI = parseBerkasDASI(arrayBuffer);
      const hasil = await simpanDataDASI(barisDASI);

      await db.insert(imporLog).values({
        jenis: "impor",
        namaBerkas,
        jumlahBaris: hasil.jumlahBaris,
        jumlahBaru: 0,
        jumlahBerubah: hasil.jumlahCocok,
        berhasil: true,
      });

      revalidasiTampilanGL();

      return {
        berhasil: true,
        pesan: `Berhasil diimpor (DASI): ${hasil.jumlahBaris} baris diproses. Data lokasi cocok dengan ${hasil.jumlahCocok} GL.`,
      };
    } catch (errorDASI) {
      // 3. Jika bukan JRCare dan bukan DASI, gabungkan alasan penolakan
      const pesanJRCare =
        errorGL instanceof GalatValidasiImpor ? errorGL.masalah.join(" | ") : "Galat tak terduga JRCare.";
      const pesanDASI =
        errorDASI instanceof GalatValidasiDASI ? errorDASI.masalah.join(" | ") : "Galat tak terduga DASI.";

      const alasan = `Bukan berkas JRCare valid (${pesanJRCare}) DAN bukan berkas DASI valid (${pesanDASI}).`;

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
      return { berhasil: false, pesan: `Berkas ditolak. Pastikan format sesuai dengan "KLAIM REPORT" JRCare atau DASI.` };
    }
  }
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

export async function unggahBerkasDASI(
  _sebelumnya: StatusUnggah | undefined,
  formData: FormData,
): Promise<StatusUnggah> {
  const berkas = formData.get("berkas");

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { berhasil: false, pesan: "Pilih berkas .xlsx terlebih dahulu." };
  }

  const arrayBuffer = await berkas.arrayBuffer();

  let baris;
  try {
    baris = parseBerkasDASI(arrayBuffer);
  } catch (error) {
    const alasan =
      error instanceof GalatValidasiDASI
        ? error.masalah.join(" | ")
        : "Galat tak terduga saat membaca berkas DASI.";

    return { berhasil: false, pesan: `Berkas DASI ditolak. ${alasan}` };
  }

  const hasil = await simpanDataDASI(baris);

  revalidasiTampilanGL();

  return {
    berhasil: true,
    pesan: `Berhasil memproses ${hasil.jumlahBaris} baris DASI. Data berhasil dicocokkan ke ${hasil.jumlahCocok} GL.`,
  };
}
