import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { ambilPetaJumlahGLPerKorban, jumlahGLKorban } from "./duplikat-korban";
import { ambilNamaPicPengajuan, ambilNamaPicTaskForce, ambilPetaPicRumahSakit, ambilRumahSakitUntukPic, cariPic } from "./pic";
import { enkripsiIdJaminan } from "./token-url";
import { PILIHAN_UKURAN_HALAMAN } from "./ukuran-halaman";

const UKURAN_HALAMAN_DEFAULT = 25;

function sanitisasiUkuran(nilai: number | undefined): number {
  return nilai && (PILIHAN_UKURAN_HALAMAN as readonly number[]).includes(nilai)
    ? nilai
    : UKURAN_HALAMAN_DEFAULT;
}

export interface FilterDaftarGL {
  loket?: string;
  tahapan?: string;
  statusPembayaran?: string;
  glStatus?: string;
  picTaskForce?: string;
  picPengajuan?: string;
  dari?: string;
  sampai?: string;
  cari?: string;
  halaman?: number;
  ukuran?: number;
}

export interface BarisDaftarGL {
  idJaminan: string;
  /** Token terenkripsi untuk URL /gl/[token] -- lihat lib/gl/token-url.ts */
  tokenUrl: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  /** Dipetakan dari nama_rumah_sakit lewat lib/gl/pic.ts, null kalau belum diatur di Pengaturan */
  picTaskForce: string | null;
  picPengajuan: string | null;
  /** Jumlah baris GL aktif dengan Nama Korban persis sama (lib/gl/duplikat-korban.ts), termasuk baris ini sendiri */
  jumlahGLKorban: number;
  tglGl: string;
  tipeKlaim: string;
  tipeCidera: string;
  nomorSuratJaminan: string | null;
  glStatus: string;
  tahapan: string;
  statusVerifikasi: string | null;
  statusPembayaran: string;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
  tglKejadian: string | null;
  lokasi: string | null;
}

export interface HasilDaftarGL {
  baris: BarisDaftarGL[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
}

export async function ambilOpsiFilter() {
  const kondisiAktif = isNull(glMirror.dihapusPada);
  const [loket, tahapan, statusPembayaran, glStatus, picTaskForce, picPengajuan] = await Promise.all([
    db
      .selectDistinct({ nilai: glMirror.loket })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.loket)),
    db
      .selectDistinct({ nilai: glMirror.tahapan })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.tahapan)),
    db
      .selectDistinct({ nilai: glMirror.statusPembayaran })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.statusPembayaran)),
    db
      .selectDistinct({ nilai: glMirror.glStatus })
      .from(glMirror)
      .where(kondisiAktif)
      .orderBy(asc(glMirror.glStatus)),
    ambilNamaPicTaskForce(),
    ambilNamaPicPengajuan(),
  ]);

  return {
    loket: loket.map((r) => r.nilai),
    tahapan: tahapan.map((r) => r.nilai),
    statusPembayaran: statusPembayaran.map((r) => r.nilai),
    glStatus: glStatus.map((r) => r.nilai),
    picTaskForce,
    picPengajuan,
  };
}

export async function bangunKondisiDaftarGL(filter: FilterDaftarGL) {
  const kondisi = [isNull(glMirror.dihapusPada)];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.tahapan) kondisi.push(eq(glMirror.tahapan, filter.tahapan));
  if (filter.statusPembayaran) kondisi.push(eq(glMirror.statusPembayaran, filter.statusPembayaran));
  if (filter.glStatus) kondisi.push(eq(glMirror.glStatus, filter.glStatus));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola));
    if (kondisiCari) kondisi.push(kondisiCari);
  }
  if (filter.picTaskForce || filter.picPengajuan) {
    const rumahSakit = await ambilRumahSakitUntukPic({
      picTaskForce: filter.picTaskForce,
      picPengajuan: filter.picPengajuan,
    });
    // Array kosong berarti tidak ada rumah sakit yang cocok dengan PIC ini
    kondisi.push(rumahSakit.length > 0 ? inArray(glMirror.namaRumahSakit, rumahSakit) : sql`false`);
  }
  return and(...kondisi);
}

export async function ambilDaftarGL(filter: FilterDaftarGL): Promise<HasilDaftarGL> {
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const ukuran = sanitisasiUkuran(filter.ukuran);
  const kondisi = await bangunKondisiDaftarGL(filter);

  const [totalRows, petaPic, petaJumlahKorban] = await Promise.all([
    db.select({ nilai: count() }).from(glMirror).where(kondisi),
    ambilPetaPicRumahSakit(),
    ambilPetaJumlahGLPerKorban(),
  ]);
  const total = totalRows[0].nilai;

  const baris = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tglGl: glMirror.tglGl,
      tipeKlaim: glMirror.tipeKlaim,
      tipeCidera: glMirror.tipeCidera,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      statusVerifikasi: glMirror.statusVerifikasi,
      statusPembayaran: glMirror.statusPembayaran,
      nilaiDiajukan: glMirror.nilaiDiajukan,
      nilaiDisetujui: glMirror.nilaiDisetujui,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      tglPembayaran: glMirror.tglPembayaran,
      tglKejadian: glMirror.tglKejadian,
      lokasi: glMirror.lokasi,
    })
    .from(glMirror)
    .where(kondisi)
    .orderBy(desc(glMirror.tglGl), desc(glMirror.id))
    .limit(ukuran)
    .offset((halaman - 1) * ukuran);

  return {
    baris: baris.map((b) => ({
      ...b,
      tokenUrl: enkripsiIdJaminan(b.idJaminan),
      ...cariPic(petaPic, b.namaRumahSakit),
      jumlahGLKorban: jumlahGLKorban(petaJumlahKorban, b.namaKorban),
    })),
    total,
    halaman,
    ukuran,
    totalHalaman: Math.max(1, Math.ceil(total / ukuran)),
  };
}
