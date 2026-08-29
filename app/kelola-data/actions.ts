"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror, imporLog } from "@/lib/db/schema";
import { normalisasiDanSimpan } from "@/lib/sumber-data/normalizer";
import { GalatValidasiImpor, parseBerkasEkspor } from "@/lib/sumber-data/sumber-impor";
import { GalatValidasiDASI, parseBerkasDASI, simpanDataDASI } from "@/lib/sumber-data/sumber-dasi";
import {
  GalatValidasiSentralisasi,
  parseBerkasSentralisasi,
  simpanDataSentralisasi,
} from "@/lib/sumber-data/sumber-sentralisasi";

function revalidasiTampilanGL() {
  revalidatePath("/");
  revalidatePath("/peringatan");
  revalidatePath("/proses-pusat");
  revalidatePath("/sebaran");
  revalidatePath("/kelola-data");
  revalidatePath("/kelola-data/sampah");
}

export interface HasilUnggahSatuBerkas {
  namaBerkas: string;
  berhasil: boolean;
  pesan: string;
}

export interface StatusUnggah {
  berhasil: boolean;
  hasil: HasilUnggahSatuBerkas[];
}

const EKSTENSI_DIDUKUNG = [".xlsx", ".csv"];

function ekstensiDidukung(namaBerkas: string): boolean {
  const nama = namaBerkas.toLowerCase();
  return EKSTENSI_DIDUKUNG.some((ekstensi) => nama.endsWith(ekstensi));
}

// Memproses satu berkas: deteksi otomatis JRCare vs DASI vs Sentralisasi
// Pembayaran, sama seperti alur lama, dipisah jadi fungsi sendiri supaya
// bisa dipanggil berulang untuk unggahan banyak berkas sekaligus di
// unggahBerkas(). userId dipakai tier Sentralisasi -- baris
// status_proses_pusat/tinjauan yang tercatat otomatis butuh FK user
// (schema NOT NULL), sama seperti pencatatan manual di
// app/gl/[idJaminan]/actions.ts.
async function prosesSatuBerkas(berkas: File, userId: number): Promise<HasilUnggahSatuBerkas> {
  const namaBerkas = berkas.name;

  if (!ekstensiDidukung(namaBerkas)) {
    const alasan = `Format berkas tidak didukung ("${namaBerkas}"). Hanya .xlsx dan .csv yang bisa diunggah.`;
    await db.insert(imporLog).values({
      jenis: "impor",
      namaBerkas,
      jumlahBaris: 0,
      jumlahBaru: 0,
      jumlahBerubah: 0,
      berhasil: false,
      alasanPenolakan: alasan,
    });
    return { namaBerkas, berhasil: false, pesan: alasan };
  }

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

    return {
      namaBerkas,
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

      return {
        namaBerkas,
        berhasil: true,
        pesan: `Berhasil diimpor (DASI): ${hasil.jumlahBaris} baris diproses. Data lokasi cocok dengan ${hasil.jumlahCocok} GL.`,
      };
    } catch (errorDASI) {
      // 3. Jika bukan JRCare dan bukan DASI, coba parse sebagai Sentralisasi Pembayaran
      try {
        const barisSentralisasi = parseBerkasSentralisasi(arrayBuffer);
        const hasil = await simpanDataSentralisasi(barisSentralisasi, userId);

        await db.insert(imporLog).values({
          jenis: "impor_sentralisasi",
          namaBerkas,
          jumlahBaris: hasil.jumlahBaris,
          jumlahBaru: hasil.jumlahGlDiperbarui,
          jumlahBerubah: hasil.jumlahTidakCocok,
          berhasil: true,
        });

        return {
          namaBerkas,
          berhasil: true,
          pesan: `Berhasil diimpor (Sentralisasi Pembayaran): ${hasil.jumlahBaris} baris, ${hasil.jumlahDiproses} sudah ada Transaction Reference, ${hasil.jumlahGlDiperbarui} GL ditandai Paid, ${hasil.jumlahTidakCocok} nama tidak cocok, ${hasil.jumlahBelumTerbayar} belum terbayar.`,
        };
      } catch (errorSentralisasi) {
        // 4. Kalau bukan JRCare, bukan DASI, dan bukan Sentralisasi, gabungkan alasan penolakan
        const pesanJRCare =
          errorGL instanceof GalatValidasiImpor ? errorGL.masalah.join(" | ") : "Galat tak terduga JRCare.";
        const pesanDASI =
          errorDASI instanceof GalatValidasiDASI ? errorDASI.masalah.join(" | ") : "Galat tak terduga DASI.";
        const pesanSentralisasi =
          errorSentralisasi instanceof GalatValidasiSentralisasi
            ? errorSentralisasi.masalah.join(" | ")
            : "Galat tak terduga Sentralisasi Pembayaran.";

        const alasan = `Bukan berkas JRCare valid (${pesanJRCare}) DAN bukan berkas DASI valid (${pesanDASI}) DAN bukan berkas Sentralisasi Pembayaran valid (${pesanSentralisasi}).`;

        await db.insert(imporLog).values({
          jenis: "impor",
          namaBerkas,
          jumlahBaris: 0,
          jumlahBaru: 0,
          jumlahBerubah: 0,
          berhasil: false,
          alasanPenolakan: alasan,
        });

        return {
          namaBerkas,
          berhasil: false,
          pesan: `Berkas ditolak. Pastikan format sesuai dengan "KLAIM REPORT" JRCare, DASI, atau Sentralisasi Pembayaran.`,
        };
      }
    }
  }
}

