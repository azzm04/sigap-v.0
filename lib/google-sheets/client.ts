import { google, type sheets_v4 } from "googleapis";

// Autentikasi lewat Service Account yang kunci JSON-nya disimpan di file yang path-nya diset di .env.local
function buatAuth() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!keyFile) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_FILE tidak diset di .env.local.");
  }
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function ambilSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: buatAuth() });
}

export function ambilSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID tidak diset di .env.local.");
  }
  return id;
}

// URL publik aplikasi ini, dipakai untuk membangun tautan Laporan Survei
// TKP/KSKK di kolom Google Sheets (lib/google-sheets/sinkron.ts) -- rute
// unduhannya perlu login SIGAP, jadi tautan ini hanya berguna kalau petugas
// membukanya di browser yang sama tempat dia sudah masuk. Nullable dan
// TIDAK throw kalau belum diset -- sinkron tetap jalan, kolom dokumen cuma
// tampil sebagai teks tanpa tautan sampai APP_URL diisi.
export function ambilAppUrl(): string | null {
  const url = process.env.APP_URL;
  return url ? url.replace(/\/+$/, "") : null;
}
