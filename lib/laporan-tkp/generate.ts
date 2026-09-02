import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { formatTanggal } from "../format";
import type { BarisTandaTangan } from "./tanda-tangan";

export interface DataLaporanTkp {
  // Diisi manual petugas
  nomorLp: string;
  alamatKorban: string;
  uraianKesimpulan: string;
  namaSaksi: string;
  ttdSaksi: string | null;
  // Otomatis dari detail GL
  namaKorban: string;
  namaPetugasSurvei: string; // Tetap, dari Pengaturan (PEMILIK_PETUGAS_SURVEI) -- bukan per-PIC
  lokasi: string;
  /** null kalau Tgl LAKA (DASI) maupun Tanggal Masuk belum ada -- PDF cuma memuat tempatnya */
  tglKejadian: string | null;
  tanggalSurvei: string; 
  // Tanda tangan, null kalau belum diunggah di Pengaturan
  ttdKepalaCabang: BarisTandaTangan | null;
  ttdPetugasSurvei: BarisTandaTangan | null;
}

const MARGIN = 50;
const LEBAR_HALAMAN = 595.28;
const TINGGI_HALAMAN = 841.89;
const LEBAR_ISI = LEBAR_HALAMAN - MARGIN * 2;

// Ukuran dasar seluruh dokumen, sesuai referensi asli "LHS TKP.pdf" --
// font Arial size 7,5, TERMASUK judul "LAPORAN HASIL SURVEI" (tidak bold, tidak diperbesar seperti versi sebelumnya). 
// pdf-lib tidak menyediakan Arial sebagai salah satu dari 14 font standarnya (lisensinya bukan milik Adobe/font dasar PDF) -- Helvetica dipakai sebagai pengganti karena
// secara visual nyaris identik dan bebas lisensi. Kalau suatu saat perlu
// Arial asli, perlu file .ttf (mis. Arimo/Liberation Sans, metric-compatible)
// untuk di-embed lewat fontkit -- belum dilakukan di sini.
const UKURAN_DASAR = 7.5;

function bungkusTeks(font: PDFFont, teks: string, ukuran: number, maxLebar: number): string[] {
  const kata = teks.split(/\s+/).filter(Boolean);
  const baris: string[] = [];
  let sekarang = "";

  for (const kata_ of kata) {
    const coba = sekarang ? `${sekarang} ${kata_}` : kata_;
    if (font.widthOfTextAtSize(coba, ukuran) > maxLebar && sekarang) {
      baris.push(sekarang);
      sekarang = kata_;
    } else {
      sekarang = coba;
    }
  }
  if (sekarang) baris.push(sekarang);
  return baris.length > 0 ? baris : [""];
}

const BATAS_WAKTU_EMBED_MS = 5000;

// Decoder gambar (khususnya PNG lewat zlib inflate) pada beberapa berkas
// rusak/tidak lengkap bisa hang tanpa pernah throw -- pernah terjadi saat
// pengujian dengan data base64 acak. Dibungkus batas waktu supaya satu
// gambar tanda tangan yang korup tidak menggantung seluruh permintaan unduh PDF selamanya.
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

