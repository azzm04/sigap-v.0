import { eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { parseTanggalIndo } from "../format";
import { ambilSheetId, ambilSheetsClient } from "./client";
import { INDEKS_KOLOM_EDITABLE, PREFIX_SHEET } from "./sinkron";

export interface HasilTarikSheets {
  jumlahDiperbarui: number;
  jumlahDilewati: number;
}

interface NilaiEditable {
  tanggalMasuk: string | null;
  tanggalPulangPasien: string | null;
  lokasi: string | null;
}

// Sinkronisasi SATU ARAH: Google Sheets -> gl_mirror, HANYA 3 kolom yang
// memang boleh diedit manual di sheet (Tanggal Masuk, Tanggal Pulang Pasien, Lokasi LAKA -- lihat INDEKS_KOLOM_EDITABLE di sinkron.ts, dan warna kuning penanda di sheet-nya). 
// Kolom lain di sheet diabaikan total sekalipun diubah manual di sana -- itu murni cerminan gl_mirror dari
// impor JRCare/DASI, bukan sumber kebenaran, dan TIDAK boleh bisa ditimpa
// balik lewat sheet (kalau bisa, aturan inti "gl_mirror selalu ikut impor
// terakhir" jadi rusak).
//
// ATURAN PENTING: sel KOSONG di sheet berarti "jangan ubah", BUKAN
// "kosongkan nilai di database". Kalau ingin mengosongkan field yang
// sudah terisi, harus lewat form di halaman detail GL, bukan lewat sheet
// -- supaya urutan tarik-lalu-kirim (sinkronDuaArahGoogleSheets) tidak
// pernah diam-diam menghapus data yang baru saja diisi lewat web sebelum
export async function tarikDariGoogleSheets(): Promise<HasilTarikSheets> {
  const spreadsheetId = ambilSheetId();
  const sheets = ambilSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const namaSheetBulan = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title ?? "")
    .filter((n) => n.startsWith(PREFIX_SHEET));

  if (namaSheetBulan.length === 0) {
    return { jumlahDiperbarui: 0, jumlahDilewati: 0 };
  }

  const [hasilSheet, semuaGL] = await Promise.all([
    sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: namaSheetBulan.map((n) => `'${n}'!A2:L`),
      valueRenderOption: "FORMATTED_VALUE",
    }),
    db
      .select({
        idJaminan: glMirror.idJaminan,
        tanggalMasuk: glMirror.tanggalMasuk,
        tanggalPulangPasien: glMirror.tanggalPulangPasien,
        lokasi: glMirror.lokasi,
      })
      .from(glMirror)
      .where(isNull(glMirror.dihapusPada)),
  ]);

  const nilaiSekarang = new Map<string, NilaiEditable>(semuaGL.map((b) => [b.idJaminan, b]));

  let diperbarui = 0;
  let dilewati = 0;

  await db.transaction(async (tx) => {
    for (const valueRange of hasilSheet.data.valueRanges ?? []) {
      for (const baris of valueRange.values ?? []) {
        const idJaminan = (baris[0] ?? "").toString().trim();
        if (!idJaminan) continue;

        const sekarang = nilaiSekarang.get(idJaminan);
        if (!sekarang) {
          dilewati++;
          continue;
        }

        const perubahan: { tanggalMasuk?: string; tanggalPulangPasien?: string; lokasi?: string } = {};

        const selTanggalMasuk = (baris[INDEKS_KOLOM_EDITABLE.tanggalMasuk] ?? "").toString().trim();
        if (selTanggalMasuk) {
          const iso = parseTanggalIndo(selTanggalMasuk);
          if (iso && iso !== sekarang.tanggalMasuk) perubahan.tanggalMasuk = iso;
        }

        const selTanggalPulang = (baris[INDEKS_KOLOM_EDITABLE.tanggalPulangPasien] ?? "")
          .toString()
          .trim();
        if (selTanggalPulang) {
          const iso = parseTanggalIndo(selTanggalPulang);
          if (iso && iso !== sekarang.tanggalPulangPasien) perubahan.tanggalPulangPasien = iso;
        }

        const selLokasi = (baris[INDEKS_KOLOM_EDITABLE.lokasi] ?? "").toString().trim();
        if (selLokasi && selLokasi !== sekarang.lokasi) perubahan.lokasi = selLokasi;

        // Tidak ada field yang benar-benar beda dari database -- lewati, jangan hitung sebagai "diperbarui" dan jangan kirim UPDATE
        if (Object.keys(perubahan).length === 0) continue;

        await tx.update(glMirror).set(perubahan).where(eq(glMirror.idJaminan, idJaminan));
        diperbarui++;
      }
    }
  });

  return { jumlahDiperbarui: diperbarui, jumlahDilewati: dilewati };
}
