import { and, desc, ilike, or, eq } from "drizzle-orm";
import { db } from "../db";
import { glMirror, pengguna, tinjauan } from "../db/schema";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisTinjauanLengkap {
  id: number;
  idJaminan: string;
  /** Token terenkripsi untuk URL /gl/[token] -- lihat lib/gl/token-url.ts */
  tokenUrl: string;
  namaKorban: string;
  catatan: string;
  perluTindakLanjut: boolean;
  diabaikan: boolean;
  alasanAbaikan: string | null;
  ditinjauPada: Date;
  namaPengguna: string;
}

export interface FilterSemuaTinjauan {
  halaman?: number;
  ukuran?: number;
  cari?: string;
  label?: "tindak_lanjut" | "diabaikan";
}

export interface HasilSemuaTinjauan {
  baris: BarisTinjauanLengkap[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
}

const UKURAN_DEFAULT = 20;

export async function ambilSemuaTinjauan(
  filter: FilterSemuaTinjauan = {},
): Promise<HasilSemuaTinjauan> {
  const kondisi = [];

  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(
      ilike(glMirror.namaKorban, pola),
      ilike(glMirror.idJaminan, pola),
      ilike(tinjauan.catatan, pola),
    );
    if (kondisiCari) kondisi.push(kondisiCari);
  }

  if (filter.label === "tindak_lanjut") {
    kondisi.push(eq(tinjauan.perluTindakLanjut, true));
  } else if (filter.label === "diabaikan") {
    kondisi.push(eq(tinjauan.diabaikan, true));
  }

  const where = kondisi.length > 0 ? and(...kondisi) : undefined;

  const semuaBaris = await db
    .select({
      id: tinjauan.id,
      idJaminan: tinjauan.idJaminan,
      namaKorban: glMirror.namaKorban,
      catatan: tinjauan.catatan,
      perluTindakLanjut: tinjauan.perluTindakLanjut,
      diabaikan: tinjauan.diabaikan,
      alasanAbaikan: tinjauan.alasanAbaikan,
      ditinjauPada: tinjauan.ditinjauPada,
      namaPengguna: pengguna.username,
    })
    .from(tinjauan)
    .innerJoin(pengguna, eq(tinjauan.userId, pengguna.id))
    .innerJoin(glMirror, eq(tinjauan.idJaminan, glMirror.idJaminan))
    .where(where)
    .orderBy(desc(tinjauan.ditinjauPada));

  const total = semuaBaris.length;
  const ukuran = filter.ukuran ?? UKURAN_DEFAULT;
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;
  const baris = semuaBaris
    .slice(mulai, mulai + ukuran)
    .map((b) => ({ ...b, tokenUrl: enkripsiIdJaminan(b.idJaminan) }));

  return { baris, total, halaman, ukuran, totalHalaman };
}
