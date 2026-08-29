import { describe, expect, it } from "vitest";
import {
  apakahMasukPeringatanTaskForce,
  type DataAturanTaskForce,
} from "./aturan-peringatan-task-force";

const AMBANG = 14;

function baris(override: Partial<DataAturanTaskForce> = {}): DataAturanTaskForce {
  return {
    tipeKlaim: "GL",
    glStatus: "Active",
    tahapan: "Penerimaan GL",
    tanggalPulangPasien: null,
    lokasi: null,
    umurSejakMasuk: 20,
    ...override,
  };
}

describe("apakahMasukPeringatanTaskForce", () => {
  it("masuk peringatan kalau umur (dari tanggal acuan manapun) sudah lewat ambang dan Tanggal Pulang Pasien kosong", () => {
    expect(apakahMasukPeringatanTaskForce(baris(), AMBANG)).toBe(true);
  });

  it("masuk peringatan kalau cuma Lokasi LAKA yang kosong (Tanggal Pulang Pasien sudah terisi)", () => {
    expect(
      apakahMasukPeringatanTaskForce(
        baris({ tanggalPulangPasien: "2026-01-10", lokasi: null }),
        AMBANG,
      ),
    ).toBe(true);
  });

  it("masuk peringatan kalau cuma Tanggal Pulang Pasien yang kosong (Lokasi LAKA sudah terisi)", () => {
    expect(
      apakahMasukPeringatanTaskForce(
        baris({ tanggalPulangPasien: null, lokasi: "Jl. Contoh" }),
        AMBANG,
      ),
    ).toBe(true);
  });

  it("tidak masuk kalau Tanggal Pulang Pasien DAN Lokasi LAKA sudah dua-duanya terisi", () => {
    expect(
      apakahMasukPeringatanTaskForce(
        baris({ tanggalPulangPasien: "2026-01-10", lokasi: "Jl. Contoh" }),
        AMBANG,
      ),
    ).toBe(false);
  });

  it("tidak masuk kalau tahapan sudah Verifikasi User -- giliran Peringatan PIC Pengajuan", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ tahapan: "Verifikasi User" }), AMBANG)).toBe(
      false,
    );
  });

  it("tidak masuk kalau tahapan sudah Done", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ tahapan: "Done" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau tipe_klaim bukan GL (Reimbursement)", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ tipeKlaim: "Reimbursement" }), AMBANG)).toBe(
      false,
    );
  });

  it("tidak masuk kalau gl_status Cancel", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ glStatus: "Cancel" }), AMBANG)).toBe(false);
  });

  it("tidak masuk kalau umur sejak masuk di bawah ambang", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ umurSejakMasuk: 13 }), 14)).toBe(false);
  });

  it("masuk tepat di batas ambang (>=, bukan >)", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ umurSejakMasuk: 14 }), 14)).toBe(true);
  });

  it("menghormati ambang yang bisa diubah, bukan angka tetap 14", () => {
    expect(apakahMasukPeringatanTaskForce(baris({ umurSejakMasuk: 5 }), 3)).toBe(true);
    expect(apakahMasukPeringatanTaskForce(baris({ umurSejakMasuk: 2 }), 3)).toBe(false);
  });
});
