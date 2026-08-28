import { sinkronKeGoogleSheets } from "./sinkron";
import { tarikDariGoogleSheets } from "./tarik";

export interface HasilSinkronDuaArah {
  jumlahDiperbarui: number;
  jumlahDilewati: number;
  jumlahBaris: number;
  jumlahBulan: number;
}

// Satu tombol, dua arah, urutan TETAP: TARIK dulu (baca edit manual dari
// sheet untuk 3 kolom yang boleh diedit -- lib/google-sheets/tarik.ts),
// baru KIRIM (timpa ulang seluruh sheet dengan gl_mirror terbaru --
// lib/google-sheets/sinkron.ts). Urutan ini wajib begini, bukan boleh
// dibalik: kalau kirim jalan duluan, edit yang baru diketik di sheet tapi
// belum sempat ditarik akan LANGSUNG TERTIMPA HILANG oleh kiriman
// berikutnya. Dengan tarik-dulu, edit itu sudah masuk ke database sebelum
// sheet ditimpa ulang -- jadi hasil kirimannya tetap mencerminkan edit
// itu, bukan menghapusnya.
export async function sinkronDuaArahGoogleSheets(): Promise<HasilSinkronDuaArah> {
  const hasilTarik = await tarikDariGoogleSheets();
  const hasilKirim = await sinkronKeGoogleSheets();

  return {
    jumlahDiperbarui: hasilTarik.jumlahDiperbarui,
    jumlahDilewati: hasilTarik.jumlahDilewati,
    jumlahBaris: hasilKirim.jumlahBaris,
    jumlahBulan: hasilKirim.jumlahBulan,
  };
}