// Menerima satu atau banyak berkas sekaligus (input "berkas" bisa muncul
// berkali-kali di FormData). Diproses berurutan, satu-satu -- kalau satu
// berkas gagal, berkas lain tetap lanjut diproses, hasilnya dilaporkan
// per-berkas ke UI.
export async function unggahBerkas(
  _sebelumnya: StatusUnggah | undefined,
  formData: FormData,
): Promise<StatusUnggah> {
  const semuaBerkas = formData
    .getAll("berkas")
    .filter((b): b is File => b instanceof File && b.size > 0);

  if (semuaBerkas.length === 0) {
    return {
      berhasil: false,
      hasil: [
        {
          namaBerkas: "-",
          berhasil: false,
          pesan: "Pilih berkas .xlsx atau .csv terlebih dahulu.",
        },
      ],
    };
  }

  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!session?.user?.id || Number.isNaN(userId)) {
    return {
      berhasil: false,
      hasil: [{ namaBerkas: "-", berhasil: false, pesan: "Sesi tidak valid, silakan masuk ulang." }],
    };
  }

  const hasil: HasilUnggahSatuBerkas[] = [];
  for (const berkas of semuaBerkas) {
    hasil.push(await prosesSatuBerkas(berkas, userId));
  }

  revalidasiTampilanGL();

  return { berhasil: hasil.every((h) => h.berhasil), hasil };
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

export interface StatusSinkronSheets {
  berhasil: boolean;
  pesan: string;
}

// Sinkronisasi DUA ARAH manual dengan Google Sheets
// (lib/google-sheets/index.ts) -- dipicu tombol, bukan cron, sama seperti
// impor. Urutan tarik-lalu-kirim SELALU begini dalam satu klik, tidak ada
// tombol terpisah, supaya edit manual di sheet tidak pernah tertimpa
// hilang -- lihat komentar sinkronDuaArahGoogleSheets(). jumlahBaru dan
// jumlahBerubah di impor_log dipakai ulang di sini untuk menyimpan hasil
// tarik (diperbarui/dilewati), bukan makna aslinya (baris baru/berubah
// dari impor JRCare).
export async function sinkronSheets(): Promise<StatusSinkronSheets> {
  try {
    const { sinkronDuaArahGoogleSheets } = await import("@/lib/google-sheets");
    const hasil = await sinkronDuaArahGoogleSheets();

    await db.insert(imporLog).values({
      jenis: "sinkron_sheets",
      jumlahBaris: hasil.jumlahBaris,
      jumlahBaru: hasil.jumlahDiperbarui,
      jumlahBerubah: hasil.jumlahDilewati,
      berhasil: true,
    });

    revalidasiTampilanGL();

    return {
      berhasil: true,
      pesan: `Tarik dari Sheets: ${hasil.jumlahDiperbarui} GL diperbarui (${hasil.jumlahDilewati} baris dilewati -- ID Jaminan tak dikenal). Kirim ke Sheets: ${hasil.jumlahBaris} baris ke ${hasil.jumlahBulan} sheet bulan.`,
    };
  } catch (error) {
    const alasan = error instanceof Error ? error.message : "Galat tak terduga.";

    await db.insert(imporLog).values({
      jenis: "sinkron_sheets",
      jumlahBaris: 0,
      jumlahBaru: 0,
      jumlahBerubah: 0,
      berhasil: false,
      alasanPenolakan: alasan,
    });

    revalidatePath("/kelola-data");

    return { berhasil: false, pesan: `Sinkron gagal: ${alasan}` };
  }
}
