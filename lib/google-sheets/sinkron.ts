import { desc, isNull } from "drizzle-orm";
import { db } from "../db";
import { glMirror, laporanSurveiTkp, statusProsesPusat } from "../db/schema";
import { formatBulanTahun, formatTanggal } from "../format";
import { ambilPetaPicRumahSakit, cariPic } from "../gl/pic";
import { enkripsiIdJaminan, enkripsiTeks } from "../gl/token-url";
import { ambilAppUrl, ambilSheetId, ambilSheetsClient } from "./client";

// Tiap bulan (berdasarkan Tgl GL) dapat sheet sendiri, mis. "GL - Agustus 2026" -- lebih rapi daripada satu sheet raksasa berisi semua GL.
// Nama sheet lama "Data GL (Auto)" (versi sebelum per-bulan) dihapus otomatis
// kalau masih ada, supaya tidak ada sheet basi yang membingungkan.
export const PREFIX_SHEET = "GL - ";
const NAMA_SHEET_LAMA = "Data GL (Auto)";

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "";
}

function namaSheetUntukBulan(tglGlISO: string): string {
  return `${PREFIX_SHEET}${formatBulanTahun(tglGlISO)}`;
}

const HEADER = [
  "Nomor ID Jaminan",
  "Nama Korban",
  "Nama Rumah Sakit",
  "Loket",
  "Tipe Klaim",
  "Tipe Cidera",
  "PIC Task Force",
  "PIC Pengajuan",
  "Tgl GL",
  "Tanggal Masuk",
  "Tanggal Pulang Pasien",
  "Lokasi LAKA",
  "Tahapan",
  "Status Verifikasi",
  "Status Pembayaran",
  "Nilai Diajukan",
  "Nilai Disetujui",
  "Jumlah Pembayaran",
  "Tgl Pembayaran",
  "Tahap Proses Pusat",
  "Laporan Survei TKP",
  "KSKK",
];

// Kolom dokumen (Laporan Survei TKP, KSKK) -- teks ditulis lewat
// values.batchUpdate seperti kolom lain, tapi tautannya ditempel lewat
// updateCells terpisah (fields: "hyperlink") supaya tidak perlu ganti
// valueInputOption jadi USER_ENTERED untuk seluruh sheet (yang berisiko
// bikin Nomor ID Jaminan/angka lain kena tafsir ulang -- lihat komentar di
// sinkronKeGoogleSheets()). Murni cerminan database, TIDAK ikut ditarik
// balik oleh tarik.ts (di luar rentang kolom editable A-L... sekarang M-N,
// tarik.ts cuma baca sampai kolom L jadi otomatis aman).
const INDEKS_KOLOM_LAPORAN_TKP = 20;
const INDEKS_KOLOM_KSKK = 21;

// Indeks kolom (0-based, sesuai urutan HEADER) yang dapat format khusus.
const INDEKS_KOLOM_RUPIAH = [15, 16, 17]; // Nilai Diajukan, Nilai Disetujui, Jumlah Pembayaran
const INDEKS_KOLOM_DROPDOWN = [
  { indeks: 5, kategori: "tipeCidera" as const }, // Tipe Cidera
  { indeks: 12, kategori: "tahapan" as const }, // Tahapan
  { indeks: 13, kategori: "statusVerifikasi" as const }, // Status Verifikasi
  { indeks: 14, kategori: "statusPembayaran" as const }, // Status Pembayaran
];
// Tiga kolom ini SATU-SATUNYA yang boleh diedit petugas langsung di sheet
// lalu ditarik balik ke database (lib/google-sheets/tarik.ts) -- semua
// kolom lain murni cerminan gl_mirror, diam-diam ditimpa ulang tiap
// sinkron. Ditandai warna beda (WARNA_EDITABLE) supaya jelas kelihatan
// mana yang boleh disentuh.
export const INDEKS_KOLOM_EDITABLE = { tanggalMasuk: 9, tanggalPulangPasien: 10, lokasi: 11 };
const INDEKS_KOLOM_TANGGAL = [INDEKS_KOLOM_EDITABLE.tanggalMasuk, INDEKS_KOLOM_EDITABLE.tanggalPulangPasien];

