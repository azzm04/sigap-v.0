import { and, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { glMirror, tinjauan } from "../db/schema";
import { hitungUmurHari } from "../format";
import { ambilAmbangHari } from "../pengaturan";
import { apakahMasukPeringatanTaskForce } from "./aturan-peringatan-task-force";
import { ambilPetaPicRumahSakit, cariPic } from "./pic";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisPeringatanTaskForce {
  idJaminan: string;
  tokenUrl: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  picTaskForce: string | null;
  picPengajuan: string | null;
  tahapan: string;
  /** ISO YYYY-MM-DD, null kalau PIC Task Force belum sempat isi */
  tanggalMasuk: string | null;
  tanggalPulangPasien: string | null;
  lokasi: string | null;
  umurSejakMasuk: number;
  /**
   * Tanggal mana yang sebenarnya dipakai untuk umurSejakMasuk -- rantai
   * fallback Tanggal Masuk -> Tgl Laka (DASI) -> Tgl GL, supaya GL tetap
   * kelihatan di peringatan ini walau PIC belum sempat isi Tanggal Masuk dicampur begitu saja.
   */
  sumberUmurTaskForce: "tanggalMasuk" | "tglKejadian" | "tglGl";
  /** true kalau sudah pernah ada catatan Tinjauan Petugas untuk GL ini (apa pun isinya) */
  sudahDitinjau: boolean;
}

export interface FilterPeringatanTaskForce {
  halaman?: number;
  ukuran?: number;
  /** Dicocokkan ke Nama Korban atau Nomor ID Jaminan */
  cari?: string;
  loket?: string;
  picTaskForce?: string;
  /** "sudah" = sudah ada catatan Tinjauan Petugas, "belum" = belum pernah ditinjau sama sekali */
  statusTinjauan?: "sudah" | "belum";
  dari?: string;
  sampai?: string;
}

export interface HasilPeringatanTaskForce {
  baris: BarisPeringatanTaskForce[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
  ambangHari: number;
}

const UKURAN_HALAMAN_DEFAULT = 20;

// Peringatan PIC Task Force ("Peringatan 1")
// Tanggal Masuk TIDAK LAGI wajib terisi (dulu pra-syarat SQL) -- rantai
// fallback Tanggal Masuk -> Tgl Laka (DASI) -> Tgl GL dipakai supaya GL
// tetap kelihatan di peringatan ini walau PIC Task Force belum sempat kunjungan sama sekali, bukan diam-diam hilang dari pemantauan. Tgl GL selalu terisi (NOT NULL di skema) jadi rantai ini pasti berujung.
export async function ambilPeringatanTaskForce(
  filter: FilterPeringatanTaskForce = {},
): Promise<HasilPeringatanTaskForce> {
  const [ambangHari, petaPic] = await Promise.all([ambilAmbangHari(), ambilPetaPicRumahSakit()]);

  const kondisi = [
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.glStatus, "Active"),
  ];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola));
    if (kondisiCari) kondisi.push(kondisiCari);
  }

  const [kandidat, tinjauanBaris] = await Promise.all([
    db
      .select({
        idJaminan: glMirror.idJaminan,
        namaKorban: glMirror.namaKorban,
        loket: glMirror.loket,
        namaRumahSakit: glMirror.namaRumahSakit,
        tipeKlaim: glMirror.tipeKlaim,
        glStatus: glMirror.glStatus,
        tahapan: glMirror.tahapan,
        tanggalMasuk: glMirror.tanggalMasuk,
        tanggalPulangPasien: glMirror.tanggalPulangPasien,
        lokasi: glMirror.lokasi,
        tglKejadian: glMirror.tglKejadian,
        tglGl: glMirror.tglGl,
      })
      .from(glMirror)
      .where(and(...kondisi)),
    db.select({ idJaminan: tinjauan.idJaminan }).from(tinjauan),
  ]);
  const idSudahDitinjau = new Set(tinjauanBaris.map((b) => b.idJaminan));

  const semuaBaris = kandidat
    .map((b) => {
      const sumberUmurTaskForce: BarisPeringatanTaskForce["sumberUmurTaskForce"] = b.tanggalMasuk
        ? "tanggalMasuk"
        : b.tglKejadian
          ? "tglKejadian"
          : "tglGl";
      const tanggalAcuan = b.tanggalMasuk ?? b.tglKejadian ?? b.tglGl;
      return {
        ...b,
        tokenUrl: enkripsiIdJaminan(b.idJaminan),
        umurSejakMasuk: hitungUmurHari(tanggalAcuan),
        sumberUmurTaskForce,
        sudahDitinjau: idSudahDitinjau.has(b.idJaminan),
        ...cariPic(petaPic, b.namaRumahSakit),
      };
    })
    .filter((b) => apakahMasukPeringatanTaskForce(b, ambangHari))
    .filter((b) => !filter.picTaskForce || b.picTaskForce === filter.picTaskForce)
    .filter((b) => {
      if (filter.statusTinjauan === "sudah") return b.sudahDitinjau;
      if (filter.statusTinjauan === "belum") return !b.sudahDitinjau;
      return true;
    })
    .sort((a, b) => b.umurSejakMasuk - a.umurSejakMasuk);

  const total = semuaBaris.length;
  const ukuran = filter.ukuran ?? UKURAN_HALAMAN_DEFAULT;
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;
  const baris = semuaBaris.slice(mulai, mulai + ukuran);

  return { baris, total, halaman, ukuran, totalHalaman, ambangHari };
}
