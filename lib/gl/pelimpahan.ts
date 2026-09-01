// Konfigurasi pelimpahan berkas antar-loket. Modul ini SENGAJA murni (tidak
// mengimpor db/postgres) supaya boleh diimpor langsung oleh client component
// -- lihat catatan di components/gl/form-tahap-proses.tsx soal kenapa
// lib/gl/tahap-proses.ts tidak boleh masuk bundel client.

// Tahap yang menandai berkas GL masih menunggu dilimpahkan ke loket lain.
// Langkah SEBELUM "Berkas Diajukan Ke Pusat": selama berkasnya belum sampai
// ke loket yang berwenang, pengajuan ke pusat tidak bisa jalan.
//
// Tidak wajib dilalui setiap GL (arahan pemilik proyek) -- hanya dicatat
// untuk GL yang berkasnya memang perlu berpindah loket. GL yang berkasnya
// sudah di loket yang benar boleh langsung dicatat "Berkas Diajukan Ke
// Pusat".
export const TAHAP_BELUM_LIMPAH = "Berkas Belum Di Limpah";

// Daftar loket tujuan pelimpahan, sesuai daftar dari pemilik proyek.
//
// JANGAN dicampur dengan kolom `loket` di gl_mirror -- itu kode loket dari
// berkas ekspor JRCare (mis. "0400601"), sedangkan ini nama loket tujuan
// pelimpahan yang dipilih petugas secara manual. Dua hal berbeda yang
// kebetulan sama-sama bernama "loket".
export const LOKET_CABANG = [
  "LOKET KANTOR WILAYAH JAWA TENGAH",
  "LOKET KANTOR CABANG SURAKARTA",
  "LOKET KANTOR CABANG MAGELANG",
  "LOKET KANTOR CABANG PURWOKERTO",
  "LOKET KANTOR CABANG PATI",
  "LOKET KANTOR CABANG SEMARANG",
  "LOKET KANTOR CABANG SUKOHARJO",
  "LOKET KANTOR PELAYANAN KLATEN",
  "LOKET KANTOR PELAYANAN WANGON",
  "LOKET KANTOR PELAYANAN DEMAK",
  "LOKET KANTOR PELAYANAN TEGAL",
] as const;

export function apakahLoketCabangValid(nilai: string): boolean {
  return (LOKET_CABANG as readonly string[]).includes(nilai);
}
