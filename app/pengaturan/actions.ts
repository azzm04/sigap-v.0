"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { imporLog } from "@/lib/db/schema";
import { setAmbangHari, setAmbangHariPengingat, setEmailPengingat } from "@/lib/pengaturan";
import { normalisasiDanSimpan } from "@/lib/sumber-data/normalizer";
import { GalatValidasiImpor, parseBerkasEkspor } from "@/lib/sumber-data/sumber-impor";

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

export async function ubahPengingatImpor(formData: FormData) {
  const email = formData.get("email");
  const ambangHari = formData.get("ambangHariPengingat");
  const angka = Number(ambangHari);

  if (!Number.isFinite(angka) || !Number.isInteger(angka) || angka <= 0) {
    throw new Error("Ambang hari pengingat harus berupa bilangan bulat positif.");
  }
  if (typeof email !== "string") {
    throw new Error("Alamat email tidak valid.");
  }
  // Boleh kosong (fitur nonaktif), tapi kalau diisi harus bentuk email wajar.
  if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Format alamat email tidak valid.");
  }

  await Promise.all([setEmailPengingat(email.trim()), setAmbangHariPengingat(angka)]);

  revalidatePath("/pengaturan");
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
      namaBerkas,
      jumlahBaris: 0,
      jumlahBaru: 0,
      jumlahBerubah: 0,
      berhasil: false,
      alasanPenolakan: alasan,
    });

    revalidatePath("/log-impor");
    return { berhasil: false, pesan: `Berkas ditolak. ${alasan}` };
  }

  const hasil = await normalisasiDanSimpan(baris);

  await db.insert(imporLog).values({
    namaBerkas,
    jumlahBaris: hasil.jumlahBaris,
    jumlahBaru: hasil.jumlahBaru,
    jumlahBerubah: hasil.jumlahBerubah,
    berhasil: true,
  });

  revalidatePath("/");
  revalidatePath("/peringatan");
  revalidatePath("/pengaturan");
  revalidatePath("/log-impor");

  return {
    berhasil: true,
    pesan: `Berhasil diimpor: ${hasil.jumlahBaris} baris diproses, ${hasil.jumlahBaru} baru, ${hasil.jumlahBerubah} berubah.`,
  };
}
