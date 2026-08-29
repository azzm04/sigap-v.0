import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tidak diset");
}

const globalUntukDb = globalThis as unknown as { koneksiPostgres?: postgres.Sql };

const client =
  globalUntukDb.koneksiPostgres ?? postgres(process.env.DATABASE_URL, { max: 10, idle_timeout: 20 });

if (process.env.NODE_ENV !== "production") {
  globalUntukDb.koneksiPostgres = client;
}

export const db = drizzle(client, { schema });
