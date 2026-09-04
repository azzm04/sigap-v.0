// Konfigurasi pelimpahan berkas antar-loket. Modul ini SENGAJA murni (tidak
// mengimpor db/postgres) supaya boleh diimpor langsung oleh client component
// -- lihat catatan di components/gl/form-tahap-proses.tsx soal kenapa
// lib/gl/tahap-proses.ts tidak boleh masuk bundel client.
//
// Daftar loket tujuan pelimpahan sendiri TIDAK lagi ada di sini -- dulu
// array hardcode LOKET_CABANG, sekarang tabel loket_pelimpahan (diedit lewat
// halaman Pengaturan). Lihat lib/gl/loket-pelimpahan.ts.

export const TAHAP_BELUM_LIMPAH = "Berkas Belum Di Limpah";