const WARNA_HEADER = { red: 0.302, green: 0.816, blue: 0.882 }; // cyan/turquoise, sesuai contoh
const WARNA_TEKS_HEADER = { red: 1, green: 1, blue: 1 };
const WARNA_EDITABLE = { red: 1, green: 0.949, blue: 0.784 }; // kuning muda, penanda kolom boleh diedit manual

interface PilihanDropdown {
  tipeCidera: string[];
  tahapan: string[];
  statusVerifikasi: string[];
  statusPembayaran: string[];
}

// Daftar pilihan dropdown TIDAK di-hardcode (CLAUDE.md aturan keras #3) --
// diambil langsung dari nilai yang benar-benar ada di gl_mirror, sama
// seperti opsi filter di lib/gl/queries.ts. Kalau data ekspor memunculkan
// nilai baru, dropdown-nya otomatis ikut bertambah di sinkron berikutnya.
async function ambilPilihanDropdown(): Promise<PilihanDropdown> {
  const kondisiAktif = isNull(glMirror.dihapusPada);
  const [tipeCidera, tahapan, statusVerifikasi, statusPembayaran] = await Promise.all([
    db.selectDistinct({ nilai: glMirror.tipeCidera }).from(glMirror).where(kondisiAktif),
    db.selectDistinct({ nilai: glMirror.tahapan }).from(glMirror).where(kondisiAktif),
    db.selectDistinct({ nilai: glMirror.statusVerifikasi }).from(glMirror).where(kondisiAktif),
    db.selectDistinct({ nilai: glMirror.statusPembayaran }).from(glMirror).where(kondisiAktif),
  ]);

  const bersihkan = (baris: { nilai: string | null }[]) =>
    [...new Set(baris.map((b) => b.nilai).filter((v): v is string => !!v))].sort();

  return {
    tipeCidera: bersihkan(tipeCidera),
    tahapan: bersihkan(tahapan),
    statusVerifikasi: bersihkan(statusVerifikasi),
    statusPembayaran: bersihkan(statusPembayaran),
  };
}

export interface EntriDokumen {
  url: string | null;
  teks: string;
}

export interface BarisSheet {
  nilai: (string | number)[];
  // url: null = belum ada dokumen ATAU APP_URL belum diset -- kolomnya
  // tetap terisi teks biasa (bukan tautan yang bisa diklik).
  tautLaporanTkp: EntriDokumen;
  tautKskk: EntriDokumen;
}

