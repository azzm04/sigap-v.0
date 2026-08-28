export interface BarisGL {
  tipeKlaim: string;
  tipeCidera: string;
  namaRumahSakit: string | null;
  loket: string;
  idJaminan: string;
  namaKorban: string;
  nomorSuratJaminan: string | null;
  tglGl: string;
  glStatus: string;
  tahapan: string;
  tglDiajukan: string | null;
  statusVerifikasi: string | null;
  nilaiDiajukan: number;
  nilaiDisetujui: number;
  tglVerifikasi: string | null;
  statusPembayaran: string;
  jumlahPembayaran: number;
  tglPembayaran: string | null;
}

export interface SumberData {
  ambilGL(): Promise<BarisGL[]>;
}
