/**
 * Bentuk hasil seragam untuk seluruh Server Action yang bisa gagal karena
 * kesalahan petugas (berkas belum dipilih, format salah, isian kosong, dan
 * sejenisnya).
 *
 * Server Action TIDAK BOLEH melempar Error untuk kasus semacam itu. Kalau
 * dilempar, yang muncul ke petugas adalah layar galat mentah Next.js
 * ("Runtime Error" beserta potongan kode dan call stack) -- tidak bisa
 * dibaca orang non-teknis, dan di produksi malah jadi halaman error yang
 * membuang isi form yang sudah diketik.
 *
 * Lempar Error HANYA untuk hal yang bukan salah petugas dan memang tidak
 * bisa dipulihkan di layar itu (mis. galat database), supaya tertangkap
 * error boundary.
 *
 * Dipasangkan dengan components/ui/form-aksi.tsx yang menampilkan pesannya
 * sebagai pop-up.
 */
export interface StatusAksi {
  berhasil: boolean;
  pesan: string;
}

export function gagal(pesan: string): StatusAksi {
  return { berhasil: false, pesan };
}

export function sukses(pesan: string): StatusAksi {
  return { berhasil: true, pesan };
}

/** Pesan seragam saat sesi habis -- muncul di semua aksi, jadi disatukan di sini. */
export const PESAN_SESI_TIDAK_VALID = "Sesi tidak valid, silakan masuk ulang.";
