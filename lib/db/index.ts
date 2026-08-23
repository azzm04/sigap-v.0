import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tidak diset");
}

// Next.js dev mode me-reload modul ini di setiap hot-reload. Tanpa
// caching, tiap reload bikin koneksi Postgres baru tanpa menutup yang
// lama, sampai akhirnya kena "sorry, too many clients already". Simpan
// instance-nya di globalThis supaya reload berikutnya pakai koneksi yang
// sama, bukan bikin baru -- pola standar yang sama dipakai untuk klien
// Prisma di banyak proyek Next.js.
const globalUntukDb = globalThis as unknown as { koneksiPostgres?: postgres.Sql };

const client =
  globalUntukDb.koneksiPostgres ?? postgres(process.env.DATABASE_URL, { max: 10, idle_timeout: 20 });

if (process.env.NODE_ENV !== "production") {
  globalUntukDb.koneksiPostgres = client;
}

export const db = drizzle(client, { schema });