// TTD Saksi diunggah per-laporan dan boleh PNG/JPEG ATAUPUN PDF (beda dari
// ttdKepalaCabang/ttdPetugasSurvei yang selalu gambar tetap per pemilik lihat app/gl/[idJaminan]/actions.ts). 
// PDF butuh jalur embed berbeda (embedPdf + drawPage, bukan embedPng/Jpg + drawImage), makanya dipisah dari benamkanGambar dan menggambar sendiri ke dalam sel tabel.
async function gambarTtdSaksi(
  doc: PDFDocument,
  page: PDFPage,
  dataUri: string,
  x: number,
  y: number,
  lebarSel: number,
  tinggiSel: number,
) {
  const [meta, base64] = dataUri.split(",");
  const bytes = Buffer.from(base64, "base64");

  try {
    if (meta.includes("application/pdf")) {
      const [embedded] = await denganBatasWaktu(doc.embedPdf(bytes), BATAS_WAKTU_EMBED_MS);
      const rasio = embedded.width / embedded.height;
      let tinggi = tinggiSel;
      let lebar = tinggi * rasio;
      if (lebar > lebarSel) {
        lebar = lebarSel;
        tinggi = lebar / rasio;
      }
      page.drawPage(embedded, {
        x: x + (lebarSel - lebar) / 2,
        y: y + (tinggiSel - tinggi) / 2,
        width: lebar,
        height: tinggi,
      });
    } else {
      const img = await benamkanGambar(doc, dataUri);
      const rasio = img.width / img.height;
      let tinggi = tinggiSel;
      let lebar = tinggi * rasio;
      if (lebar > lebarSel) {
        lebar = lebarSel;
        tinggi = lebar / rasio;
      }
      page.drawImage(img, {
        x: x + (lebarSel - lebar) / 2,
        y: y + (tinggiSel - tinggi) / 2,
        width: lebar,
        height: tinggi,
      });
    }
  } catch {
    // Berkas rusak/tidak terbaca/timeout -- biarkan sel tanda tangan kosong, jangan gagalkan seluruh PDF.
  }
}

async function gambarBlokTandaTangan(
  doc: PDFDocument,
  page: PDFPage,
  x: number,
  yLabel: number,
  ttd: BarisTandaTangan | null,
  fallbackNama: string,
  font: PDFFont,
) {
  const lebarBlok = 220;

  if (ttd?.gambar) {
    try {
      const img = await benamkanGambar(doc, ttd.gambar);
      const rasio = img.width / img.height;
      let tinggiGambar = 55;
      let lebarGambar = tinggiGambar * rasio;
      if (lebarGambar > lebarBlok) {
        lebarGambar = lebarBlok;
        tinggiGambar = lebarGambar / rasio;
      }
      page.drawImage(img, { x, y: yLabel - 70, width: lebarGambar, height: tinggiGambar });
    } catch {
      // Gambar rusak/tidak terbaca -- biarkan area kosong, jangan gagalkan seluruh PDF.
    }
  }

  const namaTampil = ttd?.namaTampil?.trim() || fallbackNama;
  page.drawText(namaTampil, { x, y: yLabel - 82, size: UKURAN_DASAR, font });
  if (ttd?.jabatan) {
    page.drawText(ttd.jabatan, { x, y: yLabel - 93, size: UKURAN_DASAR, font });
  }
}

