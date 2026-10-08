import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { KELOMPOK_TAHAPAN_GL, type KunciKelompokTahapan } from "./kelompok-tahapan";

export { KELOMPOK_TAHAPAN_GL, isKunciKelompokTahapan, type KunciKelompokTahapan } from "./kelompok-tahapan";

// Urutan baku tabel "Tahapan GL" di halaman /sebaran/[nama] -- arahan pemilik
// proyek: dipaksa mengikuti alur proses, BUKAN lagi diurutkan dari jumlah GL
// terbanyak. Tahapan lain yang muncul di data tapi tidak ada di daftar ini
// (mis. data dummy/lama) tetap ditampilkan, diselipkan di akhir dan di antara
// sesamanya diurutkan dari jumlah terbanyak supaya tidak acak.
const URUTAN_TAHAPAN_GL = [
  "Penerimaan GL",
  "Surat Keterangan Kesehatan",
  "Surat Kuasa",
  "Verifikasi User",
];

function urutkanTahapan<T extends { tahapan: string; jumlah: number }>(baris: T[]): T[] {
  return [...baris].sort((a, b) => {
    const posA = URUTAN_TAHAPAN_GL.indexOf(a.tahapan);
    const posB = URUTAN_TAHAPAN_GL.indexOf(b.tahapan);
    const kunciA = posA === -1 ? URUTAN_TAHAPAN_GL.length : posA;
    const kunciB = posB === -1 ? URUTAN_TAHAPAN_GL.length : posB;
    if (kunciA !== kunciB) return kunciA - kunciB;
    return b.jumlah - a.jumlah;
  });
}

// Tahap 2 : "Halaman sebaran ... rumah sakit". Dihitung dari GL aktif saja (tipe klaim GL, status Active, belum di-soft-delete)
const KONDISI_GL_AKTIF = and(
  isNull(glMirror.dihapusPada),
  eq(glMirror.tipeKlaim, "GL"),
  eq(glMirror.glStatus, "Active"),
);

export interface SebaranRumahSakit {
  namaRumahSakit: string;
  loket: string;
  jumlah: number;
}

export const LABEL_RS_KOSONG = "(Tidak diisi)";

// Dikelompokkan per (namaRumahSakit, loket) — pada data yang ada tiap rumah sakit hanya muncul di satu loket, tapi kalau suatu saat ada yang tercatat
// di lebih dari satu loket, baris itu tetap dipisah apa adanya alih-alih disembunyikan.
export async function ambilSebaranRumahSakit(): Promise<SebaranRumahSakit[]> {
  const baris = await db
    .select({ namaRumahSakit: glMirror.namaRumahSakit, loket: glMirror.loket, jumlah: count() })
    .from(glMirror)
    .where(KONDISI_GL_AKTIF)
    .groupBy(glMirror.namaRumahSakit, glMirror.loket)
    .orderBy(desc(count()));

  return baris.map((b) => ({
    namaRumahSakit: b.namaRumahSakit ?? LABEL_RS_KOSONG,
    loket: b.loket,
    jumlah: b.jumlah,
  }));
}

// Jumlah nama rumah sakit unik dari GL aktif — baris dengan rumah sakit
export async function ambilTotalRumahSakitMitra(): Promise<number> {
  const [{ nilai }] = await db
    .select({ nilai: countDistinct(glMirror.namaRumahSakit) })
    .from(glMirror)
    .where(KONDISI_GL_AKTIF);
  return nilai;
}

export async function ambilTotalGLAktif(): Promise<number> {
  const [{ nilai }] = await db.select({ nilai: count() }).from(glMirror).where(KONDISI_GL_AKTIF);
  return nilai;
}

export interface TahapanRumahSakit {
  tahapan: string;
  jumlah: number;
  /** Jumlah Nilai DISETUJUI (nilai_disetujui) */
  nominalDisetujui: number;
  /** Jumlah Nilai DIBAYAR (jumlah_pembayaran) */
  nominalDibayar: number;
}

export interface RingkasanJumlahNominal {
  jumlah: number;
  /** Jumlah Nilai DISETUJUI (nilai_disetujui) */
  nominalDisetujui: number;
  /** Jumlah Nilai DIBAYAR (jumlah_pembayaran) */
  nominalDibayar: number;
}

/** ISO "YYYY-MM-DD". Menyaring berdasarkan Tgl GL -- sama seperti filter
 * Rentang Tgl GL di halaman Monitoring (lib/gl/queries.ts). */
export interface FilterDetailRumahSakit {
  dari?: string;
  sampai?: string;
  /** Kunci KELOMPOK_TAHAPAN_GL. Kalau diisi, baris per-Tahapan (dan Total
   * Unpaid turunannya) HANYA mencakup tahapan dalam kelompok itu. */
  kelompok?: KunciKelompokTahapan;
}

