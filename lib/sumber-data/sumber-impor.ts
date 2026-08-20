import * as XLSX from "xlsx";
import type { BarisGL, SumberData } from "./index";

// Parser berkas ekspor .xlsx dari JRCare. Jalur utama dan satu-satunya untuk
// produksi (CLAUDE.md bagian 3). Kontrak berkas ada di docs/domain-gl.md.

const KOLOM_WAJIB = [
  "Tipe Klaim",
  "Tipe Cidera",
  "Nama Rumah Sakit",
  "Loket",
  "Nomor ID Jaminan",
  "Nama Korban",
  "Nomor Surat Jaminan",
  "Tgl GL",
  "GL Status",
  "Tahapan",
  "Tgl Diajukan",
  "Status Verifikasi",
  "Nilai Diajukan",
  "Nilai Disetujui",
  "Tgl Verifikasi",
  "Status Pembayaran",
  "Jumlah Pembayaran",
  "Tgl Pembayaran",
] as const;

// Kolom yang wajib terisi (tidak boleh "-" atau kosong) di setiap baris data.
const KOLOM_WAJIB_ISI = [
  "Tipe Klaim",
  "Tipe Cidera",
  "Loket",
  "Nomor ID Jaminan",
  "Nama Korban",
  "Tgl GL",
  "GL Status",
  "Tahapan",
  "Status Pembayaran",
] as const;

// Baris header sebenarnya dicari lewat tiga penanda ini, bukan asumsi baris 1.
// Blok filter di atasnya menulis "Tipe Klaim : " (dengan titik dua), beda dari
// header asli "Tipe Klaim" persis, jadi pencocokan persis sudah cukup membedakan.
const PENANDA_HEADER = ["Tipe Klaim", "Nomor ID Jaminan", "Tahapan"] as const;

const PENANDA_TOTAL = "Total Data Klaim";

const BATAS_MASALAH_DILAPORKAN = 20;

export class GalatValidasiImpor extends Error {
  readonly masalah: string[];

  constructor(masalah: string[]) {
    super(`Berkas ekspor ditolak:\n${masalah.join("\n")}`);
    this.name = "GalatValidasiImpor";
    this.masalah = masalah;
  }
}

function selKosong(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s === "-";
}

function ambilTeks(v: unknown): string | null {
  return selKosong(v) ? null : String(v).trim();
}

function parseTanggal(
  v: unknown,
  kolom: string,
  nomorBaris: number,
  masalah: string[],
): string | null {
  if (selKosong(v)) return null;
  const s = String(v).trim();
  const cocok = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!cocok) {
    masalah.push(
      `Baris ${nomorBaris}: kolom "${kolom}" tidak berformat DD-MM-YYYY ("${s}")`,
    );
    return null;
  }
  const [, dd, mm, yyyy] = cocok;
  const hari = Number(dd);
  const bulan = Number(mm);
  const tahun = Number(yyyy);
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
  const valid =
    tanggal.getUTCFullYear() === tahun &&
    tanggal.getUTCMonth() === bulan - 1 &&
    tanggal.getUTCDate() === hari;
  if (!valid) {
    masalah.push(`Baris ${nomorBaris}: kolom "${kolom}" tanggal tidak valid ("${s}")`);
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function parseAngka(
  v: unknown,
  kolom: string,
  nomorBaris: number,
  masalah: string[],
): number {
  if (selKosong(v)) return 0;
  const angka = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(angka)) {
    masalah.push(`Baris ${nomorBaris}: kolom "${kolom}" bukan angka ("${v}")`);
    return 0;
  }
  return Math.round(angka);
}

function cariBarisHeader(baris2d: unknown[][]): number {
  for (let i = 0; i < baris2d.length; i++) {
    const sel = baris2d[i].map((v) => (v === null || v === undefined ? "" : String(v).trim()));
    if (PENANDA_HEADER.every((p) => sel.includes(p))) {
      return i;
    }
  }
  return -1;
}

function apakahBarisPenandaTotal(baris: unknown[]): boolean {
  return baris.some((v) => typeof v === "string" && v.trim() === PENANDA_TOTAL);
}

function apakahBarisKosong(baris: unknown[]): boolean {
  return baris.every(selKosong);
}

/**
 * Mem-parse buffer berkas ekspor .xlsx menjadi BarisGL[]. Melempar
 * GalatValidasiImpor kalau struktur berkas tidak sesuai kontrak, tanpa
 * menyimpan data separuh jalan.
 */
