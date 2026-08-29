import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror, laporanSurveiTkp, statusProsesPusat, tinjauan } from "../db/schema";
import { hitungUmurHari } from "../format";
import { ambilAmbangHari } from "../pengaturan";
import { apakahMasukPeringatan } from "./aturan-peringatan";
import { ambilPetaJumlahGLPerKorban, jumlahGLKorban } from "./duplikat-korban";
import { ambilPetaPicRumahSakit, cariPic } from "./pic";
import { TAHAP_KELUAR_PERINGATAN } from "./tahap-proses";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisPeringatan {
  idJaminan: string;
  tokenUrl: string;
  namaKorban: string;
  loket: string;
  namaRumahSakit: string | null;
  picTaskForce: string | null;
  picPengajuan: string | null;
  jumlahGLKorban: number;
  tipeKlaim: string;
  tipeCidera: string;
  nomorSuratJaminan: string | null;
  tglGl: string;
  glStatus: string;
  tahapan: string;
  statusVerifikasi: string | null;
  statusPembayaran: string;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
  tglKejadian: string | null;
  lokasi: string | null;
  umurHari: number;
  umurPengajuan: number;
  pengajuanBerdasarkanTglGl: boolean;
  sudahDitinjau: boolean;
  tahapProses: string | null;
  /**
   * Cek kelengkapan dokumen sebelum diajukan PIC Pengajuan ke DASI-JR --
   * murni cek DB: ada/tidaknya baris laporan_survei_tkp untuk GL ini.
   * "Siap Diajukan ke Pusat" kalau sudah ada Laporan Survei TKP dan KSKK "Dokumen Belum Lengkap" kalau belum
   */
  statusDokumen: "Siap Diajukan ke Pusat" | "Dokumen Belum Lengkap";
}

const UKURAN_HALAMAN_PERINGATAN = 20;

export interface FilterPapanPeringatan {
  halaman?: number;
  ukuran?: number;
  cari?: string;
  loket?: string;
  dari?: string;
  sampai?: string;
  statusTinjauan?: "sudah" | "belum";
  tahapProses?: string;
  picPengajuan?: string;
  /** "lengkap" = Laporan Survei TKP + KSKK sudah ada dua-duanya, "belum_lengkap" = salah satu atau keduanya belum ada */
  statusDokumen?: "lengkap" | "belum_lengkap";
}

export interface HasilPeringatan {
  baris: BarisPeringatan[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
  ambangHari: number;
}

function bangunKondisiPeringatan(filter: FilterPapanPeringatan) {
  const kondisi = [
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.glStatus, "Active"),
    eq(glMirror.statusPembayaran, "Unpaid"),
  ];
  if (filter.loket) kondisi.push(eq(glMirror.loket, filter.loket));
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));
  if (filter.cari) {
    const pola = `%${filter.cari}%`;
    const kondisiCari = or(ilike(glMirror.namaKorban, pola), ilike(glMirror.idJaminan, pola));
    if (kondisiCari) kondisi.push(kondisiCari);
  }
  return and(...kondisi);
}