// Dikelompokkan berdasarkan bulan Tgl GL -- kunci "YYYY-MM" dipakai untuk
// urutan sortir kronologis, nilai peta adalah baris-baris datanya.
async function ambilBarisPerBulan(): Promise<Map<string, BarisSheet[]>> {
  const appUrl = ambilAppUrl();

  const [semuaGL, petaPic, semuaTahapProses, semuaLaporanTkp] = await Promise.all([
    db
      .select({
        idJaminan: glMirror.idJaminan,
        namaKorban: glMirror.namaKorban,
        namaRumahSakit: glMirror.namaRumahSakit,
        loket: glMirror.loket,
        tipeKlaim: glMirror.tipeKlaim,
        tipeCidera: glMirror.tipeCidera,
        tglGl: glMirror.tglGl,
        tanggalMasuk: glMirror.tanggalMasuk,
        tanggalPulangPasien: glMirror.tanggalPulangPasien,
        lokasi: glMirror.lokasi,
        tahapan: glMirror.tahapan,
        statusVerifikasi: glMirror.statusVerifikasi,
        statusPembayaran: glMirror.statusPembayaran,
        nilaiDiajukan: glMirror.nilaiDiajukan,
        nilaiDisetujui: glMirror.nilaiDisetujui,
        jumlahPembayaran: glMirror.jumlahPembayaran,
        tglPembayaran: glMirror.tglPembayaran,
        kskkNamaBerkas: glMirror.kskkNamaBerkas,
      })
      .from(glMirror)
      .where(isNull(glMirror.dihapusPada))
      .orderBy(desc(glMirror.tglGl), desc(glMirror.id)),
    ambilPetaPicRumahSakit(),
    db
      .select({ idJaminan: statusProsesPusat.idJaminan, tahap: statusProsesPusat.tahap })
      .from(statusProsesPusat)
      .orderBy(desc(statusProsesPusat.dicatatPada)),
    db
      .select({
        id: laporanSurveiTkp.id,
        idJaminan: laporanSurveiTkp.idJaminan,
        nomorLp: laporanSurveiTkp.nomorLp,
      })
      .from(laporanSurveiTkp)
      .orderBy(desc(laporanSurveiTkp.dibuatPada)),
  ]);

  const tahapTerkiniPerId = new Map<string, string>();
  for (const t of semuaTahapProses) {
    if (!tahapTerkiniPerId.has(t.idJaminan)) tahapTerkiniPerId.set(t.idJaminan, t.tahap);
  }

  // Bisa ada beberapa Laporan Survei TKP per GL (riwayat, lihat halaman
  // detail GL) -- yang ditautkan di sheet cuma yang TERBARU, konsisten
  // dengan "keadaan sekarang" yang direpresentasikan tiap baris di sini.
  const laporanTerkiniPerId = new Map<string, { id: number; nomorLp: string }>();
  for (const l of semuaLaporanTkp) {
    if (!laporanTerkiniPerId.has(l.idJaminan)) {
      laporanTerkiniPerId.set(l.idJaminan, { id: l.id, nomorLp: l.nomorLp });
    }
  }

  const perBulan = new Map<string, BarisSheet[]>();

  for (const b of semuaGL) {
    const pic = cariPic(petaPic, b.namaRumahSakit);
    const kunciBulan = b.tglGl.slice(0, 7); // "YYYY-MM"
    const laporanTerkini = laporanTerkiniPerId.get(b.idJaminan);

    const nilai: (string | number)[] = [
      b.idJaminan,
      b.namaKorban,
      b.namaRumahSakit ?? "",
      b.loket,
      b.tipeKlaim,
      b.tipeCidera,
      pic.picTaskForce ?? "",
      pic.picPengajuan ?? "",
      formatTanggal(b.tglGl),
      formatTanggalOpsional(b.tanggalMasuk),
      formatTanggalOpsional(b.tanggalPulangPasien),
      b.lokasi ?? "",
      b.tahapan,
      b.statusVerifikasi ?? "",
      b.statusPembayaran,
      b.nilaiDiajukan,
      b.nilaiDisetujui,
      b.jumlahPembayaran,
      formatTanggalOpsional(b.tglPembayaran),
      tahapTerkiniPerId.get(b.idJaminan) ?? "",
      laporanTerkini?.nomorLp ?? "",
      b.kskkNamaBerkas ?? "",
    ];

    const baris: BarisSheet = {
      nilai,
      tautLaporanTkp: {
        url:
          appUrl && laporanTerkini
            ? `${appUrl}/api/laporan-tkp/${enkripsiTeks(String(laporanTerkini.id))}`
            : null,
        teks: laporanTerkini?.nomorLp ?? "",
      },
      tautKskk: {
        url: appUrl && b.kskkNamaBerkas ? `${appUrl}/api/kskk/${enkripsiIdJaminan(b.idJaminan)}` : null,
        teks: b.kskkNamaBerkas ?? "",
      },
    };

    if (!perBulan.has(kunciBulan)) perBulan.set(kunciBulan, []);
    perBulan.get(kunciBulan)!.push(baris);
  }

  return perBulan;
}

