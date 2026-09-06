"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { gagal, type StatusAksi, sukses } from "@/lib/aksi";
import { db } from "@/lib/db";
import { pengguna } from "@/lib/db/schema";
import { hapusLoketPelimpahan, simpanLoketPelimpahan } from "@/lib/gl/loket-pelimpahan";
import { hapusPicRumahSakit, simpanPicRumahSakit } from "@/lib/gl/pic";
import { simpanTandaTangan } from "@/lib/laporan-tkp/tanda-tangan";
import { setAmbangHari, setBatasRiwayat } from "@/lib/pengaturan";

function revalidasiTampilanPic() {
  revalidatePath("/pengaturan");
  revalidatePath("/");
  revalidatePath("/peringatan");
}

export async function simpanPic(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const idMentah = formData.get("id");
  const namaRumahSakit = formData.get("namaRumahSakit");
  const picTaskForce = formData.get("picTaskForce");
  const picPengajuan = formData.get("picPengajuan");

  if (typeof namaRumahSakit !== "string" || !namaRumahSakit.trim()) {
    return gagal("Nama Rumah Sakit wajib diisi.");
  }

  await simpanPicRumahSakit({
    id: typeof idMentah === "string" && idMentah ? Number(idMentah) : undefined,
    namaRumahSakit,
    picTaskForce: typeof picTaskForce === "string" ? picTaskForce : null,
    picPengajuan: typeof picPengajuan === "string" ? picPengajuan : null,
  });

  revalidasiTampilanPic();

  return sukses("Pemetaan PIC tersimpan.");
}

export async function hapusPic(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return gagal("Baris PIC tidak valid.");
  }

  await hapusPicRumahSakit(Number(id));

  revalidasiTampilanPic();

  return sukses("Pemetaan PIC dihapus.");
}

function revalidasiTampilanLoketPelimpahan() {
  revalidatePath("/pengaturan");
  revalidatePath("/pelimpahan");
}

export async function simpanLoket(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const idMentah = formData.get("id");
  const nama = formData.get("nama");

  if (typeof nama !== "string" || !nama.trim()) {
    return gagal("Nama loket wajib diisi.");
  }

  await simpanLoketPelimpahan({
    id: typeof idMentah === "string" && idMentah ? Number(idMentah) : undefined,
    nama,
  });

  revalidasiTampilanLoketPelimpahan();

  return sukses("Loket pelimpahan tersimpan.");
}

export async function hapusLoket(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return gagal("Baris loket tidak valid.");
  }

  await hapusLoketPelimpahan(Number(id));

  revalidasiTampilanLoketPelimpahan();

  return sukses("Loket pelimpahan dihapus.");
}

const TIPE_GAMBAR_DIIZINKAN = ["image/png", "image/jpeg"];
const UKURAN_MAKS_GAMBAR = 2 * 1024 * 1024; // 2 MB, cukup untuk gambar tanda tangan

// Simpan/perbarui tanda tangan untuk Laporan Survei TKP (lib/laporan-tkp/).
// Gambar cuma diganti kalau petugas benar-benar unggah file baru --
// mengosongkan input file di form edit tidak menghapus gambar yang sudah ada.
export async function simpanTandaTanganAction(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const pemilik = formData.get("pemilik");
  const namaTampil = formData.get("namaTampil");
  const jabatan = formData.get("jabatan");
  const berkas = formData.get("gambar");

  if (typeof pemilik !== "string" || !pemilik) {
    return gagal("Pemilik tanda tangan tidak valid.");
  }

  let gambar: string | undefined;
  if (berkas instanceof File && berkas.size > 0) {
    if (!TIPE_GAMBAR_DIIZINKAN.includes(berkas.type)) {
      return gagal(
        `Gambar tanda tangan harus format PNG atau JPEG. Berkas "${berkas.name}" bukan PNG/JPEG.`,
      );
    }
    if (berkas.size > UKURAN_MAKS_GAMBAR) {
      const mb = Math.round((berkas.size / 1024 / 1024) * 10) / 10;
      return gagal(`Ukuran gambar tanda tangan maksimal 2 MB, berkas ini ${mb} MB.`);
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

  return sukses("Tanda tangan tersimpan.");
}

export async function ubahAmbangHari(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const nilai = formData.get("ambangHari");
  const angka = Number(nilai);

  if (!Number.isFinite(angka) || !Number.isInteger(angka) || angka <= 0) {
    return gagal("Ambang hari harus berupa bilangan bulat positif, misalnya 14.");
  }

  await setAmbangHari(angka);

  revalidatePath("/pengaturan");
  revalidatePath("/peringatan");
  revalidatePath("/");

  return sukses(`Ambang hari peringatan diubah menjadi ${angka} hari.`);
}

export async function ubahBatasRiwayat(
  _sebelumnya: StatusAksi | undefined,
  formData: FormData,
): Promise<StatusAksi> {
  const nilai = formData.get("batasRiwayat");
  const angka = Number(nilai);

  if (!Number.isFinite(angka) || !Number.isInteger(angka) || angka <= 0) {
    return gagal("Batas riwayat harus berupa bilangan bulat positif, misalnya 100.");
  }

  await setBatasRiwayat(angka);

  revalidatePath("/pengaturan");
  revalidatePath("/kelola-data");

  return sukses(`Batas riwayat log diubah menjadi ${angka} baris.`);
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
