import { and, count, countDistinct, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";

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

export interface DetailRumahSakit {
  namaRumahSakit: string;
  /** Rincian per Tahapan GL -- HANYA GL Active + Unpaid, diurutkan dari yang paling banyak.
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
}

// Detail satu rumah sakit untuk halaman /sebaran/[nama] -- dipakai saat
// petugas klik nama rumah sakit dari Distribusi per Rumah Sakit atau tabel
// Detail Rekapitulasi. Cakupannya SENGAJA sama seperti ambilSebaranRumahSakit
// (tipe klaim GL, belum di-soft-delete) supaya angka "Total GL Aktif" di sini
// selalu konsisten dengan yang tampil di daftar sebelumnya.
export async function ambilDetailRumahSakit(namaRumahSakit: string): Promise<DetailRumahSakit> {
  const kondisiDasar = and(
    isNull(glMirror.dihapusPada),
    eq(glMirror.tipeKlaim, "GL"),
    eq(glMirror.namaRumahSakit, namaRumahSakit),
  );
  const nominalDisetujui = sql<string>`coalesce(sum(${glMirror.nilaiDisetujui}), 0)`;

  const [barisTahapan, [ringkasanPaid], [ringkasanCancel], [ringkasanTotal]] = await Promise.all([
    db
      .select({ tahapan: glMirror.tahapan, jumlah: count(), nominal: nominalDisetujui })
      .from(glMirror)
      .where(
        and(kondisiDasar, eq(glMirror.glStatus, "Active"), eq(glMirror.statusPembayaran, "Unpaid")),
      )
      .groupBy(glMirror.tahapan)
      .orderBy(desc(count())),
    db
      .select({ jumlah: count(), nominal: nominalDisetujui })
      .from(glMirror)
      .where(
        and(kondisiDasar, eq(glMirror.glStatus, "Active"), eq(glMirror.statusPembayaran, "Paid")),
      ),
    db
      .select({ jumlah: count() })
      .from(glMirror)
      .where(and(kondisiDasar, eq(glMirror.glStatus, "Cancel"))),
    db.select({ jumlah: count() }).from(glMirror).where(kondisiDasar),
  ]);

  const tahapan = barisTahapan.map((b) => ({
    tahapan: b.tahapan,
    jumlah: b.jumlah,
    nominal: Number(b.nominal),
  }));
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
  };
}
