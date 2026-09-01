import { PDFDocument } from "pdf-lib";
import type { BarisTandaTangan } from "./tanda-tangan";

const BATAS_WAKTU_EMBED_MS = 5000;

function denganBatasWaktu<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Waktu embed gambar habis")), ms)),
  ]);
}

async function benamkanGambar(doc: PDFDocument, dataUri: string) {
  const [meta, base64] = dataUri.split(",");
  const bytes = Buffer.from(base64, "base64");
  const promise = meta.includes("image/png") ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  return denganBatasWaktu(promise, BATAS_WAKTU_EMBED_MS);
}

const TTD_PETUGAS_X = 85;
const TTD_PETUGAS_Y = 635;
const TTD_PETUGAS_LEBAR_MAKS = 110;
const TTD_PETUGAS_TINGGI_MAKS = 55;

const TTD_KACAB_X = 410;
const TTD_KACAB_Y = 715;
const TTD_KACAB_LEBAR_MAKS = 120;
const TTD_KACAB_TINGGI_MAKS = 55;

export async function tempelTtdKskk(
  pdfBytes: Uint8Array | Buffer,
  ttdPetugasSurvei: BarisTandaTangan | null,
  ttdKepalaCabang: BarisTandaTangan | null,
): Promise<Uint8Array> {
  if (!ttdPetugasSurvei?.gambar && !ttdKepalaCabang?.gambar) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  }

  try {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = doc.getPages();

    if (pages.length < 2) {
      return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    }

    const halaman2 = pages[1];

    if (ttdPetugasSurvei?.gambar) {
      try {
        const img = await benamkanGambar(doc, ttdPetugasSurvei.gambar);
        const rasio = img.width / img.height;
        let lebar = TTD_PETUGAS_LEBAR_MAKS;
        let tinggi = lebar / rasio;
        if (tinggi > TTD_PETUGAS_TINGGI_MAKS) {
          tinggi = TTD_PETUGAS_TINGGI_MAKS;
          lebar = tinggi * rasio;
        }
        halaman2.drawImage(img, {
          x: TTD_PETUGAS_X,
          y: TTD_PETUGAS_Y,
          width: lebar,
          height: tinggi,
        });
      } catch {
        // Gambar rusak/tidak terbaca — biarkan area kosong, jangan gagalkan.
      }
    }

    // --- Tempel tanda tangan Kepala Cabang (kanan bawah MENGETAHUI) ---
    if (ttdKepalaCabang?.gambar) {
      try {
        const img = await benamkanGambar(doc, ttdKepalaCabang.gambar);
        const rasio = img.width / img.height;
        let lebar = TTD_KACAB_LEBAR_MAKS;
        let tinggi = lebar / rasio;
        if (tinggi > TTD_KACAB_TINGGI_MAKS) {
          tinggi = TTD_KACAB_TINGGI_MAKS;
          lebar = tinggi * rasio;
        }
        halaman2.drawImage(img, {
          x: TTD_KACAB_X,
          y: TTD_KACAB_Y,
          width: lebar,
          height: tinggi,
        });
      } catch {
        // Gambar rusak/tidak terbaca — biarkan area kosong, jangan gagalkan.
      }
    }

    return doc.save();
  } catch {
    // PDF terproteksi/rusak/tidak bisa di-load — kembalikan aslinya.
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  }
}
