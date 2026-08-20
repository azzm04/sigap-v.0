import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { pengguna, tinjauan } from "../db/schema";

export interface BarisTinjauan {
  id: number;
  catatan: string;
  perluTindakLanjut: boolean;
  diabaikan: boolean;
  alasanAbaikan: string | null;
  ditinjauPada: Date;
  namaPengguna: string;
}

export async function ambilTinjauan(idJaminan: string): Promise<BarisTinjauan[]> {
  return db
    .select({
      id: tinjauan.id,
      catatan: tinjauan.catatan,
      perluTindakLanjut: tinjauan.perluTindakLanjut,
      diabaikan: tinjauan.diabaikan,
      alasanAbaikan: tinjauan.alasanAbaikan,
      ditinjauPada: tinjauan.ditinjauPada,
      namaPengguna: pengguna.username,
    })
    .from(tinjauan)
    .innerJoin(pengguna, eq(tinjauan.userId, pengguna.id))
    .where(eq(tinjauan.idJaminan, idJaminan))
    .orderBy(desc(tinjauan.ditinjauPada));
}
