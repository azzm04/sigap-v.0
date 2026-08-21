import { describe, expect, it } from "vitest";
import { hitungStagnasi } from "./stagnasi";

const HARI_INI = new Date();

function hariLalu(n: number): Date {
  const d = new Date(HARI_INI);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function tglGlHariLalu(n: number): string {
  const d = hariLalu(n);
  return d.toISOString().slice(0, 10);
}

describe("hitungStagnasi", () => {
  it("jatuh ke umur kalau baru ada satu snapshot baseline", () => {
    const hasil = hitungStagnasi([{ tahapan: "Verifikasi User", direkamPada: hariLalu(5) }], tglGlHariLalu(30));

    expect(hasil.berdasarkanUmur).toBe(true);
    expect(hasil.hariDiTahapan).toBe(30);
  });

  it("jatuh ke umur kalau tahapan tidak pernah berubah walau ada beberapa snapshot", () => {
    // Snapshot kedua ada karena status_pembayaran berubah, bukan tahapan.
    const riwayat = [
      { tahapan: "Done", direkamPada: hariLalu(10) },
      { tahapan: "Done", direkamPada: hariLalu(3) },
    ];
    const hasil = hitungStagnasi(riwayat, tglGlHariLalu(40));

    expect(hasil.berdasarkanUmur).toBe(true);
    expect(hasil.hariDiTahapan).toBe(40);
  });

  it("menghitung stagnasi sungguhan saat ada transisi tahapan", () => {
    const riwayat = [
      { tahapan: "Penerimaan GL", direkamPada: hariLalu(20) },
      { tahapan: "Verifikasi User", direkamPada: hariLalu(8) },
    ];
    const hasil = hitungStagnasi(riwayat, tglGlHariLalu(25));

    expect(hasil.berdasarkanUmur).toBe(false);
    expect(hasil.hariDiTahapan).toBe(8);
  });

  it("memakai transisi TERAKHIR, bukan yang pertama", () => {
    const riwayat = [
      { tahapan: "Penerimaan GL", direkamPada: hariLalu(30) },
      { tahapan: "Surat Kuasa", direkamPada: hariLalu(20) },
      { tahapan: "Verifikasi User", direkamPada: hariLalu(6) },
    ];
    const hasil = hitungStagnasi(riwayat, tglGlHariLalu(35));

    expect(hasil.berdasarkanUmur).toBe(false);
    expect(hasil.hariDiTahapan).toBe(6);
  });

  it("tidak keliru oleh baris yang tahapannya sama tapi diselingi baris lain", () => {
    // A -> B -> B (perubahan kedua cuma status_verifikasi, tahapan tetap B)
    const riwayat = [
      { tahapan: "Penerimaan GL", direkamPada: hariLalu(15) },
      { tahapan: "Done", direkamPada: hariLalu(9) },
      { tahapan: "Done", direkamPada: hariLalu(2) },
    ];
    const hasil = hitungStagnasi(riwayat, tglGlHariLalu(20));

    expect(hasil.berdasarkanUmur).toBe(false);
    expect(hasil.hariDiTahapan).toBe(9);
  });
});
