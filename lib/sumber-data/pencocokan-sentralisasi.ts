import type { BarisSentralisasi } from "./sumber-sentralisasi";

/**
 * Batas kewajaran selisih Tgl GL terhadap Tgl Pengajuan. Diukur dari berkas
 * nyata pada 487 baris yang namanya cuma punya satu GL (jadi tidak ambigu):
 * median 0 hari (360 dari 487 tepat di hari yang sama), 84% dalam 90 hari,
 * dan SELURUHNYA dalam 365 hari. Dipakai sebagai pagar terluar saja --
 * pemilihan sebenarnya tetap "yang paling dekat", bukan "yang masuk batas".
 */
export const TOLERANSI_HARI_PENGAJUAN = 365;

export interface KandidatGl {
  idJaminan: string;
  /** ISO YYYY-MM-DD */
  tglGl: string;
  nilaiDisetujui: number;
  jumlahPembayaran: number;
  statusPembayaran: string;
}

export type KeputusanPencocokan =
  | { jenis: "sudah_tercatat" }
  | { jenis: "tidak_cocok" }
  | { jenis: "perlu_tinjau_manual" }
  | { jenis: "tandai"; idJaminan: string };

function selisihHari(a: string, b: string): number {
  return Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / 86400000));
}

/**
 * Memilih SATU GL untuk satu baris pembayaran. Fungsi murni, tanpa
 * database, supaya aturannya bisa diuji langsung.
 *
 * Kenapa nama saja tidak cukup (ini bug yang diperbaiki di sini): satu
 * korban lazim punya beberapa GL. Versi lama mencocokkan lewat nama lalu
 * menandai SEMUA GL Unpaid milik nama itu -- pada berkas nyata perilaku itu
 * menandai 320 GL lunas, padahal yang benar cuma 3.
 *
 * Urutan keputusan:
 *
 * 1. Kalau ada GL yang sudah Paid dengan Jumlah Pembayaran SAMA PERSIS
 *    dengan Nominal Invoice, pembayaran ini sudah tercermin dari impor
 *    JRCare -- tidak perlu berbuat apa-apa. Langkah ini menutup bug paling
 *    berbahaya: dulu kandidat dibatasi ke GL Unpaid saja, sehingga GL yang
 *    benar (sudah Paid) tersembunyi dan pembayarannya nyasar ke GL lain
 *    milik orang yang sama.
 * 2. Kalau semua kandidat sudah Paid, anggap sudah tercatat juga.
 * 3. Sisanya dinilai dari kedekatan Tgl GL ke Tgl Pengajuan, lalu selisih
 *    Nominal Invoice terhadap Nilai Disetujui sebagai pembanding kedua.
 *    Nominal TIDAK dipakai sebagai kunci keras (arahan pemilik proyek):
 *    pada berkas nyata nominal kerap berbeda dari Nilai Disetujui, sering
 *    tepat 1 juta.
 * 4. Kalau dua kandidat teratas sama kuat di kedua ukuran, atau Tgl
 *    Pengajuan tidak terbaca padahal kandidatnya lebih dari satu, jangan
 *    ditebak -- serahkan ke petugas.
 */
export function cariGlPalingCocok(
  kandidat: KandidatGl[],
  baris: Pick<BarisSentralisasi, "tglPengajuan" | "nominalInvoice">,
): KeputusanPencocokan {
  if (kandidat.length === 0) return { jenis: "tidak_cocok" };

  const sudahLunasDenganNominalSama = kandidat.some(
    (g) =>
      g.statusPembayaran === "Paid" &&
      baris.nominalInvoice > 0 &&
      g.jumlahPembayaran === baris.nominalInvoice,
  );
  if (sudahLunasDenganNominalSama) return { jenis: "sudah_tercatat" };

  const belumLunas = kandidat.filter((g) => g.statusPembayaran !== "Paid");
  if (belumLunas.length === 0) return { jenis: "sudah_tercatat" };
  if (belumLunas.length === 1) return { jenis: "tandai", idJaminan: belumLunas[0].idJaminan };

  if (!baris.tglPengajuan) return { jenis: "perlu_tinjau_manual" };
  const tglPengajuan = baris.tglPengajuan;

  const dinilai = belumLunas
    .map((g) => ({
      g,
      hari: selisihHari(g.tglGl, tglPengajuan),
      rupiah: Math.abs(baris.nominalInvoice - g.nilaiDisetujui),
    }))
    .filter((x) => x.hari <= TOLERANSI_HARI_PENGAJUAN)
    .sort((a, b) => a.hari - b.hari || a.rupiah - b.rupiah);

  if (dinilai.length === 0) return { jenis: "perlu_tinjau_manual" };
  if (
    dinilai.length > 1 &&
    dinilai[0].hari === dinilai[1].hari &&
    dinilai[0].rupiah === dinilai[1].rupiah
  ) {
    return { jenis: "perlu_tinjau_manual" };
  }

  return { jenis: "tandai", idJaminan: dinilai[0].g.idJaminan };
}
