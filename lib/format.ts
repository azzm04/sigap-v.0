export function formatRupiah(nilai: number): string {
  return `Rp ${nilai.toLocaleString("id-ID")}`;
}

/** iso: "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function formatTanggal(iso: string): string {
  const [tahun, bulan, hari] = iso.split("-");
  return `${hari}/${bulan}/${tahun}`;
}

/** formatTanggal(), tapi "-" untuk tanggal yang belum terisi (null). */
export function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

/** Format tanggal + jam dalam WIB untuk kolom timestamp. */
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

export function tanggalHariIniWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** iso: "YYYY-MM" atau "YYYY-MM-DD" -> "Agustus 2026" */
export function formatBulanTahun(iso: string): string {
  const [tahun, bulan] = iso.split("-");
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`;
}

/**
 * "DD/MM/YYYY" -> iso "YYYY-MM-DD", kebalikan formatTanggal(). null kalau
 * tidak sesuai format atau bukan tanggal valid -- pemanggil (lib/google-sheets/tarik.ts)
 * WAJIB melewati baris yang gagal parse, bukan menyimpan tanggal ngawur.
 */
export function parseTanggalIndo(teks: string): string | null {
  const cocok = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(teks.trim());
  if (!cocok) return null;
  const [, hariStr, bulanStr, tahunStr] = cocok;
  const hari = Number(hariStr);
  const bulan = Number(bulanStr);
  const tahun = Number(tahunStr);
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
  if (
    tanggal.getUTCFullYear() !== tahun ||
    tanggal.getUTCMonth() !== bulan - 1 ||
    tanggal.getUTCDate() !== hari
  ) {
    return null;
  }
  return `${tahunStr}-${bulanStr.padStart(2, "0")}-${hariStr.padStart(2, "0")}`;
}

/** umur_hari = tanggal_hari_ini - Tgl GL, satuan hari kalender */
export function hitungUmurHari(iso: string): number {
  const [tahun, bulan, hari] = iso.split("-").map(Number);
  const tglGl = Date.UTC(tahun, bulan - 1, hari);
  const sekarang = new Date();
  const hariIni = Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  return Math.floor((hariIni - tglGl) / (1000 * 60 * 60 * 24));
}
