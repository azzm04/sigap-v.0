// Kontrak umum sumber data GL. Lihat CLAUDE.md bagian 3 dan docs/domain-gl.md.
// sumber-dummy.ts (pengembangan) dan sumber-impor.ts (produksi, parser .xlsx)
// sama-sama menghasilkan bentuk BarisGL[] ini, lalu masuk ke normalizer yang sama.

export interface BarisGL {
  tipeKlaim: string;
  tipeCidera: string;
  namaRumahSakit: string | null;
  loket: string;
  idJaminan: string;
  namaKorban: string;
  nomorSuratJaminan: string | null;
  /** ISO `YYYY-MM-DD` */
  tglGl: string;
  glStatus: string;
  tahapan: string;
  /** ISO `YYYY-MM-DD`, null bila kosong */
  tglDiajukan: string | null;
  statusVerifikasi: string | null;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  /** ISO `YYYY-MM-DD`, null bila kosong */
  tglVerifikasi: string | null;
  statusPembayaran: string;
  jumlahPembayaran: number;
  /** ISO `YYYY-MM-DD`, null bila kosong */
  tglPembayaran: string | null;
}

export interface SumberData {
  ambilGL(): Promise<BarisGL[]>;
}
