// Format tampilan sesuai CLAUDE.md aturan keras #5: Rp dengan pemisah ribuan
// titik, tanggal DD/MM/YYYY.

export function formatRupiah(nilai: number): string {
  return `Rp ${nilai.toLocaleString("id-ID")}`;
}

/** iso: "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.split("-");
  return `${hari}/${bulan}/${tahun}`;
}

/** Format tanggal + jam dalam WIB (CLAUDE.md aturan keras #5), untuk kolom timestamp. */
export function formatWaktu(waktu: Date): string {
  const bagian = waktu.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${bagian} WIB`;
}

/** Tanggal hari ini di zona WIB, format ISO "YYYY-MM-DD" — dipakai untuk membandingkan "sudah dilihat hari ini atau belum". */
export function tanggalHariIniWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/** umur_hari = tanggal_hari_ini - Tgl GL, satuan hari kalender (CLAUDE.md bagian 7) */
export function hitungUmurHari(iso: string): number {
  const [tahun, bulan, hari] = iso.split("-").map(Number);
  const tglGl = Date.UTC(tahun, bulan - 1, hari);
  const sekarang = new Date();
  const hariIni = Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  return Math.floor((hariIni - tglGl) / (1000 * 60 * 60 * 24));
}
