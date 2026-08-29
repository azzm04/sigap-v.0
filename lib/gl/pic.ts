import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { picRumahSakit } from "../db/schema";

export interface BarisPicRumahSakit {
  id: number;
  namaRumahSakit: string;
  picTaskForce: string | null;
  picPengajuan: string | null;
  diperbaruiPada: Date;
}

export async function ambilSemuaPicRumahSakit(): Promise<BarisPicRumahSakit[]> {
  return db.select().from(picRumahSakit).orderBy(asc(picRumahSakit.namaRumahSakit));
}

// Kunci dinormalisasi (trim + uppercase) supaya pencocokan ke
// gl_mirror.namaRumahSakit tidak gagal cuma karena beda spasi/kapital --
// tapi tetap EXACT match, bukan fuzzy/contains, supaya rumah sakit yang
// namanya mirip (mis. "RS Banyumanik" vs "RS Banyumanik 2") tidak salah
// ketuker PIC-nya. Kalau ejaan di berkas ekspor ternyata beda, petugas
// perbaiki lewat halaman Pengaturan -- bukan lewat kode.
function kunciRumahSakit(nama: string): string {
  return nama.trim().toUpperCase();
}

export interface PetaPic {
  picTaskForce: string | null;
  picPengajuan: string | null;
}

// Dipakai lapisan query (lib/gl/queries.ts, lib/gl/peringatan.ts) untuk
// menempelkan PIC ke tiap baris GL berdasarkan namaRumahSakit-nya.
export async function ambilPetaPicRumahSakit(): Promise<Map<string, PetaPic>> {
  const semua = await db.select().from(picRumahSakit);
  const peta = new Map<string, PetaPic>();
  for (const b of semua) {
    peta.set(kunciRumahSakit(b.namaRumahSakit), {
      picTaskForce: b.picTaskForce,
      picPengajuan: b.picPengajuan,
    });
  }
  return peta;
}

export function cariPic(
  peta: Map<string, PetaPic>,
  namaRumahSakit: string | null,
): PetaPic {
  if (!namaRumahSakit) return { picTaskForce: null, picPengajuan: null };
  return peta.get(kunciRumahSakit(namaRumahSakit)) ?? { picTaskForce: null, picPengajuan: null };
}

export async function simpanPicRumahSakit(input: {
  id?: number;
  namaRumahSakit: string;
  picTaskForce: string | null;
  picPengajuan: string | null;
}): Promise<void> {
  const namaRumahSakit = input.namaRumahSakit.trim();
  const picTaskForce = input.picTaskForce?.trim() || null;
  const picPengajuan = input.picPengajuan?.trim() || null;

  if (input.id) {
    await db
      .update(picRumahSakit)
      .set({ namaRumahSakit, picTaskForce, picPengajuan, diperbaruiPada: new Date() })
      .where(eq(picRumahSakit.id, input.id));
  } else {
    await db.insert(picRumahSakit).values({ namaRumahSakit, picTaskForce, picPengajuan });
  }
}

export async function hapusPicRumahSakit(id: number): Promise<void> {
  await db.delete(picRumahSakit).where(eq(picRumahSakit.id, id));
}

// Dipakai filter PIC di Tabel GL (lib/gl/queries.ts) -- baris gl_mirror
// disaring lewat namaRumahSakit, BUKAN dengan menghitung ulang PIC tiap baris. supaya langsung bisa dipakai inArray(glMirror.namaRumahSakit) 
// konsisten dengan aturan "harus persis sama" yang sudah didokumentasikan di komentar tabel picRumahSakit (lib/db/schema.ts).
export async function ambilRumahSakitUntukPic(filter: {
  picTaskForce?: string;
  picPengajuan?: string;
}): Promise<string[]> {
  const kondisi = [];
  if (filter.picTaskForce) kondisi.push(eq(picRumahSakit.picTaskForce, filter.picTaskForce));
  if (filter.picPengajuan) kondisi.push(eq(picRumahSakit.picPengajuan, filter.picPengajuan));
  if (kondisi.length === 0) return [];

  const baris = await db
    .select({ namaRumahSakit: picRumahSakit.namaRumahSakit })
    .from(picRumahSakit)
    .where(and(...kondisi));
  return baris.map((b) => b.namaRumahSakit);
}

export async function ambilNamaPicPengajuan(): Promise<string[]> {
  const semua = await db
    .select({ picPengajuan: picRumahSakit.picPengajuan })
    .from(picRumahSakit);
  return [...new Set(semua.map((b) => b.picPengajuan).filter((v): v is string => !!v))].sort();
}

// Nama unik PIC Task Force -- dipakai dropdown filter di Tabel GL
// (lib/gl/queries.ts). Diambil dari pic_rumah_sakit (bukan hardcode) bukan berkas ekspor.
export async function ambilNamaPicTaskForce(): Promise<string[]> {
  const semua = await db
    .select({ picTaskForce: picRumahSakit.picTaskForce })
    .from(picRumahSakit);
  return [...new Set(semua.map((b) => b.picTaskForce).filter((v): v is string => !!v))].sort();
}
