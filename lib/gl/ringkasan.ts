import { and, count, desc, eq, gte, inArray, isNull, lte, max, notInArray, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror, laporanSurveiTkp, statusProsesPusat } from "../db/schema";
import { TAHAPAN_DIPANTAU } from "./aturan-peringatan";
import { ambilPapanPeringatan } from "./peringatan";
import { ambilRumahSakitUntukPic } from "./pic";
import { TAHAP_JRCARE_DONE, TAHAP_KELUAR_PERINGATAN, TAHAP_PEMICU_PAID } from "./tahap-proses";

// Baris yang di-soft-delete lewat "Hapus Semua Data" tidak pernah ikut
const KONDISI_AKTIF = isNull(glMirror.dihapusPada);

export interface KartuRingkasan {
  totalGL: number;
  /** GL Status = Active, dari totalGL. Sisanya (totalGL - totalAktif) dirinci di rincianNonAktif */
  totalAktif: number;
  /** Breakdown GL non-Active (biasanya Cancel) per nilai GL Status -- tidak
   * di-hardcode ke "Cancel" saja karena nilai GL Status bisa bertambah
   * (CLAUDE.md aturan keras #3), jadi dibangun dinamis dari data */
  rincianNonAktif: { glStatus: string; jumlah: number }[];
  /** Dari totalAktif: tahapan di luar TAHAPAN_DIPANTAU ("Verifikasi User"/"Done") -- masih di alur awal RS, belum jadi wewenang PIC Pengajuan */
  totalMasihTahapAwal: number;
  /** Dari totalAktif: tahapan IN TAHAPAN_DIPANTAU -- basis Kartu Kinerja Pengajuan ke Pusat */
  totalTahapDipantau: number;
  totalUnpaid: number;
  totalPeringatan: number;
  /** Rata-rata umur (hari) GL bertipe GL, Active, dan Unpaid — seberapa lama tagihan yang belum dibayar sudah mengendap */
  rataRataUmurTagihan: number;
  diimporTerakhir: Date | null;
}

export async function ambilKartuRingkasan(): Promise<KartuRingkasan> {
  const [
    rincianStatus,
    [{ totalMasihTahapAwal }],
    [{ totalUnpaid, rataRataUmurTagihan }],
    [{ diimporTerakhir }],
    peringatan,
  ] = await Promise.all([
    db
      .select({ glStatus: glMirror.glStatus, jumlah: count() })
      .from(glMirror)
      .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL")))
      .groupBy(glMirror.glStatus),
    db
      .select({ totalMasihTahapAwal: count() })
      .from(glMirror)
      .where(
        and(
          KONDISI_AKTIF,
          eq(glMirror.tipeKlaim, "GL"),
          eq(glMirror.glStatus, "Active"),
          notInArray(glMirror.tahapan, [...TAHAPAN_DIPANTAU]),
        ),
      ),
    db
      .select({
        totalUnpaid: count(),
        rataRataUmurTagihan: sql<number>`coalesce(avg(current_date - ${glMirror.tglGl})::float8, 0)`,
      })
      .from(glMirror)
      .where(
        and(
          KONDISI_AKTIF,
          eq(glMirror.tipeKlaim, "GL"),
          eq(glMirror.glStatus, "Active"),
          eq(glMirror.statusPembayaran, "Unpaid"),
        ),
      ),
    db.select({ diimporTerakhir: max(glMirror.diimporPada) }).from(glMirror),
    ambilPapanPeringatan(),
  ]);

  const totalGL = rincianStatus.reduce((jumlah, r) => jumlah + r.jumlah, 0);
  const totalAktif = rincianStatus.find((r) => r.glStatus === "Active")?.jumlah ?? 0;
  const rincianNonAktif = rincianStatus.filter((r) => r.glStatus !== "Active");

  return {
    totalGL,
    totalAktif,
    rincianNonAktif,
    totalMasihTahapAwal,
    totalTahapDipantau: totalAktif - totalMasihTahapAwal,
    totalUnpaid,
    totalPeringatan: peringatan.total,
    rataRataUmurTagihan: Number(rataRataUmurTagihan),
    diimporTerakhir: diimporTerakhir ?? null,
  };
}

export interface SebaranTahapan {
  tahapan: string;
  jumlah: number;
}