export interface BarisRincianGL {
  namaKorban: string;
  nomorSuratJaminan: string | null;
  tglGl: string;
  tahapan: string;
  statusPembayaran: string;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  jumlahPembayaran: number;
}

// Rincian per-record GL (bukan agregat per tahapan) -- HANYA dipakai di
// Ekspor Excel (/api/ekspor-sebaran-rumah-sakit), BUKAN di halaman web, atas
// permintaan pemilik proyek. Cakupan SAMA seperti tabel "Tahapan GL": Active
// + Unpaid, ikut filter Rentang Tgl GL dan Kelompok Tahapan yang sedang
// aktif. Diurutkan sesuai URUTAN_TAHAPAN_GL lalu Tgl GL (lama ke baru).
export async function ambilRincianGLRumahSakit(
  namaRumahSakit: string,
  filter: FilterDetailRumahSakit = {},
): Promise<BarisRincianGL[]> {
  const kondisiDasar = and(
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.namaRumahSakit, namaRumahSakit),
  );
  const kondisiRentang = and(
    kondisiDasar,
    filter.dari ? gte(glMirror.tglGl, filter.dari) : undefined,
    filter.sampai ? lte(glMirror.tglGl, filter.sampai) : undefined,
  );
  const kondisiKelompok = filter.kelompok
    ? inArray(glMirror.tahapan, [...KELOMPOK_TAHAPAN_GL[filter.kelompok].tahapan])
    : undefined;

  const baris = await db
    .select({
      namaKorban: glMirror.namaKorban,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      tglGl: glMirror.tglGl,
      tahapan: glMirror.tahapan,
      statusPembayaran: glMirror.statusPembayaran,
      nilaiDiajukan: glMirror.nilaiDiajukan,
      nilaiDisetujui: glMirror.nilaiDisetujui,
      jumlahPembayaran: glMirror.jumlahPembayaran,
    })
    .from(glMirror)
    .where(
      and(
        kondisiRentang,
        eq(glMirror.glStatus, "Active"),
        eq(glMirror.statusPembayaran, "Unpaid"),
        kondisiKelompok,
      ),
    )
    .orderBy(asc(glMirror.tglGl));

  return [...baris].sort((a, b) => {
    const posA = URUTAN_TAHAPAN_GL.indexOf(a.tahapan);
    const posB = URUTAN_TAHAPAN_GL.indexOf(b.tahapan);
    const kunciA = posA === -1 ? URUTAN_TAHAPAN_GL.length : posA;
    const kunciB = posB === -1 ? URUTAN_TAHAPAN_GL.length : posB;
    if (kunciA !== kunciB) return kunciA - kunciB;
    return a.tglGl.localeCompare(b.tglGl);
  });
}

export interface DetailRumahSakit {
  namaRumahSakit: string;
  /** Rincian per Tahapan GL -- HANYA GL Active + Unpaid, diurutkan fixed
   * sesuai URUTAN_TAHAPAN_GL (bukan lagi dari jumlah terbanyak).
   * GL yang sudah Paid tidak dipecah per tahapan (lihat totalPaid) karena
   * urusannya sudah selesai, tidak lagi relevan sedang "macet" di tahap mana. */
  tahapan: TahapanRumahSakit[];
  totalUnpaid: RingkasanJumlahNominal;
  totalPaid: RingkasanJumlahNominal;
  /** totalUnpaid + totalPaid -- GL Active, tipe klaim GL, untuk rumah sakit ini */
  totalAktif: RingkasanJumlahNominal;
  /** GL berstatus Cancel -- dihitung terpisah, TIDAK diasumsikan "totalGL - totalAktif"
   * supaya tetap benar kalau kelak gl_status punya nilai lain selain Active/Cancel */
  totalCancel: number;
  /** Seluruh baris GL untuk rumah sakit ini, tipe klaim GL, apa pun gl_status-nya */
  totalGL: number;
  /** Jumlah Pembayaran (GL Paid) dalam rentang filter -- 0 kalau belum ada yang dibayar */
  nilaiPembayaran: number;
}

