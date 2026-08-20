import { describe, expect, it } from "vitest";
import { apakahMasukPeringatan, type DataAturanPeringatan } from "./aturan-peringatan";

const AMBANG = 14;

function baris(override: Partial<DataAturanPeringatan> = {}): DataAturanPeringatan {
  return {
    tipeKlaim: "GL",
    glStatus: "Active",
    statusPembayaran: "Unpaid",
    tahapan: "Verifikasi User",
    umurHari: 20,
    ...override,
  };
}

describe("apakahMasukPeringatan", () => {
  it("masuk peringatan kalau semua syarat terpenuhi, tahapan Verifikasi User", () => {
    expect(apakahMasukPeringatan(baris({ tahapan: "Verifikasi User" }), AMBANG)).toBe(true);
  });

  it("masuk peringatan kalau semua syarat terpenuhi, tahapan Done", () => {
    expect(apakahMasukPeringatan(baris({ tahapan: "Done" }), AMBANG)).toBe(true);
  });

  it("tidak masuk kalau tipe_klaim bukan GL (Reimbursement)", () => {
    expect(apakahMasukPeringatan(baris({ tipeKlaim: "Reimbursement" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau gl_status Cancel, walau syarat lain terpenuhi", () => {
    expect(apakahMasukPeringatan(baris({ glStatus: "Cancel" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau status_pembayaran Paid — ini inti aturannya", () => {
    expect(apakahMasukPeringatan(baris({ statusPembayaran: "Paid" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau tahapan di luar Verifikasi User / Done", () => {
    expect(apakahMasukPeringatan(baris({ tahapan: "Penerimaan GL" }), AMBANG)).toBe(false);
    expect(apakahMasukPeringatan(baris({ tahapan: "Surat Kuasa" }), AMBANG)).toBe(false);
    expect(apakahMasukPeringatan(baris({ tahapan: "Pengajuan Claim" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau umur di bawah ambang", () => {
    expect(apakahMasukPeringatan(baris({ umurHari: 13 }), 14)).toBe(false);
  });

  it("masuk tepat di batas ambang (>=, bukan >)", () => {
    expect(apakahMasukPeringatan(baris({ umurHari: 14 }), 14)).toBe(true);
  });

  it("menghormati ambang yang bisa diubah, bukan angka tetap 14", () => {
    expect(apakahMasukPeringatan(baris({ umurHari: 5 }), 3)).toBe(true);
    expect(apakahMasukPeringatan(baris({ umurHari: 2 }), 3)).toBe(false);
  });

  it("Done tetap masuk peringatan walau tahapannya sudah 'selesai', asal belum dibayar", () => {
    expect(
      apakahMasukPeringatan({ ...baris({ tahapan: "Done" }), statusPembayaran: "Unpaid" }, AMBANG),
    ).toBe(true);
  });
});