export async function ambilSebaranTahapan(): Promise<SebaranTahapan[]> {
  return db
    .select({ tahapan: glMirror.tahapan, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.tahapan)
    .orderBy(desc(count()));
}

export interface SebaranStatusPembayaran {
  statusPembayaran: string;
  jumlah: number;
}

export async function ambilSebaranStatusPembayaran(): Promise<SebaranStatusPembayaran[]> {
  return db
    .select({ statusPembayaran: glMirror.statusPembayaran, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")))
    .groupBy(glMirror.statusPembayaran);
}

export interface TrenBulanan {
  bulan: string;
  jumlah: number;
}

export async function ambilTrenBulanan(): Promise<TrenBulanan[]> {
  const kolomBulan = sql<string>`to_char(${glMirror.tglGl}, 'YYYY-MM')`;

  return db
    .select({ bulan: kolomBulan, jumlah: count() })
    .from(glMirror)
    .where(and(KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL")))
    .groupBy(kolomBulan)
    .orderBy(kolomBulan);
}

export interface KinerjaPengajuanPusat {
  totalAktif: number;
  dokumenBelumLengkap: number;
  siapDiajukanKePusat: number;
  sudahDiajukanKePusat: number;
  done: number;
}

export interface FilterKinerjaPengajuanPusat {
  picPengajuan?: string;
  /** ISO "YYYY-MM-DD", batas bawah Tgl GL */
  dari?: string;
  /** ISO "YYYY-MM-DD", batas atas Tgl GL */
  sampai?: string;
}

// Kartu "Kinerja Pengajuan ke Pusat" (CLAUDE.md bagian 7) -- dinamis
// mengikuti filter PIC Pengajuan/Rentang Tgl GL yang sama dengan tabel
// Daftar GL di dashboard, bukan filter terpisah. Empat kategori SALING
// EKSKLUSIF, dievaluasi per baris (bukan 4 query COUNT terpisah) supaya
// urutan prioritasnya eksplisit dan tidak ada GL yang dihitung dobel:
//   1. done duluan (paling final)
//   2. sudahDiajukanKePusat (sudah di Proses Pusat, belum lunas)
//   3. dokumenBelumLengkap / siapDiajukanKePusat (belum pernah diajukan
//      sama sekali -- dibedakan cuma dari kelengkapan dokumen)
//
// "tahapan Done tapi status_pembayaran Unpaid" TERNYATA bisa terjadi pada
// GL yang gl_status-nya Active (bukan cuma Cancel seperti dugaan awal --
// sudah dicek ke data nyata, lihat CLAUDE.md). Makanya syarat #3 pakai
// TAHAPAN_DIPANTAU ("Verifikasi User" ATAU "Done"), bukan cuma "Verifikasi
// User" saja, supaya GL semacam itu tetap kehitung di kartu #1, bukan
// hilang tanpa kategori.
export async function ambilKinerjaPengajuanPusat(
  filter: FilterKinerjaPengajuanPusat = {},
): Promise<KinerjaPengajuanPusat> {
  const kosong: KinerjaPengajuanPusat = {
    totalAktif: 0,
    dokumenBelumLengkap: 0,
    siapDiajukanKePusat: 0,
    sudahDiajukanKePusat: 0,
    done: 0,
  };

  const kondisi = [KONDISI_AKTIF, eq(glMirror.tipeKlaim, "GL"), eq(glMirror.glStatus, "Active")];
  if (filter.dari) kondisi.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisi.push(lte(glMirror.tglGl, filter.sampai));

  if (filter.picPengajuan) {
    const rsList = await ambilRumahSakitUntukPic({ picPengajuan: filter.picPengajuan });
    if (rsList.length === 0) return kosong;
    kondisi.push(inArray(glMirror.namaRumahSakit, rsList));
  }

  const [baris, semuaTahapProses] = await Promise.all([
    db
      .select({
        idJaminan: glMirror.idJaminan,
        tahapan: glMirror.tahapan,
        statusPembayaran: glMirror.statusPembayaran,
        kskkNamaBerkas: glMirror.kskkNamaBerkas,
        punyaLaporanTkp: sql<boolean>`EXISTS (
          SELECT 1 FROM ${laporanSurveiTkp} AS ltk
          WHERE ltk.id_jaminan = ${glMirror}.id_jaminan
        )`,
      })
      .from(glMirror)
      .where(and(...kondisi)),
    db
      .select({ idJaminan: statusProsesPusat.idJaminan, tahap: statusProsesPusat.tahap })
      .from(statusProsesPusat)
      .orderBy(desc(statusProsesPusat.dicatatPada)),
  ]);

  const tahapTerkiniPerId = new Map<string, string>();
  for (const t of semuaTahapProses) {
    if (!tahapTerkiniPerId.has(t.idJaminan)) tahapTerkiniPerId.set(t.idJaminan, t.tahap);
  }

  const hasil = { ...kosong, totalAktif: baris.length };
  for (const b of baris) {
    const tahapTerkini = tahapTerkiniPerId.get(b.idJaminan) ?? null;
    const sudahPernahDiajukan =
      tahapTerkini === TAHAP_KELUAR_PERINGATAN || tahapTerkini === TAHAP_PEMICU_PAID;

    if (b.tahapan === TAHAP_JRCARE_DONE && b.statusPembayaran === "Paid") {
      hasil.done++;
    } else if (tahapTerkini === TAHAP_KELUAR_PERINGATAN && b.statusPembayaran !== "Paid") {
      hasil.sudahDiajukanKePusat++;
    } else if (TAHAPAN_DIPANTAU.has(b.tahapan) && b.statusPembayaran === "Unpaid" && !sudahPernahDiajukan) {
      const dokumenLengkap = !!b.kskkNamaBerkas && b.punyaLaporanTkp;
      if (dokumenLengkap) hasil.siapDiajukanKePusat++;
      else hasil.dokumenBelumLengkap++;
    }
  }

  return hasil;
}
