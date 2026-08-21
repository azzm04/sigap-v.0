import { describe, expect, it } from "vitest";
import { apakahPerluMengingatkan } from "./pengingat-impor";

const SEKARANG = new Date(Date.UTC(2026, 7, 21)); // 21 Agustus 2026

function hariLalu(n: number): Date {
  return new Date(Date.UTC(2026, 7, 21 - n));
}

describe("apakahPerluMengingatkan", () => {
  it("mengingatkan kalau belum pernah ada impor sama sekali", () => {
    expect(apakahPerluMengingatkan(null, 2, SEKARANG)).toBe(true);
  });

  it("tidak mengingatkan kalau impor terakhir masih dalam ambang", () => {
    expect(apakahPerluMengingatkan(hariLalu(1), 2, SEKARANG)).toBe(false);
  });

  it("mengingatkan tepat di batas ambang (>=, bukan >)", () => {
    expect(apakahPerluMengingatkan(hariLalu(2), 2, SEKARANG)).toBe(true);
  });

  it("mengingatkan kalau sudah jauh melewati ambang", () => {
    expect(apakahPerluMengingatkan(hariLalu(10), 2, SEKARANG)).toBe(true);
  });

  it("menghormati ambang yang bisa diubah", () => {
    expect(apakahPerluMengingatkan(hariLalu(4), 5, SEKARANG)).toBe(false);
    expect(apakahPerluMengingatkan(hariLalu(5), 5, SEKARANG)).toBe(true);
  });

  it("tidak mengingatkan kalau impor baru saja terjadi hari ini", () => {
    expect(apakahPerluMengingatkan(SEKARANG, 2, SEKARANG)).toBe(false);
  });
});