export function parseBerkasEkspor(sumber: Buffer | ArrayBuffer): BarisGL[] {
  const workbook = XLSX.read(sumber, { type: "buffer", raw: true });
  const namaSheet = workbook.SheetNames[0];
  if (!namaSheet) {
    throw new GalatValidasiImpor(["Berkas tidak memuat sheet apa pun."]);
  }

  const sheet = workbook.Sheets[namaSheet];
  const baris2d = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const indeksHeader = cariBarisHeader(baris2d);
  if (indeksHeader === -1) {
    throw new GalatValidasiImpor([
      'Baris header tidak ditemukan. Pastikan berkas ekspor sesuai format "KLAIM REPORT" dari JRCare — kolom Tipe Klaim, Nomor ID Jaminan, dan Tahapan harus ada bersamaan di satu baris.',
    ]);
  }

  const headerRow = baris2d[indeksHeader].map((v) =>
    v === null || v === undefined ? "" : String(v).trim(),
  );
  const kolomIdx = new Map<string, number>();
  for (const nama of KOLOM_WAJIB) {
    const idx = headerRow.indexOf(nama);
    if (idx !== -1) kolomIdx.set(nama, idx);
  }
  const kolomHilang = KOLOM_WAJIB.filter((n) => !kolomIdx.has(n));
  if (kolomHilang.length > 0) {
    throw new GalatValidasiImpor([
      `Jumlah kolom tidak sesuai. Kolom wajib berikut tidak ditemukan di berkas: ${kolomHilang.join(", ")}.`,
    ]);
  }

  const masalah: string[] = [];
  const hasil: BarisGL[] = [];

  for (let i = indeksHeader + 1; i < baris2d.length; i++) {
    const raw = baris2d[i] ?? [];
    if (apakahBarisKosong(raw)) continue;
    if (apakahBarisPenandaTotal(raw)) break;

    const nomorBaris = i + 1; // nomor baris Excel, 1-indexed
    const sel = (nama: (typeof KOLOM_WAJIB)[number]) => raw[kolomIdx.get(nama)!] ?? null;

    for (const nama of KOLOM_WAJIB_ISI) {
      if (selKosong(sel(nama))) {
        masalah.push(`Baris ${nomorBaris}: kolom "${nama}" wajib diisi tapi kosong`);
      }
    }

    const idJaminan = ambilTeks(sel("Nomor ID Jaminan"));
    const tglGl = parseTanggal(sel("Tgl GL"), "Tgl GL", nomorBaris, masalah);

    if (!idJaminan || !tglGl) {
      // Sudah dicatat di masalah lewat KOLOM_WAJIB_ISI / parseTanggal.
      continue;
    }

    hasil.push({
      tipeKlaim: ambilTeks(sel("Tipe Klaim")) ?? "",
      tipeCidera: ambilTeks(sel("Tipe Cidera")) ?? "",
      namaRumahSakit: ambilTeks(sel("Nama Rumah Sakit")),
      loket: ambilTeks(sel("Loket")) ?? "",
      idJaminan,
      namaKorban: ambilTeks(sel("Nama Korban")) ?? "",
      nomorSuratJaminan: ambilTeks(sel("Nomor Surat Jaminan")),
      tglGl,
      glStatus: ambilTeks(sel("GL Status")) ?? "",
      tahapan: ambilTeks(sel("Tahapan")) ?? "",
      tglDiajukan: parseTanggal(sel("Tgl Diajukan"), "Tgl Diajukan", nomorBaris, masalah),
      statusVerifikasi: ambilTeks(sel("Status Verifikasi")),
      nilaiDiajukan: parseAngka(sel("Nilai Diajukan"), "Nilai Diajukan", nomorBaris, masalah),
      nilaiDisetujui: parseAngka(sel("Nilai Disetujui"), "Nilai Disetujui", nomorBaris, masalah),
      tglVerifikasi: parseTanggal(sel("Tgl Verifikasi"), "Tgl Verifikasi", nomorBaris, masalah),
      statusPembayaran: ambilTeks(sel("Status Pembayaran")) ?? "",
      jumlahPembayaran: parseAngka(
        sel("Jumlah Pembayaran"),
        "Jumlah Pembayaran",
        nomorBaris,
        masalah,
      ),
      tglPembayaran: parseTanggal(sel("Tgl Pembayaran"), "Tgl Pembayaran", nomorBaris, masalah),
    });
  }

  if (masalah.length > 0) {
    const ditampilkan = masalah.slice(0, BATAS_MASALAH_DILAPORKAN);
    if (masalah.length > BATAS_MASALAH_DILAPORKAN) {
      ditampilkan.push(`...dan ${masalah.length - BATAS_MASALAH_DILAPORKAN} masalah lainnya.`);
    }
    throw new GalatValidasiImpor(ditampilkan);
  }

  return hasil;
}

export function buatSumberImpor(sumber: Buffer | ArrayBuffer): SumberData {
  return {
    async ambilGL() {
      return parseBerkasEkspor(sumber);
    },
  };
}