// Repeat-cell + data-validation untuk satu sheet bulan berkas KSKK).
function escapeFormulaSheets(teks: string): string {
  return teks.replace(/"/g, '""');
}

function selEntriDokumen(entri: EntriDokumen): Record<string, unknown> {
  if (!entri.url) return { userEnteredValue: { stringValue: entri.teks } };
  const url = escapeFormulaSheets(entri.url);
  const teks = escapeFormulaSheets(entri.teks || entri.url);
  // Pemisah argumen ";" BUKAN "," -- locale spreadsheet "in_ID" (Indonesia)
  return { userEnteredValue: { formulaValue: `=HYPERLINK("${url}";"${teks}")` } };
}

function requestFormatSheet(
  sheetId: number,
  jumlahBarisData: number,
  pilihan: PilihanDropdown,
  taut: { laporanTkp: EntriDokumen[]; kskk: EntriDokumen[] },
): Record<string, unknown>[] {
  const requests: Record<string, unknown>[] = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: HEADER.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: WARNA_HEADER,
            textFormat: { fontSize: 12, bold: true, foregroundColor: WARNA_TEKS_HEADER },
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    },
    // Lebar kolom otomatis menyesuaikan isi (header maupun data) supaya
    // tidak ada teks terpotong, mis. "Tanggal Pulang Pasien" -- dijalankan ulang tiap sinkron karena lebar yang pas tergantung isi data terkini.
    {
      autoResizeDimensions: {
        dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: HEADER.length },
      },
    },
  ];

  if (jumlahBarisData === 0) return requests;

  const endRowIndex = 1 + jumlahBarisData;

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex, startColumnIndex: 0, endColumnIndex: HEADER.length },
      cell: { userEnteredFormat: { textFormat: { fontSize: 10 } } },
      fields: "userEnteredFormat.textFormat.fontSize",
    },
  });

  for (const kolom of INDEKS_KOLOM_RUPIAH) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex, startColumnIndex: kolom, endColumnIndex: kolom + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: '"Rp "#,##0' } } },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  }

  // Format tanggal eksplisit supaya Sheets konsisten menafsirkan tanggal
  // yang diketik petugas (bukan ambigu MM/DD vs DD/MM), dan render balik
  // selalu "dd/mm/yyyy" -- dibaca ulang oleh tarik.ts dengan format yang sama persis.
  for (const kolom of INDEKS_KOLOM_TANGGAL) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex, startColumnIndex: kolom, endColumnIndex: kolom + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  }

  // Data validation "tanggal valid" ini yang memunculkan ikon kalender
  // (date picker) Sheets saat sel diklik -- numberFormat DATE di atas
  // cuma mengatur TAMPILAN, bukan fiturnya. Dengan ini petugas tinggal
  // klik & pilih tanggal, tidak perlu ketik manual
  for (const kolom of INDEKS_KOLOM_TANGGAL) {
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex, startColumnIndex: kolom, endColumnIndex: kolom + 1 },
        rule: {
          condition: { type: "DATE_IS_VALID" },
          showCustomUi: true,
          strict: true,
        },
      },
    });
  }

  // Tandai ketiga kolom yang boleh diedit manual (Tanggal Masuk, Tanggal Pulang Pasien, Lokasi LAKA) dengan warna beda dari kolom lain yang
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex,
        startColumnIndex: INDEKS_KOLOM_EDITABLE.tanggalMasuk,
        endColumnIndex: INDEKS_KOLOM_EDITABLE.lokasi + 1,
      },
      cell: { userEnteredFormat: { backgroundColor: WARNA_EDITABLE } },
      fields: "userEnteredFormat.backgroundColor",
    },
  });

  for (const { indeks, kategori } of INDEKS_KOLOM_DROPDOWN) {
    const nilai = pilihan[kategori];
    if (nilai.length === 0) continue;
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex, startColumnIndex: indeks, endColumnIndex: indeks + 1 },
        rule: {
          condition: { type: "ONE_OF_LIST", values: nilai.map((v) => ({ userEnteredValue: v })) },
          showCustomUi: true,
          strict: false,
        },
      },
    });
  }

  // Tautan kolom Laporan Survei TKP/KSKK ditempel lewat formula =HYPERLINK()
  // pada updateCells. CellData.hyperlink TIDAK bisa dipakai untuk MENULIS
  // tautan (field itu output-only, cuma mencerminkan hyperlink yang sudah
  // ada dari formula/rich-text -- sempat dicoba dan gagal diam-diam saat
  // pengujian). fields: "userEnteredValue" jadi WAJIB isi eksplisit untuk
  // setiap baris (formula kalau ada dokumen, teks biasa kalau tidak) --
  // kalau dikosongkan begitu saja, Sheets mengosongkan selnya, bukan
  // membiarkan nilai lama dari Tahap 2 (values.batchUpdate).
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex,
        startColumnIndex: INDEKS_KOLOM_LAPORAN_TKP,
        endColumnIndex: INDEKS_KOLOM_LAPORAN_TKP + 1,
      },
      rows: taut.laporanTkp.map((t) => ({ values: [selEntriDokumen(t)] })),
      fields: "userEnteredValue",
    },
  });
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex,
        startColumnIndex: INDEKS_KOLOM_KSKK,
        endColumnIndex: INDEKS_KOLOM_KSKK + 1,
      },
      rows: taut.kskk.map((t) => ({ values: [selEntriDokumen(t)] })),
      fields: "userEnteredValue",
    },
  });

  return requests;
}

