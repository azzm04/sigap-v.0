import { hitungUmurHari } from "../format";

export interface BarisRiwayatUntukStagnasi {
  tahapan: string;
  direkamPada: Date;
}

export interface HasilStagnasi {
  hariDiTahapan: number;
  sejak: Date;
  /**
   * true kalau angka ini sebenarnya umur GL (fallback), bukan stagnasi
   * sungguhan -- dipakai saat riwayat snapshot belum menangkap perpindahan
   * tahapan (CLAUDE.md bagian 7, "Batasan yang harus dijelaskan di
   * antarmuka"). Pemanggil WAJIB menampilkan penanda visual saat true.
   */
  berdasarkanUmur: boolean;
}

/**
 * hari_di_tahapan = hari ini - direkam_pada snapshot terakhir yang
 * mengubah tahapan. Beda dari umur: umur dihitung sejak Tgl GL, stagnasi
 * dihitung sejak GL berada di tahapan SAAT INI.
 *
 * riwayatAsc: baris gl_snapshot untuk satu GL, terurut ASCENDING
 * berdasarkan direkam_pada (baris pertama = snapshot baseline).
 */
export function hitungStagnasi(
  riwayatAsc: BarisRiwayatUntukStagnasi[],
  tglGl: string,
): HasilStagnasi {
  let indeksTransisi = -1;
  for (let i = riwayatAsc.length - 1; i > 0; i--) {
    if (riwayatAsc[i].tahapan !== riwayatAsc[i - 1].tahapan) {
      indeksTransisi = i;
      break;
    }
  }

  if (indeksTransisi === -1) {
    const [tahun, bulan, hari] = tglGl.split("-").map(Number);
    return {
      hariDiTahapan: hitungUmurHari(tglGl),
      sejak: new Date(Date.UTC(tahun, bulan - 1, hari)),
      berdasarkanUmur: true,
    };
  }

  const sejak = riwayatAsc[indeksTransisi].direkamPada;
  const hariIni = new Date();
  const hariDiTahapan = Math.floor(
    (Date.UTC(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate()) -
      Date.UTC(sejak.getFullYear(), sejak.getMonth(), sejak.getDate())) /
      (1000 * 60 * 60 * 24),
  );

  return { hariDiTahapan, sejak, berdasarkanUmur: false };
}
