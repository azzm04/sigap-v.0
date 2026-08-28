import { eq } from "drizzle-orm";
import { db } from "./db";
import { pengaturan } from "./db/schema";
import { tanggalHariIniWIB } from "./format";

export const KUNCI_AMBANG_HARI = "ambang_hari_peringatan";

// Tidak ada nilai bawaan di sini. Baris pengaturan wajib sudah ada di
// database — diisi lewat scripts/seed.ts saat penyiapan awal, atau lewat
// setAmbangHari() dari halaman pengaturan nanti.
export async function ambilAmbangHari(): Promise<number> {
  const [baris] = await db
    .select()
    .from(pengaturan)
    .where(eq(pengaturan.kunci, KUNCI_AMBANG_HARI))
    .limit(1);

  if (!baris) {
    throw new Error(
      `Pengaturan "${KUNCI_AMBANG_HARI}" belum diisi di database. Jalankan npm run seed.`,
    );
  }

  const angka = Number(baris.nilai);
  if (!Number.isFinite(angka) || angka <= 0) {
    throw new Error(`Nilai pengaturan "${KUNCI_AMBANG_HARI}" tidak valid: "${baris.nilai}"`);
  }

  return angka;
}

export async function setAmbangHari(hari: number): Promise<void> {
  await db
    .insert(pengaturan)
    .values({ kunci: KUNCI_AMBANG_HARI, nilai: String(hari) })
    .onConflictDoUpdate({ target: pengaturan.kunci, set: { nilai: String(hari) } });
}

// Menandai kapan terakhir kali notifikasi papan peringatan di topbar dibuka,
// supaya munculnya otomatis cukup sekali per hari (bukan tiap kali pindah
// halaman) — dibandingkan dengan tanggalHariIniWIB() di sisi pemanggil.
export const KUNCI_NOTIFIKASI_DILIHAT = "notifikasi_peringatan_dilihat_pada";

export async function ambilNotifikasiDilihatPada(): Promise<string | null> {
  const [baris] = await db
    .select()
    .from(pengaturan)
    .where(eq(pengaturan.kunci, KUNCI_NOTIFIKASI_DILIHAT))
    .limit(1);
  return baris?.nilai ?? null;
}

export async function tandaiNotifikasiDilihatHariIni(): Promise<void> {
  const hariIni = tanggalHariIniWIB();
  await db
    .insert(pengaturan)
    .values({ kunci: KUNCI_NOTIFIKASI_DILIHAT, nilai: hariIni })
    .onConflictDoUpdate({ target: pengaturan.kunci, set: { nilai: hariIni } });
}
