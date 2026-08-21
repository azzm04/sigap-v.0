import { eq } from "drizzle-orm";
import { db } from "./db";
import { pengaturan } from "./db/schema";

export const KUNCI_AMBANG_HARI = "ambang_hari_peringatan";

// Tidak ada nilai bawaan di sini (CLAUDE.md aturan keras #2: ambang hari
// tidak boleh di-hardcode di logika). Baris pengaturan wajib sudah ada di
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

// Pengingat impor (Tahap 2). Email kosong berarti fitur nonaktif -- beda
// dari ambang hari peringatan, ini memang boleh belum diisi.
export const KUNCI_EMAIL_PENGINGAT = "email_pengingat_impor";
export const KUNCI_AMBANG_HARI_PENGINGAT = "ambang_hari_pengingat_impor";

export async function ambilEmailPengingat(): Promise<string> {
  const [baris] = await db
    .select()
    .from(pengaturan)
    .where(eq(pengaturan.kunci, KUNCI_EMAIL_PENGINGAT))
    .limit(1);
  return baris?.nilai.trim() ?? "";
}

export async function setEmailPengingat(email: string): Promise<void> {
  await db
    .insert(pengaturan)
    .values({ kunci: KUNCI_EMAIL_PENGINGAT, nilai: email.trim() })
    .onConflictDoUpdate({ target: pengaturan.kunci, set: { nilai: email.trim() } });
}

export async function ambilAmbangHariPengingat(): Promise<number> {
  const [baris] = await db
    .select()
    .from(pengaturan)
    .where(eq(pengaturan.kunci, KUNCI_AMBANG_HARI_PENGINGAT))
    .limit(1);

  if (!baris) {
    throw new Error(
      `Pengaturan "${KUNCI_AMBANG_HARI_PENGINGAT}" belum diisi di database. Jalankan npm run seed.`,
    );
  }

  const angka = Number(baris.nilai);
  if (!Number.isFinite(angka) || angka <= 0) {
    throw new Error(
      `Nilai pengaturan "${KUNCI_AMBANG_HARI_PENGINGAT}" tidak valid: "${baris.nilai}"`,
    );
  }

  return angka;
}

export async function setAmbangHariPengingat(hari: number): Promise<void> {
  await db
    .insert(pengaturan)
    .values({ kunci: KUNCI_AMBANG_HARI_PENGINGAT, nilai: String(hari) })
    .onConflictDoUpdate({ target: pengaturan.kunci, set: { nilai: String(hari) } });
}
