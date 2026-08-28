import { TAHAPAN_DIPANTAU } from "./aturan-peringatan";

// Peringatan PIC Task Force ("Peringatan 1") -- terpisah dari
// Peringatan PIC Pengajuan ("Peringatan 2" di aturan-peringatan.ts).
// Menandakan GL yang kasusnya perlu dipantau tapi datanya belum lengkap --
// artinya PIC belum sempat/selesai kunjungan ke rumah sakit.

export interface DataAturanTaskForce {
  tipeKlaim: string;
  glStatus: string;
  tahapan: string;
  tanggalPulangPasien: string | null;
  lokasi: string | null;
  /**
   * Hari sejak tanggal acuan -- pemanggil yang menghitung dan menentukan
   * tanggal acuannya lewat rantai fallback Tanggal Masuk -> Tgl Laka (DASI)
   * -> Tgl GL (lib/gl/peringatan-task-force.ts), supaya GL tetap kelihatan
   * di peringatan ini walau PIC Task Force belum sempat isi Tanggal Masuk.
   * Nama field historis "umurSejakMasuk" dipertahankan (pola sama dengan
   * catatan migrasi di aturan-peringatan.ts) -- maknanya sudah bergeser
   * jadi "umur berdasarkan tanggal acuan terbaik yang tersedia".
   */
  umurSejakMasuk: number;
}

/**
 * true kalau GL ini harus muncul di Peringatan PIC Task Force:
 * - tipe_klaim = 'GL' (bukan Reimbursement)
 * - gl_status = 'Active' (bukan Cancel)
 * - tahapan BELUM sampai {Verifikasi User, Done} -- begitu sampai situ,
 *   otomatis dianggap PIC sudah selesai kunjungan, giliran Peringatan
 *   PIC Pengajuan (aturan-peringatan.ts) yang berlaku
 * - umur_sejak_masuk >= ambang_hari
 * - Tanggal Pulang Pasien KOSONG, ATAU Lokasi LAKA KOSONG (salah satu
 *   cukup -- keduanya sama-sama tanda data kunjungan belum lengkap)
 */
export function apakahMasukPeringatanTaskForce(
  baris: DataAturanTaskForce,
  ambangHari: number,
): boolean {
  if (baris.tipeKlaim !== "GL") return false;
  if (baris.glStatus !== "Active") return false;
  if (TAHAPAN_DIPANTAU.has(baris.tahapan)) return false;
  if (baris.umurSejakMasuk < ambangHari) return false;
  if (baris.tanggalPulangPasien && baris.lokasi) return false;
  return true;
}