// Papan peringatan Tahap 1
// dengan syarat yang murah (tipe klaim, status GL, status pembayaran, dan filter petugas kalau ada) supaya tidak menarik ribuan baris Paid/Cancel
export async function ambilPapanPeringatan(
  filter: FilterPapanPeringatan = {},
): Promise<HasilPeringatan> {
  const [ambangHari, petaPic, petaJumlahKorban] = await Promise.all([
    ambilAmbangHari(),
    ambilPetaPicRumahSakit(),
    ambilPetaJumlahGLPerKorban(),
  ]);

  const kandidat = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      loket: glMirror.loket,
      namaRumahSakit: glMirror.namaRumahSakit,
      tipeKlaim: glMirror.tipeKlaim,
      tipeCidera: glMirror.tipeCidera,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      tglGl: glMirror.tglGl,
      glStatus: glMirror.glStatus,
      tahapan: glMirror.tahapan,
      statusVerifikasi: glMirror.statusVerifikasi,
      statusPembayaran: glMirror.statusPembayaran,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      tglPembayaran: glMirror.tglPembayaran,
      tglKejadian: glMirror.tglKejadian,
      lokasi: glMirror.lokasi,
      tanggalPulangPasien: glMirror.tanggalPulangPasien,
      kskkNamaBerkas: glMirror.kskkNamaBerkas,
      punyaLaporanTkp: sql<boolean>`EXISTS (
        SELECT 1 FROM ${laporanSurveiTkp} AS ltk
        WHERE ltk.id_jaminan = ${glMirror}.id_jaminan
      )`,
    })
    .from(glMirror)
    .where(bangunKondisiPeringatan(filter));

  const tinjauanBaris = await db
    .select({ idJaminan: tinjauan.idJaminan, diabaikan: tinjauan.diabaikan })
    .from(tinjauan);
  const idDiabaikan = new Set(tinjauanBaris.filter((b) => b.diabaikan).map((b) => b.idJaminan));
  const idSudahDitinjau = new Set(tinjauanBaris.map((b) => b.idJaminan));

  const semuaTahapProses = await db
    .select({ idJaminan: statusProsesPusat.idJaminan, tahap: statusProsesPusat.tahap })
    .from(statusProsesPusat)
    .orderBy(desc(statusProsesPusat.dicatatPada));
  const tahapTerkiniPerId = new Map<string, string>();
  for (const t of semuaTahapProses) {
    if (!tahapTerkiniPerId.has(t.idJaminan)) tahapTerkiniPerId.set(t.idJaminan, t.tahap);
  }

  const semuaBaris = kandidat
    .filter((b) => !idDiabaikan.has(b.idJaminan))
    .map((b) => ({
      ...b,
      tokenUrl: enkripsiIdJaminan(b.idJaminan),
      ...cariPic(petaPic, b.namaRumahSakit),
      jumlahGLKorban: jumlahGLKorban(petaJumlahKorban, b.namaKorban),
      umurHari: hitungUmurHari(b.tglGl),
      // Dasar umur Peringatan PIC Pengajuan: sejak Tanggal Pulang Pasien,fallback ke Tgl GL kalau belum diisi PIC Task Force (supaya GL tidak diam-diam hilang dari pemantauan gara-gara satu field)
      // ditampilkan sebagai badge di UI.
      umurPengajuan: hitungUmurHari(b.tanggalPulangPasien ?? b.tglGl),
      pengajuanBerdasarkanTglGl: !b.tanggalPulangPasien,
      sudahDitinjau: idSudahDitinjau.has(b.idJaminan),
      tahapProses: tahapTerkiniPerId.get(b.idJaminan) ?? null,
      // Dokumen lengkap = Laporan Survei TKP DAN KSKK dua-duanya ada, Pengajuan sebelum tahap "Berkas Diajukan Ke Pusat" dicatat).
      punyaKskk: !!b.kskkNamaBerkas,
      statusDokumen: (b.punyaLaporanTkp && b.kskkNamaBerkas
        ? "Siap Diajukan ke Pusat"
        : "Dokumen Belum Lengkap") as "Siap Diajukan ke Pusat" | "Dokumen Belum Lengkap",
    }))

    // Syarat umur Peringatan PIC Pengajuan sekarang dari Tanggal Pulang Pasien. Baris asli (b.umurHari) tidak ikut berubah, tetap Tgl GL untuk tampilan.
    .filter((b) => apakahMasukPeringatan({ ...b, umurHari: b.umurPengajuan }, ambangHari))
    // Sudah "Berkas Diajukan Ke Pusat" DAN dokumen (Laporan Survei TKP + KSKK) lengkap -> keluar dari peringatan ini, walau status_pembayaran masih Unpaid 
    // (arahan pemilik proyek: "sudah diajukan" beda dari "sudah dibayar", JANGAN pakai mekanisme Paid seperti TAHAP_PEMICU_PAID
    // -- Paid baru terjadi lewat impor mingguan ceri.jasaraharja, belum dibangun)
    .filter((b) => !(b.tahapProses === TAHAP_KELUAR_PERINGATAN && b.punyaLaporanTkp && b.punyaKskk))
    .filter((b) => {
      if (filter.statusTinjauan === "sudah") return b.sudahDitinjau;
      if (filter.statusTinjauan === "belum") return !b.sudahDitinjau;
      return true;
    })
    .filter((b) => !filter.tahapProses || b.tahapProses === filter.tahapProses)
    .filter((b) => !filter.picPengajuan || b.picPengajuan === filter.picPengajuan)
    .filter((b) => {
      if (filter.statusDokumen === "lengkap") return b.statusDokumen === "Siap Diajukan ke Pusat";
      if (filter.statusDokumen === "belum_lengkap") return b.statusDokumen === "Dokumen Belum Lengkap";
      return true;
    })
    // Prioritas belum jelas (akhiran "00"), jadi urutkan berdasarkan umur tertinggi sampai dikonfirmasi.
    .sort((a, b) => b.umurHari - a.umurHari)
    .map(
      ({
        idJaminan,
        tokenUrl,
        namaKorban,
        loket,
        namaRumahSakit,
        picTaskForce,
        picPengajuan,
        jumlahGLKorban,
        tipeKlaim,
        tipeCidera,
        nomorSuratJaminan,
        tglGl,
        glStatus,
        tahapan,
        statusVerifikasi,
        statusPembayaran,
        jumlahPembayaran,
        tglPembayaran,
        tglKejadian,
        lokasi,
        umurHari,
        umurPengajuan,
        pengajuanBerdasarkanTglGl,
        sudahDitinjau,
        tahapProses,
        statusDokumen,
      }) => ({
        idJaminan,
        tokenUrl,
        namaKorban,
        loket,
        namaRumahSakit,
        picTaskForce,
        picPengajuan,
        jumlahGLKorban,
        tipeKlaim,
        tipeCidera,
        nomorSuratJaminan,
        tglGl,
        glStatus,
        tahapan,
        statusVerifikasi,
        statusPembayaran,
        jumlahPembayaran,
        tglPembayaran,
        tglKejadian,
        lokasi,
        umurHari,
        umurPengajuan,
        pengajuanBerdasarkanTglGl,
        sudahDitinjau,
        tahapProses,
        statusDokumen,
      }),
    );

  const total = semuaBaris.length;
  const ukuran = filter.ukuran ?? UKURAN_HALAMAN_PERINGATAN;
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;
  const baris = semuaBaris.slice(mulai, mulai + ukuran);

  return { baris, total, halaman, ukuran, totalHalaman, ambangHari };
}