// Detail satu rumah sakit untuk halaman /sebaran/[nama] -- dipakai saat
// petugas klik nama rumah sakit dari Distribusi per Rumah Sakit atau tabel
// Detail Rekapitulasi. Cakupannya SENGAJA sama seperti ambilSebaranRumahSakit
// (tipe klaim GL, belum di-soft-delete) supaya angka "Total GL Aktif" di sini
// selalu konsisten dengan yang tampil di daftar sebelumnya.
export async function ambilDetailRumahSakit(
  namaRumahSakit: string,
  filter: FilterDetailRumahSakit = {},
): Promise<DetailRumahSakit> {
  const kondisiDasar = and(
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.namaRumahSakit, namaRumahSakit),
  );
  // Rentang Tgl GL -- HANYA mempengaruhi angka di tabel (rincian per tahapan,
  // Total Unpaid/Paid/Aktif, Nilai Pembayaran), BUKAN kartu "Total GL" dan
  // "GL Berstatus Cancel" di atasnya yang sengaja tetap merekap keseluruhan.
  const kondisiRentang = and(
    kondisiDasar,
    filter.dari ? gte(glMirror.tglGl, filter.dari) : undefined,
    filter.sampai ? lte(glMirror.tglGl, filter.sampai) : undefined,
  );
  // Filter kelompok tahapan ("Belum Di Klaim" / "Klaim") HANYA diterapkan ke
  // baris per-Tahapan (query barisTahapan di bawah) -- bucket Paid/Cancel/GL
  // tidak dipecah per tahapan sehingga tidak relevan disaring kelompok ini.
  const kondisiKelompok = filter.kelompok
    ? inArray(glMirror.tahapan, [...KELOMPOK_TAHAPAN_GL[filter.kelompok].tahapan])
    : undefined;
  // Nominal di tabel ini (per-tahapan maupun 3 baris total) menampilkan DUA
  // nilai sekaligus: Nilai Disetujui (nilai_disetujui) dan Nilai Dibayar
  // (jumlah_pembayaran) -- sesuai arahan pemilik proyek. Baris per-Tahapan
  // HANYA mencakup GL Unpaid, jadi Nilai Dibayar wajar Rp 0 kalau belum ada
  // pembayaran sebagian.
  const nominalDisetujuiSql = sql<string>`coalesce(sum(${glMirror.nilaiDisetujui}), 0)`;
  const nominalDibayarSql = sql<string>`coalesce(sum(${glMirror.jumlahPembayaran}), 0)`;

  const [barisTahapan, [ringkasanPaid], [ringkasanCancel], [ringkasanTotal]] = await Promise.all([
    db
      .select({
        tahapan: glMirror.tahapan,
        jumlah: count(),
        nominalDisetujui: nominalDisetujuiSql,
        nominalDibayar: nominalDibayarSql,
      })
      .from(glMirror)
      .where(
        and(
          kondisiRentang,
          eq(glMirror.glStatus, "Active"),
          eq(glMirror.statusPembayaran, "Unpaid"),
          kondisiKelompok,
        ),
      )
      .groupBy(glMirror.tahapan)
      .orderBy(desc(count())),
    db
      .select({
        jumlah: count(),
        nominalDisetujui: nominalDisetujuiSql,
        nominalDibayar: nominalDibayarSql,
      })
      .from(glMirror)
      .where(
        and(
          kondisiRentang,
          eq(glMirror.glStatus, "Active"),
          eq(glMirror.statusPembayaran, "Paid"),
        ),
      ),
    db
      .select({ jumlah: count() })
      .from(glMirror)
      .where(and(kondisiDasar, eq(glMirror.glStatus, "Cancel"))),
    db.select({ jumlah: count() }).from(glMirror).where(kondisiDasar),
  ]);

  const tahapan = urutkanTahapan(
    barisTahapan.map((b) => ({
      tahapan: b.tahapan,
      jumlah: b.jumlah,
      nominalDisetujui: Number(b.nominalDisetujui),
      nominalDibayar: Number(b.nominalDibayar),
    })),
  );
  const totalUnpaid = tahapan.reduce(
    (acc, b) => ({
      jumlah: acc.jumlah + b.jumlah,
      nominalDisetujui: acc.nominalDisetujui + b.nominalDisetujui,
      nominalDibayar: acc.nominalDibayar + b.nominalDibayar,
    }),
    { jumlah: 0, nominalDisetujui: 0, nominalDibayar: 0 },
  );
  const totalPaid = {
    jumlah: ringkasanPaid.jumlah,
    nominalDisetujui: Number(ringkasanPaid.nominalDisetujui),
    nominalDibayar: Number(ringkasanPaid.nominalDibayar),
  };
  const totalAktif = {
    jumlah: totalUnpaid.jumlah + totalPaid.jumlah,
    nominalDisetujui: totalUnpaid.nominalDisetujui + totalPaid.nominalDisetujui,
    nominalDibayar: totalUnpaid.nominalDibayar + totalPaid.nominalDibayar,
  };

  return {
    namaRumahSakit,
    tahapan,
    totalUnpaid,
    totalPaid,
    totalAktif,
    totalCancel: ringkasanCancel.jumlah,
    totalGL: ringkasanTotal.jumlah,
    nilaiPembayaran: totalPaid.nominalDibayar,
  };
}
