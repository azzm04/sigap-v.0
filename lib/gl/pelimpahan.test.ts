import { describe, expect, it } from "vitest";
import { apakahLoketCabangValid, LOKET_CABANG, TAHAP_BELUM_LIMPAH } from "./pelimpahan";

describe("daftar loket cabang", () => {
  it("berisi 11 loket sesuai daftar dari pemilik proyek", () => {
    expect(LOKET_CABANG).toHaveLength(11);
  });

  it("tidak ada nama loket yang kembar", () => {
    expect(new Set(LOKET_CABANG).size).toBe(LOKET_CABANG.length);
  });

  it("menerima setiap loket di daftar", () => {
    for (const loket of LOKET_CABANG) {
      expect(apakahLoketCabangValid(loket)).toBe(true);
    }
  });

  it("menolak loket di luar daftar -- jaring pengaman server action", () => {
    expect(apakahLoketCabangValid("LOKET KANTOR CABANG BANDUNG")).toBe(false);
    expect(apakahLoketCabangValid("")).toBe(false);
  });

  it("menolak yang beda huruf besar-kecil atau berspasi lebih, bukan diam-diam diterima", () => {
    expect(apakahLoketCabangValid("loket kantor cabang pati")).toBe(false);
    expect(apakahLoketCabangValid(" LOKET KANTOR CABANG PATI ")).toBe(false);
  });
});

describe("tahap pelimpahan", () => {
  it("namanya persis seperti yang tampil di dropdown dan halaman Pelimpahan", () => {
    expect(TAHAP_BELUM_LIMPAH).toBe("Berkas Belum Di Limpah");
  });
});
