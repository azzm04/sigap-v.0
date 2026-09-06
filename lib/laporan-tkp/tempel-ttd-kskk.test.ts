import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { tempelTtdKskk } from "./tempel-ttd-kskk";

// Uji integrasi opsional terhadap contoh KSKK nyata, kalau tersedia di
// mesin pengembangan (berkas berisi data pribadi korban, tidak masuk git
// -- lihat .gitignore). Dilewati otomatis kalau berkasnya tidak ada,
// termasuk di CI. Sama pola dengan sumber-impor.test.ts.
const KSKK_NYATA = join(__dirname, "..", "..", "docs", "KSKK.pdf");
// Contoh KSKK 2 halaman (blok tanda tangan meluber ke halaman baru karena
// tabel Data Korban-nya 2 baris) -- lihat catatan CLAUDE.md soal bug lama
// yang asumsi selalu pages[1].
const KSKK_2_HALAMAN = join(__dirname, "..", "..", "docs", "MUHAMMAD RIZKY PUTRA 1.pdf");
const LOGO_UJI = join(__dirname, "..", "..", "public", "Logo.png");

const ttdContoh = {
  id: 1,
  pemilik: "__uji__",
  gambar: `data:image/png;base64,${readFileSync(LOGO_UJI).toString("base64")}`,
  namaTampil: "Contoh",
  jabatan: "Contoh",
  diperbaruiPada: new Date(),
};

describe.skipIf(!existsSync(KSKK_NYATA))("tempelTtdKskk (berkas nyata)", () => {
  it("benar-benar menempel gambar (bukan cuma lolos tanpa error)", async () => {
    const asli = readFileSync(KSKK_NYATA);
    const hasil = await tempelTtdKskk(asli, ttdContoh, ttdContoh);

    // Ukuran berkas harus membesar signifikan kalau gambar benar tertanam --
    // ini yang gagal senyap sebelumnya (pages.length < 2 selalu true untuk
    // KSKK 1 halaman, jadi hasilnya = berkas asli tanpa perubahan).
    expect(hasil.length).toBeGreaterThan(asli.length * 2);

    // Dan hasilnya harus tetap PDF yang valid, bisa dibuka ulang.
    const dokumenHasil = await PDFDocument.load(hasil);
    expect(dokumenHasil.getPageCount()).toBe(1);
  });

  it("mengembalikan berkas asli tanpa error kalau tidak ada tanda tangan yang diisi", async () => {
    const asli = readFileSync(KSKK_NYATA);
    const hasil = await tempelTtdKskk(asli, null, null);
    expect(hasil.length).toBe(asli.length);
  });
});

describe.skipIf(!existsSync(KSKK_2_HALAMAN))("tempelTtdKskk (berkas nyata, 2 halaman)", () => {
  it("menempel di halaman TERAKHIR (bukan asumsi pages[1] yang kebetulan sama)", async () => {
    const asli = readFileSync(KSKK_2_HALAMAN);
    const hasil = await tempelTtdKskk(asli, ttdContoh, ttdContoh);

    expect(hasil.length).toBeGreaterThan(asli.length * 2);

    const dokumenHasil = await PDFDocument.load(hasil);
    expect(dokumenHasil.getPageCount()).toBe(2);
  });
});
