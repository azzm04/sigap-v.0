import { ilike, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../db";
import { glMirror } from "../db/schema";

export interface BarisDASI {
  namaKorban: string;
  tglKejadian: string; 
  lokasi: string;
}

export class GalatValidasiDASI extends Error {
  readonly masalah: string[];

  constructor(masalah: string[]) {
    super(`Berkas DASI ditolak:\n${masalah.join("\n")}`);
    this.name = "GalatValidasiDASI";
    this.masalah = masalah;
  }
}

function excelDateToISO(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split("T")[0];
}

/**
 * Mem-parse buffer berkas ekspor DASI .xlsx menjadi BarisDASI[].
 * Kolom DASI:
 * 0: Nomor
 * 1: Polres
 * 2: Tgl Kejadian (Serial Excel)
 * 3: Nomor LP
 * 4: Lokasi
 * 5: Nama Korban
 */
export function parseBerkasDASI(sumber: Buffer | ArrayBuffer): BarisDASI[] {
  const workbook = XLSX.read(sumber, { type: "buffer", raw: true });
  const namaSheet = workbook.SheetNames[0];
  if (!namaSheet) {
    throw new GalatValidasiDASI(["Berkas tidak memuat sheet apa pun."]);
  }

  const sheet = workbook.Sheets[namaSheet];
  const baris2d = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const masalah: string[] = [];
  const hasil: BarisDASI[] = [];

  for (let i = 0; i < baris2d.length; i++) {
    const raw = baris2d[i] ?? [];
    // Skip empty rows
    if (raw.every((v) => v === null || v === undefined || String(v).trim() === "")) {
      continue;
    }

    const nomorBaris = i + 1;
    const serialTglKejadian = raw[2];
    const lokasiRaw = raw[4];
    const namaKorbanRaw = raw[5];

    if (!namaKorbanRaw || String(namaKorbanRaw).trim() === "") {
      masalah.push(`Baris ${nomorBaris}: Nama Korban (kolom F) kosong.`);
      continue;
    }
    
    if (typeof serialTglKejadian !== "number") {
       masalah.push(`Baris ${nomorBaris}: Tgl Kejadian (kolom C) tidak valid atau bukan format tanggal Excel.`);
       continue;
    }

    hasil.push({
      namaKorban: String(namaKorbanRaw).trim(),
      tglKejadian: excelDateToISO(serialTglKejadian),
      lokasi: lokasiRaw ? String(lokasiRaw).trim() : "-", // fallback jika lokasi kosong
    });
  }

  if (masalah.length > 0) {
    const ditampilkan = masalah.slice(0, 20);
    if (masalah.length > 20) {
      ditampilkan.push(`...dan ${masalah.length - 20} masalah lainnya.`);
    }
    throw new GalatValidasiDASI(ditampilkan);
  }

  return hasil;
}

export interface HasilSimpanDASI {
  jumlahBaris: number;
  jumlahCocok: number;
}

/**
 * Menyimpan data DASI ke gl_mirror. Pencocokan dilakukan dengan ilike pada namaKorban.
 */
export async function simpanDataDASI(barisDASI: BarisDASI[]): Promise<HasilSimpanDASI> {
  let jumlahCocok = 0;

  await db.transaction(async (tx) => {
    for (const b of barisDASI) {
      // Cari record di gl_mirror yang namanya cocok (case-insensitive)
      // Kalau ada duplikat nama, akan update semuanya
      //
      // tanggalMasuk ikut diisi dari Tgl Kejadian DASI, TAPI HANYA kalau
      // masih kosong (COALESCE) -- arahan pemilik proyek: kedua tanggal ini
      // dianggap sama secara operasional (lihat juga
      // scripts/backfill-tgl-kejadian-dari-tanggal-masuk.ts, arah
      // sebaliknya). Kalau PIC Task Force sudah pernah isi manual (atau
      // sudah pernah terisi dari DASI sebelumnya), nilai itu TIDAK pernah
      // ditimpa ulang di sini -- beda dari tglKejadian/lokasi di atas yang
      // memang selalu ditimpa ulang tiap impor DASI.
      const updated = await tx
        .update(glMirror)
        .set({
          tglKejadian: b.tglKejadian,
          lokasi: b.lokasi,
          tanggalMasuk: sql`COALESCE(${glMirror.tanggalMasuk}, ${b.tglKejadian})`,
        })
        .where(ilike(glMirror.namaKorban, b.namaKorban))
        .returning({ id: glMirror.id });

      if (updated.length > 0) {
        jumlahCocok++; // Dihitung per baris DASI yang berhasil dicocokkan minimal ke 1 record
      }
    }
  });

  return {
    jumlahBaris: barisDASI.length,
    jumlahCocok,
  };
}
