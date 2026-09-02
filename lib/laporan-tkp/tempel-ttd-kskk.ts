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

// --- Fallback: koordinat tetap, dipakai kalau pencarian anchor teks gagal
// (mis. KSKK hasil scan tanpa layer teks, atau format di luar dugaan) ---
const TTD_PETUGAS_X = 85;
const TTD_PETUGAS_Y = 635;
const TTD_PETUGAS_LEBAR_MAKS = 110;
const TTD_PETUGAS_TINGGI_MAKS = 55;

const TTD_KACAB_X = 410;
const TTD_KACAB_Y = 711;
const TTD_KACAB_LEBAR_MAKS = 120;
const TTD_KACAB_TINGGI_MAKS = 55;

// --- Posisi berbasis anchor teks -- lihat cariAnchorTeks() di bawah.
// Kalibrasi diverifikasi visual terhadap docs/KSKK.pdf dan docs/KSKK-1.pdf
// (dua contoh nyata dari DASI-JR, layoutnya bergeser vertikal sampai 15pt
// antar-berkas tergantung panjang isi tabel data korban/uraian kejadian di
// atasnya -- makanya koordinat tetap sering meleset, dan anchor teks yang
// dipakai di sini).
//
// Kepala Cabang: anchor "MENGETAHUI", tanda tangan di ruang kosong antara
// teks itu dan nama Kepala Cabang di bawahnya (jaraknya lebar, ~90pt).
const ANCHOR_KACAB_OFFSET_X = -5;
const ANCHOR_KACAB_OFFSET_Y = 75; // turun dari baseline "MENGETAHUI"
const ANCHOR_KACAB_LEBAR_MAKS = 125;
const ANCHOR_KACAB_TINGGI_MAKS = 50;

// Petugas Survei/Mobile Service: anchor "TANDA TANGAN" TERKIRI (teks ini
// muncul dua kali di halaman -- kotak kiri berisi nama+jabatan staf, kotak
// tengah kosong/tidak dipakai, dipilih lewat X terkecil). Beda arah dari
// Kepala Cabang: ruang kosongnya di BAWAH label ini, bukan di atas --
// karena di atasnya langsung nempel alamat/jabatan tanpa jarak.
const ANCHOR_PETUGAS_OFFSET_X = 5;
const ANCHOR_PETUGAS_OFFSET_Y = -47; // turun dari baseline "TANDA TANGAN"
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

// Cari posisi teks "MENGETAHUI" (anchor Kepala Cabang) dan "TANDA TANGAN"
// terkiri (anchor Petugas Survei) lewat layer teks asli PDF -- bukan OCR,
// karena berkas KSKK dari DASI-JR punya teks asli yang bisa diekstrak
// (sudah dicek langsung terhadap contoh nyata). Null kalau PDF-nya tidak
// punya layer teks (mis. hasil scan gambar) atau anchor-nya tidak ketemu
// sama sekali -- pemanggil jatuh ke koordinat tetap sebagai fallback.
async function cariAnchorTeks(pdfBytes: Uint8Array | Buffer): Promise<HasilAnchor | null> {
  try {
    // pdfjs-dist menolak instance Buffer secara eksplisit walau
    // `Buffer instanceof Uint8Array` bernilai true di JS -- harus benar-benar
    // Uint8Array murni, jadi selalu dibungkus ulang tanpa syarat.
    // pdfjs-dist mendeteksi lingkungan Node otomatis dan menonaktifkan Web
    // Worker sendiri (jalan di thread utama) -- tidak perlu opsi tambahan.
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
    // Sampai sini berarti PDF-nya berhasil dibaca tapi anchor-nya benar-benar
    // tidak ada di teksnya -- kemungkinan KSKK hasil scan tanpa layer teks,
    // atau format di luar dugaan. Bukan galat, tapi worth dicatat supaya
    // beda dengan kasus "cariAnchorTeks error" di bawah saat men-diagnosis.
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