export interface HasilSinkronSheets {
  jumlahBaris: number;
  jumlahBulan: number;
}

export async function sinkronKeGoogleSheets(): Promise<HasilSinkronSheets> {
  const spreadsheetId = ambilSheetId();
  const sheets = ambilSheetsClient();

  const [perBulan, pilihanDropdown] = await Promise.all([ambilBarisPerBulan(), ambilPilihanDropdown()]);
  const kunciBulanUrut = [...perBulan.keys()].sort(); // kronologis, "YYYY-MM"
  const namaSheetPerBulan = kunciBulanUrut.map((k) => namaSheetUntukBulan(`${k}-01`));

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIdPerNama = new Map(
    (meta.data.sheets ?? []).map((s) => [s.properties?.title ?? "", s.properties?.sheetId ?? 0]),
  );

  const requestsStruktur: Record<string, unknown>[] = [];

  const sheetIdLama = sheetIdPerNama.get(NAMA_SHEET_LAMA);
  if (sheetIdLama !== undefined) {
    requestsStruktur.push({ deleteSheet: { sheetId: sheetIdLama } });
  }


  const sheetBaru: string[] = [];
  for (const nama of namaSheetPerBulan) {
    if (!sheetIdPerNama.has(nama)) {
      requestsStruktur.push({ addSheet: { properties: { title: nama } } });
      sheetBaru.push(nama);
    }
  }

  if (requestsStruktur.length > 0) {
    const hasilStruktur = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: requestsStruktur },
    });
    for (const reply of hasilStruktur.data.replies ?? []) {
      const properties = reply.addSheet?.properties;
      if (properties?.title && properties.sheetId !== undefined && properties.sheetId !== null) {
        sheetIdPerNama.set(properties.title, properties.sheetId);
      }
    }
  }

  // --- Tahap 2: isi nilai ---
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: { ranges: namaSheetPerBulan.map((n) => `'${n}'!A:Z`) },
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: kunciBulanUrut.map((kunci, i) => ({
        range: `'${namaSheetPerBulan[i]}'!A1`,
        values: [HEADER, ...perBulan.get(kunci)!.map((b) => b.nilai)],
      })),
    },
  });

  // --- Tahap 3: format & dropdown, diulang tiap sinkron supaya konsisten ---
  const requestsFormat = kunciBulanUrut.flatMap((kunci, i) => {
    const nama = namaSheetPerBulan[i];
    const sheetId = sheetIdPerNama.get(nama);
    if (sheetId === undefined) return [];
    const barisBulan = perBulan.get(kunci)!;
    return requestFormatSheet(sheetId, barisBulan.length, pilihanDropdown, {
      laporanTkp: barisBulan.map((b) => b.tautLaporanTkp),
      kskk: barisBulan.map((b) => b.tautKskk),
    });
  });

  if (requestsFormat.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: requestsFormat },
    });
  }

  const jumlahBaris = [...perBulan.values()].reduce((total, baris) => total + baris.length, 0);

  return { jumlahBaris, jumlahBulan: kunciBulanUrut.length };
}
