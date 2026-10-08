import { and, count, countDistinct, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

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
  /** Jumlah Nilai Disetujui, bukan Nilai Diajukan -- sesuai arahan pemilik proyek */
  nominal: number;
}

export interface RingkasanJumlahNominal {
  jumlah: number;
  nominal: number;
}

/** ISO "YYYY-MM-DD". Menyaring berdasarkan Tgl GL -- sama seperti filter
 * Rentang Tgl GL di halaman Monitoring (lib/gl/queries.ts). */
export interface FilterDetailRumahSakit {
  dari?: string;
  sampai?: string;
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
  const nominalDisetujui = sql<string>`coalesce(sum(${glMirror.nilaiDisetujui}), 0)`;
  const jumlahPembayaran = sql<string>`coalesce(sum(${glMirror.jumlahPembayaran}), 0)`;

  const [barisTahapan, [ringkasanPaid], [ringkasanCancel], [ringkasanTotal]] = await Promise.all([
    db
      .select({ tahapan: glMirror.tahapan, jumlah: count(), nominal: nominalDisetujui })
      .from(glMirror)
      .where(
        and(
          kondisiRentang,
          eq(glMirror.glStatus, "Active"),
          eq(glMirror.statusPembayaran, "Unpaid"),
        ),
      )
      .groupBy(glMirror.tahapan)
      .orderBy(desc(count())),
    db
      .select({ jumlah: count(), nominal: nominalDisetujui, pembayaran: jumlahPembayaran })
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
      nominal: Number(b.nominal),
    })),
  );
  const totalUnpaid = tahapan.reduce(
    (acc, b) => ({ jumlah: acc.jumlah + b.jumlah, nominal: acc.nominal + b.nominal }),
    { jumlah: 0, nominal: 0 },
  );
  const totalPaid = { jumlah: ringkasanPaid.jumlah, nominal: Number(ringkasanPaid.nominal) };
  const totalAktif = {
    jumlah: totalUnpaid.jumlah + totalPaid.jumlah,
    nominal: totalUnpaid.nominal + totalPaid.nominal,
  };

  return {
    namaRumahSakit,
    tahapan,
    totalUnpaid,
    totalPaid,
    totalAktif,
    totalCancel: ringkasanCancel.jumlah,
    totalGL: ringkasanTotal.jumlah,
    nilaiPembayaran: Number(ringkasanPaid.pembayaran),
  };
}
