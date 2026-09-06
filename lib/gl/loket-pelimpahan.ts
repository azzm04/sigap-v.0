import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { loketPelimpahan } from "../db/schema";

export interface BarisLoketPelimpahan {
  id: number;
  nama: string;
}

export async function ambilSemuaLoketPelimpahan(): Promise<BarisLoketPelimpahan[]> {
  return db.select().from(loketPelimpahan).orderBy(asc(loketPelimpahan.nama));
}

// Dipakai dropdown Loket Cabang (form tahap proses, filter Pelimpahan) --
// server component memanggil ini lalu meneruskan hasilnya sebagai prop ke
// client component, karena modul ini mengimpor db/postgres.
export async function ambilNamaLoketPelimpahan(): Promise<string[]> {
  const semua = await ambilSemuaLoketPelimpahan();
  return semua.map((b) => b.nama);
}

export async function apakahLoketPelimpahanValid(nama: string): Promise<boolean> {
  const daftar = await ambilNamaLoketPelimpahan();
  return daftar.includes(nama);
}

export async function simpanLoketPelimpahan(input: { id?: number; nama: string }): Promise<void> {
  const nama = input.nama.trim();
  if (input.id) {
    await db.update(loketPelimpahan).set({ nama }).where(eq(loketPelimpahan.id, input.id));
  } else {
    await db.insert(loketPelimpahan).values({ nama });
  }
}

export async function hapusLoketPelimpahan(id: number): Promise<void> {
  await db.delete(loketPelimpahan).where(eq(loketPelimpahan.id, id));
}
