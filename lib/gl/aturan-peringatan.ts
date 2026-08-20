// Aturan peringatan Tahap 1. Lihat CLAUDE.md bagian 7 — logika inti aplikasi.
// Sengaja dipisah jadi fungsi murni supaya mudah diuji lepas dari database.

export interface DataAturanPeringatan {
  tipeKlaim: string;
  glStatus: string;
  statusPembayaran: string;
  tahapan: string;
  umurHari: number;
}

// Hanya dua tahap ini yang jadi wewenang petugas Jasa Raharja untuk ditindak;
// tahap sebelumnya adalah urusan rumah sakit dan lapisan verifikasi
// (CLAUDE.md bagian 7, "Prinsip"). Ini konstanta aturan bisnis yang memang
// tetap, bukan daftar enum terbuka seperti daftar Tahapan secara umum.
const TAHAPAN_DIPANTAU = new Set(["Verifikasi User", "Done"]);

/**
 * true kalau GL ini harus muncul di papan peringatan:
 * - tipe_klaim = 'GL' (bukan Reimbursement)
 * - gl_status = 'Active' (bukan Cancel)
 * - status_pembayaran = 'Unpaid' (sudah dibayar = aman)
 * - tahapan ada di {Verifikasi User, Done}
 * - umur_hari >= ambang_hari
 */
export function apakahMasukPeringatan(
  baris: DataAturanPeringatan,
  ambangHari: number,
): boolean {
  if (baris.tipeKlaim !== "GL") return false;
  if (baris.glStatus !== "Active") return false;
  if (baris.statusPembayaran !== "Unpaid") return false;
  if (!TAHAPAN_DIPANTAU.has(baris.tahapan)) return false;
  if (baris.umurHari < ambangHari) return false;
  return true;
}
