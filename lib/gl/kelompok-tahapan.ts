// Pengelompokan Tahapan GL untuk filter "Kelompok Tahapan" di halaman
// /sebaran/[nama] -- arahan pemilik proyek. "Belum Di Klaim" = GL yang masih
// di proses administrasi awal, "Klaim" = GL yang sudah masuk proses klaim.
//
// Sengaja file TERSENDIRI (bukan di lib/gl/sebaran.ts) karena konstanta ini
// juga dipakai oleh komponen client (components/gl/filter-tanggal-detail-rs.tsx)
// -- sebaran.ts mengimpor lib/db (postgres, server-only) yang gagal di-bundle
// kalau diimpor dari komponen client ("Module not found: fs/perf_hooks").
export const KELOMPOK_TAHAPAN_GL = {
  "belum-diklaim": {
    label: "Belum Di Klaim",
    tahapan: ["Penerimaan GL", "Surat Keterangan Kesehatan", "Surat Kuasa"],
  },
  klaim: {
    label: "Klaim",
    tahapan: ["Verifikasi User"],
  },
} as const;

export type KunciKelompokTahapan = keyof typeof KELOMPOK_TAHAPAN_GL;

export function isKunciKelompokTahapan(nilai: string | undefined): nilai is KunciKelompokTahapan {
  return Boolean(nilai) && Object.prototype.hasOwnProperty.call(KELOMPOK_TAHAPAN_GL, nilai as string);
}
