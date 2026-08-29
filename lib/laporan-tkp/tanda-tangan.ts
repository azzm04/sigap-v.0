import { eq } from "drizzle-orm";
import { db } from "../db";
import { tandaTangan } from "../db/schema";

// Sentinel untuk baris tanda tangan Kepala Cabang Semarang DAN Petugas
// Survei -- KEDUANYA tetap/satu-satunya untuk semua Laporan Survei TKP,
// TIDAK bergantung PIC mana pun (dikonfirmasi eksplisit oleh pemilik
// proyek berdasarkan referensi PDF asli "LHS TKP.pdf": siapa pun PIC-nya,
// Petugas Survei selalu orang yang sama). Nama tampil ("HENGGAR AZIZ") dan
// gambar tanda tangannya diisi manual sekali lewat Pengaturan, bukan hardcode di kode
export const PEMILIK_KEPALA_CABANG = "__kepala_cabang_semarang__";
export const PEMILIK_PETUGAS_SURVEI = "__petugas_survei_tetap__";

export interface BarisTandaTangan {
  id: number;
  pemilik: string;
  gambar: string | null;
  namaTampil: string | null;
  jabatan: string | null;
  diperbaruiPada: Date;
}

export async function ambilTandaTangan(pemilik: string): Promise<BarisTandaTangan | null> {
  const [baris] = await db.select().from(tandaTangan).where(eq(tandaTangan.pemilik, pemilik)).limit(1);
  return baris ?? null;
}

export async function ambilSemuaTandaTangan(): Promise<BarisTandaTangan[]> {
  return db.select().from(tandaTangan);
}

export async function simpanTandaTangan(input: {
  pemilik: string;
  gambar?: string | null;
  namaTampil?: string | null;
  jabatan?: string | null;
}): Promise<void> {
  await db
    .insert(tandaTangan)
    .values({
      pemilik: input.pemilik,
      gambar: input.gambar ?? null,
      namaTampil: input.namaTampil ?? null,
      jabatan: input.jabatan ?? null,
    })
    .onConflictDoUpdate({
      target: tandaTangan.pemilik,
      set: {
        ...(input.gambar !== undefined ? { gambar: input.gambar } : {}),
        ...(input.namaTampil !== undefined ? { namaTampil: input.namaTampil } : {}),
        ...(input.jabatan !== undefined ? { jabatan: input.jabatan } : {}),
        diperbaruiPada: new Date(),
      },
    });
}
