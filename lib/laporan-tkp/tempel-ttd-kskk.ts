import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { BarisTandaTangan } from "./tanda-tangan";

const BATAS_WAKTU_EMBED_MS = 5000;
const BATAS_WAKTU_ANCHOR_MS = 5000;

function denganBatasWaktu<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Waktu embed gambar habis")), ms),
    ),
  ]);
}

async function benamkanGambar(doc: PDFDocument, dataUri: string) {
  const [meta, base64] = dataUri.split(",");
  const bytes = Buffer.from(base64, "base64");
  const promise = meta.includes("image/png")
    ? doc.embedPng(bytes)
    : doc.embedJpg(bytes);
  return denganBatasWaktu(promise, BATAS_WAKTU_EMBED_MS);
}

const TTD_PETUGAS_X = 85;
const TTD_PETUGAS_Y = 635;
const TTD_PETUGAS_LEBAR_MAKS = 110;
const TTD_PETUGAS_TINGGI_MAKS = 55;

const TTD_KACAB_X = 410;
const TTD_KACAB_Y = 711;
const TTD_KACAB_LEBAR_MAKS = 120;
const TTD_KACAB_TINGGI_MAKS = 55;

// --- Posisi berbasis anchor teks -- lihat cariAnchorTeks() di bawah.
const ANCHOR_KACAB_OFFSET_X = 15;
const ANCHOR_KACAB_OFFSET_Y = 70; // turun dari baseline "MENGETAHUI"
const ANCHOR_KACAB_LEBAR_MAKS = 125;
const ANCHOR_KACAB_TINGGI_MAKS = 50;

// Petugas Survei/Mobile Service: anchor "TANDA TANGAN" TERKIRI (teks ini
const ANCHOR_PETUGAS_OFFSET_X = 15;
const ANCHOR_PETUGAS_OFFSET_Y = -50; // turun dari baseline "TANDA TANGAN"
const ANCHOR_PETUGAS_LEBAR_MAKS = 115;
const ANCHOR_PETUGAS_TINGGI_MAKS = 42;

interface TitikAnchor {
  x: number;
  y: number;
}

interface HasilAnchor {
  halamanIndex: number;
  mengetahui: TitikAnchor | null;
  tandaTangan: TitikAnchor | null;
}

async function cariAnchorTeks(pdfBytes: Uint8Array | Buffer): Promise<HasilAnchor | null> {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjsLib.getDocument({ data }).promise;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      const cariTeks = (target: string, pilihTerkiri = false): TitikAnchor | null => {
        const cocok = content.items.filter(
          (it): it is typeof it & { str: string; transform: number[] } =>
            "str" in it && typeof (it as { str?: unknown }).str === "string" &&
            (it as { str: string }).str.toUpperCase().includes(target),
        );
        if (cocok.length === 0) return null;
        const dipilih = pilihTerkiri
          ? cocok.reduce((a, b) => (a.transform[4] < b.transform[4] ? a : b))
          : cocok[0];
        return { x: dipilih.transform[4], y: dipilih.transform[5] };
      };

      const mengetahui = cariTeks("MENGETAHUI");
      const tandaTangan = cariTeks("TANDA TANGAN", true);
      if (mengetahui || tandaTangan) {
        return { halamanIndex: i - 1, mengetahui, tandaTangan };
      }
    }
    console.error(
      `[tempelTtdKskk] Anchor "MENGETAHUI"/"TANDA TANGAN" tidak ditemukan di ${doc.numPages} halaman -- kemungkinan PDF hasil scan tanpa layer teks. Jatuh ke koordinat tetap.`,
    );
    return null;
  } catch (e) {
    // Log teknis saja (pesan + nama error) -- TIDAK memuat isi PDF/data
    // korban (aturan keras #4). Dicetak ke stdout supaya kelihatan lewat
    // `docker compose logs app` kalau anchor gagal lagi di produksi.
    console.error(
      "[tempelTtdKskk] cariAnchorTeks gagal, jatuh ke koordinat tetap:",
      e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    );
    return null;
  }
}

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

    if (pages.length < 1) {
      return pdfBytes instanceof Uint8Array
        ? pdfBytes
        : new Uint8Array(pdfBytes);
    }

    // Anchor teks dulu; kalau gagal/timeout, jatuh ke halaman ke-2 (perilaku
    // lama) atau halaman terakhir kalau cuma satu halaman.
    const anchor = await denganBatasWaktu(
      cariAnchorTeks(pdfBytes),
      BATAS_WAKTU_ANCHOR_MS,
    ).catch(() => null);

    const halamanIndex = anchor?.halamanIndex ?? (pages.length >= 2 ? 1 : 0);
    if (halamanIndex >= pages.length) {
      return pdfBytes instanceof Uint8Array
        ? pdfBytes
        : new Uint8Array(pdfBytes);
    }
    const halaman = pages[halamanIndex];

    if (ttdPetugasSurvei?.gambar) {
      try {
        const img = await benamkanGambar(doc, ttdPetugasSurvei.gambar);
        const [x, y, lebarMaks, tinggiMaks] = anchor?.tandaTangan
          ? [
              anchor.tandaTangan.x + ANCHOR_PETUGAS_OFFSET_X,
              anchor.tandaTangan.y + ANCHOR_PETUGAS_OFFSET_Y,
              ANCHOR_PETUGAS_LEBAR_MAKS,
              ANCHOR_PETUGAS_TINGGI_MAKS,
            ]
          : [TTD_PETUGAS_X, TTD_PETUGAS_Y, TTD_PETUGAS_LEBAR_MAKS, TTD_PETUGAS_TINGGI_MAKS];

        const rasio = img.width / img.height;
        let lebar = lebarMaks;
        let tinggi = lebar / rasio;
        if (tinggi > tinggiMaks) {
          tinggi = tinggiMaks;
          lebar = tinggi * rasio;
        }
        halaman.drawImage(img, { x, y, width: lebar, height: tinggi });
      } catch {
        // Gambar rusak/tidak terbaca — biarkan area kosong, jangan gagalkan.
      }
    }

    // --- Tempel tanda tangan Kepala Cabang (kanan bawah MENGETAHUI) ---
    if (ttdKepalaCabang?.gambar) {
      try {
        const img = await benamkanGambar(doc, ttdKepalaCabang.gambar);
        const [x, y, lebarMaks, tinggiMaks] = anchor?.mengetahui
          ? [
              anchor.mengetahui.x + ANCHOR_KACAB_OFFSET_X,
              anchor.mengetahui.y - ANCHOR_KACAB_OFFSET_Y,
              ANCHOR_KACAB_LEBAR_MAKS,
              ANCHOR_KACAB_TINGGI_MAKS,
            ]
          : [TTD_KACAB_X, TTD_KACAB_Y, TTD_KACAB_LEBAR_MAKS, TTD_KACAB_TINGGI_MAKS];

        const rasio = img.width / img.height;
        let lebar = lebarMaks;
        let tinggi = lebar / rasio;
        if (tinggi > tinggiMaks) {
          tinggi = tinggiMaks;
          lebar = tinggi * rasio;
        }
        halaman.drawImage(img, { x, y, width: lebar, height: tinggi });
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