export async function generateLaporanSurveiTkpPdf(data: DataLaporanTkp): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([LEBAR_HALAMAN, TINGGI_HALAMAN]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontTebal = await doc.embedFont(StandardFonts.HelveticaBold);

  const X_KANAN = MARGIN + 270;
  let y = TINGGI_HALAMAN - 50;

  // --- Kop --- (mengikuti referensi asli "LHS TKP.pdf", bukan letterhead lama)
  page.drawText("PT JASA RAHARJA (Persero)", { x: MARGIN, y, size: UKURAN_DASAR, font });
  y -= 11;
  page.drawText("0400601 - CABANG SEMARANG", { x: MARGIN, y, size: UKURAN_DASAR, font });
  y -= 28;

  // --- Judul --- (TIDAK bold, ukuran sama dengan seluruh dokumen -- sesuai referensi asli)
  const judul = "LAPORAN HASIL SURVEI";
  page.drawText(judul, {
    x: (LEBAR_HALAMAN - fontTebal.widthOfTextAtSize(judul, UKURAN_DASAR)) / 2,
    y,
    size: UKURAN_DASAR,
    font,
  });
  y -= 11;
  const nomorPl = `No. PL ${data.nomorLp}`;
  page.drawText(nomorPl, {
    x: (LEBAR_HALAMAN - font.widthOfTextAtSize(nomorPl, UKURAN_DASAR)) / 2,
    y,
    size: UKURAN_DASAR,
    font,
  });
  y -= 22;

  // --- Blok field 2 kolom ---
  page.drawText(`Hari/Tanggal Survei : ${formatTanggal(data.tanggalSurvei)}`, {
    x: MARGIN,
    y,
    size: UKURAN_DASAR,
    font,
  });
  page.drawText(`Petugas Survei : ${data.namaPetugasSurvei}`, { x: X_KANAN, y, size: UKURAN_DASAR, font });
  y -= 13;

  page.drawText("Jenis Survei : TKP / AW / KASUS", { x: MARGIN, y, size: UKURAN_DASAR, font });
  page.drawText("No. Berkas :", { x: X_KANAN, y, size: UKURAN_DASAR, font });
  y -= 13;

  page.drawText(`Nama Korban : ${data.namaKorban}`, { x: MARGIN, y, size: UKURAN_DASAR, font });
  page.drawText("No. HP :", { x: X_KANAN, y, size: UKURAN_DASAR, font });
  y -= 13;

  // --- Alamat Korban (bisa lebih dari satu baris) ---
  const barisAlamat = bungkusTeks(font, `Alamat Korban : ${data.alamatKorban}`, UKURAN_DASAR, LEBAR_ISI);
  barisAlamat.forEach((baris, i) => {
    page.drawText(baris, { x: MARGIN, y: y - i * 10, size: UKURAN_DASAR, font });
  });
  y -= 10 * barisAlamat.length + 11;

  // --- Tempat/Tgl. Kecelakaan ---
  // Tanpa Tgl LAKA, baris ini cuma memuat tempat -- jangan tulis koma
  // menggantung atau tanggal kosong yang membingungkan pembaca dokumen.
  const tempatTgl = data.tglKejadian
    ? `Tempat/Tgl. Kecelakaan : ${data.lokasi}, ${formatTanggal(data.tglKejadian)}`
    : `Tempat/Tgl. Kecelakaan : ${data.lokasi}`;
  const barisTempat = bungkusTeks(font, tempatTgl, UKURAN_DASAR, LEBAR_ISI);
  barisTempat.forEach((baris, i) => {
    page.drawText(baris, { x: MARGIN, y: y - i * 10, size: UKURAN_DASAR, font });
  });
  y -= 10 * barisTempat.length + 13;

  // --- Sumber Informasi (tabel 2 baris: 1 diisi Nama Saksi + TTD-nya, 1 kosong) ---
  page.drawText("Sumber Informasi :", { x: MARGIN, y, size: UKURAN_DASAR, font });
  y -= 11;

  // tinggiBarisTabel dan lebarKolomTtd sengaja diperbesar dari nilai awal
  // (32 dan 90) -- tanda tangan saksi yang ter-embed kelihatan terlalu
  // kecil dibanding sel tabelnya, arahan pemilik proyek supaya diperbesar.
  const tinggiBarisTabel = 44;
  const lebarKolomNo = 24;
  const lebarKolomTtd = 110;
  const lebarKolomIsi = LEBAR_ISI - lebarKolomNo - lebarKolomTtd;
  const tinggiHeaderTabel = 14;
  const yAtasTabel = y;
  const yBawahTabel = y - tinggiHeaderTabel - tinggiBarisTabel * 2;

  page.drawRectangle({
    x: MARGIN,
    y: yBawahTabel,
    width: LEBAR_ISI,
    height: yAtasTabel - yBawahTabel,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yAtasTabel - tinggiHeaderTabel },
    end: { x: MARGIN + LEBAR_ISI, y: yAtasTabel - tinggiHeaderTabel },
    thickness: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yAtasTabel - tinggiHeaderTabel - tinggiBarisTabel },
    end: { x: MARGIN + LEBAR_ISI, y: yAtasTabel - tinggiHeaderTabel - tinggiBarisTabel },
    thickness: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN + lebarKolomNo, y: yAtasTabel },
    end: { x: MARGIN + lebarKolomNo, y: yBawahTabel },
    thickness: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN + lebarKolomNo + lebarKolomIsi, y: yAtasTabel },
    end: { x: MARGIN + lebarKolomNo + lebarKolomIsi, y: yBawahTabel },
    thickness: 0.8,
  });
  page.drawText("No.", { x: MARGIN + 6, y: yAtasTabel - 10, size: UKURAN_DASAR, font: fontTebal });
  page.drawText("Identitas/Detail Sumber Informasi dan Metode Perolehan Informasi", {
    x: MARGIN + lebarKolomNo + 6,
    y: yAtasTabel - 10,
    size: UKURAN_DASAR,
    font: fontTebal,
  });
  page.drawText("Tanda Tangan", {
    x: MARGIN + lebarKolomNo + lebarKolomIsi + 12,
    y: yAtasTabel - 10,
    size: UKURAN_DASAR,
    font: fontTebal,
  });

  const yBaris1 = yAtasTabel - tinggiHeaderTabel;
  const yBaris2 = yBaris1 - tinggiBarisTabel;
  page.drawText("1.", { x: MARGIN + 6, y: yBaris1 - 12, size: UKURAN_DASAR, font });
  page.drawText(data.namaSaksi, { x: MARGIN + lebarKolomNo + 6, y: yBaris1 - 12, size: UKURAN_DASAR, font });
  page.drawText("2.", { x: MARGIN + 6, y: yBaris2 - 12, size: UKURAN_DASAR, font });

  if (data.ttdSaksi) {
    await gambarTtdSaksi(
      doc,
      page,
      data.ttdSaksi,
      MARGIN + lebarKolomNo + lebarKolomIsi + 4,
      yBaris1 - tinggiBarisTabel + 4,
      lebarKolomTtd - 8,
      tinggiBarisTabel - 8,
    );
  }

  y = yBawahTabel - 15;

  // --- Uraian dan Kesimpulan Hasil Survei ---
  page.drawText("Uraian dan Kesimpulan Hasil Survei :", { x: MARGIN, y, size: UKURAN_DASAR, font });
  y -= 11;

  const barisUraian = bungkusTeks(font, data.uraianKesimpulan, UKURAN_DASAR, LEBAR_ISI - 16);
  // Kotak diperbesar sampai memenuhi sisa halaman (bukan tinggi tetap kecil
  // seperti sebelumnya) -- sesuai dokumen asli yang menyediakan ruang tulis
  // tangan yang luas. RUANG_BAWAH = jarak sebelum kotak (19) + blok tanda
  // tangan (105) + baris "Dokumentasi :" (~15) yang masih harus muat di
  // bawah kotak ini. Kalau uraian sangat panjang, kotak tetap mengikuti
  // panjang teksnya (bisa mendorong tanda tangan turun) -- dokumen ini
  // selalu satu halaman, belum ada penanganan luber ke halaman berikutnya.
  const RUANG_BAWAH_SETELAH_URAIAN = 19 + 105 + 15;
  const tinggiKotakUraianMinimal = barisUraian.length * 10 + 16;
  const tinggiKotakUraian = Math.max(
    tinggiKotakUraianMinimal,
    y - MARGIN - RUANG_BAWAH_SETELAH_URAIAN,
  );
  page.drawRectangle({
    x: MARGIN,
    y: y - tinggiKotakUraian,
    width: LEBAR_ISI,
    height: tinggiKotakUraian,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
  });
  barisUraian.forEach((baris, i) => {
    page.drawText(baris, { x: MARGIN + 8, y: y - 12 - i * 10, size: UKURAN_DASAR, font });
  });
  y -= tinggiKotakUraian + 19;

  // --- Tanda tangan ---
  page.drawText("Mengetahui,", { x: MARGIN + 20, y, size: UKURAN_DASAR, font });
  page.drawText("Petugas Survei", { x: MARGIN + 300, y, size: UKURAN_DASAR, font });

  await gambarBlokTandaTangan(doc, page, MARGIN + 20, y, data.ttdKepalaCabang, "-", font);
  await gambarBlokTandaTangan(
    doc,
    page,
    MARGIN + 300,
    y,
    data.ttdPetugasSurvei,
    data.namaPetugasSurvei,
    font,
  );

  y -= 105;

  // --- Dokumentasi (label statis, belum ada fitur lampiran foto) ---
  page.drawText("Dokumentasi :", { x: MARGIN, y, size: UKURAN_DASAR, font });

  return doc.save();
}
