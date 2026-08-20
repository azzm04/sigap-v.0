import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { GalatValidasiImpor, parseBerkasEkspor } from "./sumber-impor";

const HEADER_ROW = [
  "Tipe Klaim",
  "Tipe Cidera",
  "Nama Rumah Sakit",
  "Loket",
  "Nomor ID Jaminan",
  "Nama Korban",
  "Nomor Surat Jaminan",
  "Tgl GL",
  "GL Status",
  "Tahapan",
  "Tgl Diajukan",
  "Status Verifikasi",
  "Nilai Diajukan",
  "Nilai Disetujui",
  "Tgl Verifikasi",
  "Status Pembayaran",
  "Jumlah Pembayaran",
  "Tgl Pembayaran",
];

function blokFilter(): unknown[][] {
  return [
    ["KLAIM REPORT"],
    [],
    ["Tipe Klaim : ", "GL"],
    ["Tipe Cidera : ", "-"],
    ["Nama Rumah Sakit : ", "-"],
    ["Loket : ", "-"],
    ["Tanggal Surat Jaminan : ", "-"],
    ["Tahapan : ", "-"],
    ["Status Verifikasi : ", "-"],
    ["Tgl Pembayaran : ", "-"],
    ["Status Pembayaran : ", "-"],
    ["Username : ", "JRCare"],
    ["Search : ", "-"],
    [],
  ];
}

// Meniru berkas nyata: "Total Data Klaim" muncul di kolom ke-17 (indeks 16),
// bukan kolom pertama, dan angkanya boleh tidak sama dengan jumlah baris riil.
function barisTotal(jumlah = 999): unknown[] {
  const baris = new Array(18).fill(null);
  baris[16] = "Total Data Klaim";
  baris[17] = jumlah;
  return baris;
}

function buatBuffer(barisData: unknown[][], opsi?: { tanpaTotal?: boolean }): Buffer {
  const rows: unknown[][] = [...blokFilter(), HEADER_ROW, ...barisData];
  if (!opsi?.tanpaTotal) {
    rows.push([]); // baris kosong tepat sebelum baris total, seperti berkas nyata
    rows.push(barisTotal());
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Klaim Report");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const BARIS_LENGKAP: unknown[] = [
  "GL",
  "LL",
  "RSUD TUGUREJO, KOTA SEMARANG",
  "LOKET CABANG SEMARANG",
  "04062026001925.0826.mSh7",
  "Contoh Nama",
  "-",
  "02-04-2026",
  "Active",
  "Penerimaan GL",
  "-",
  "New",
  "23526570",
  "16348322",
  "-",
  "Unpaid",
  "0",
  "-",
];

describe("parseBerkasEkspor", () => {
  it("mem-parse berkas berstruktur standar dengan benar", () => {
    const buffer = buatBuffer([BARIS_LENGKAP]);
    const hasil = parseBerkasEkspor(buffer);

    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toMatchObject({
      tipeKlaim: "GL",
      idJaminan: "04062026001925.0826.mSh7",
      tglGl: "2026-04-02",
      glStatus: "Active",
      tahapan: "Penerimaan GL",
      tglDiajukan: null,
      statusVerifikasi: "New",
      nilaiDiajukan: 23526570,
      nilaiDisetujui: 16348322,
      tglVerifikasi: null,
      statusPembayaran: "Unpaid",
      jumlahPembayaran: 0,
      tglPembayaran: null,
      nomorSuratJaminan: null,
    });
  });

  it("tidak keliru mengira blok filter sebagai baris header", () => {
    // Blok filter menulis "Tipe Klaim : " (pakai titik dua) — pencocokan
    // persis terhadap "Tipe Klaim" harus tetap menemukan header di baris 15.
    const buffer = buatBuffer([BARIS_LENGKAP]);
    expect(() => parseBerkasEkspor(buffer)).not.toThrow();
  });

  it("melewati baris kosong di tengah data tanpa menghentikan proses", () => {
    const barisKosong = new Array(18).fill(null);
    const buffer = buatBuffer([BARIS_LENGKAP, barisKosong, BARIS_LENGKAP]);
    const hasil = parseBerkasEkspor(buffer);
    expect(hasil).toHaveLength(2);
  });

  it("membuang baris Total Data Klaim walau tidak di kolom pertama", () => {
    const buffer = buatBuffer([BARIS_LENGKAP]);
    const hasil = parseBerkasEkspor(buffer);
    expect(hasil).toHaveLength(1);
    expect(hasil.some((b) => Object.values(b).includes("Total Data Klaim"))).toBe(false);
  });

  it("menerima angka bertipe number asli maupun teks tanpa pemisah ribuan", () => {
    const barisAngkaAsli = [...BARIS_LENGKAP];
    barisAngkaAsli[12] = 23526570; // Nilai Diajukan sebagai number asli
    barisAngkaAsli[13] = 16348322; // Nilai Disetujui sebagai number asli

    const buffer = buatBuffer([BARIS_LENGKAP, barisAngkaAsli]);
    const hasil = parseBerkasEkspor(buffer);

    expect(hasil[0].nilaiDiajukan).toBe(23526570);
    expect(hasil[1].nilaiDiajukan).toBe(23526570);
    expect(hasil[1].nilaiDisetujui).toBe(16348322);
  });

  it("mengisi Nomor Surat Jaminan saat terisi, null saat '-'", () => {
    const barisTerisi = [...BARIS_LENGKAP];
    barisTerisi[6] = "PL/0000000001/123/26";
    const buffer = buatBuffer([barisTerisi]);
    const hasil = parseBerkasEkspor(buffer);
    expect(hasil[0].nomorSuratJaminan).toBe("PL/0000000001/123/26");
  });

  it("menolak berkas yang tidak punya baris header", () => {
    const ws = XLSX.utils.aoa_to_sheet([["Bukan berkas ekspor GL"], ["baris lain"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("menolak berkas dengan kolom wajib yang hilang", () => {
    const headerKurang = HEADER_ROW.filter((h) => h !== "Status Verifikasi");
    const rows = [...blokFilter(), headerKurang, BARIS_LENGKAP.slice(0, -1)];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Klaim Report");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    try {
      parseBerkasEkspor(buffer);
      expect.unreachable("harusnya melempar GalatValidasiImpor");
    } catch (err) {
      expect(err).toBeInstanceOf(GalatValidasiImpor);
      expect((err as GalatValidasiImpor).masalah[0]).toContain("Status Verifikasi");
    }
  });

  it("menolak baris dengan tanggal yang tidak valid", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[7] = "31-02-2026"; // tanggal tidak ada di kalender
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("menolak baris dengan Tgl GL berformat bukan DD-MM-YYYY", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[7] = "2026-04-02"; // format YYYY-MM-DD, bukan DD-MM-YYYY
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("menolak baris dengan Nomor ID Jaminan kosong", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[4] = "-";
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("menolak berkas berisi nilai bukan angka pada kolom nilai", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[12] = "abc";
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("tidak menyimpan data separuh: satu baris salah membatalkan seluruh berkas", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[4] = "-"; // ID Jaminan kosong pada baris kedua
    const buffer = buatBuffer([BARIS_LENGKAP, barisSalah]);

    expect(() => parseBerkasEkspor(buffer)).toThrow(GalatValidasiImpor);
  });

  it("tetap memproses baris GL Status Cancel dan Tipe Klaim Reimbursement apa adanya", () => {
    const barisCancel = [...BARIS_LENGKAP];
    barisCancel[8] = "Cancel";
    const barisReimbursement = [...BARIS_LENGKAP];
    barisReimbursement[0] = "Reimbursement";

    const buffer = buatBuffer([barisCancel, barisReimbursement]);
    const hasil = parseBerkasEkspor(buffer);

    expect(hasil).toHaveLength(2);
    expect(hasil[0].glStatus).toBe("Cancel");
    expect(hasil[1].tipeKlaim).toBe("Reimbursement");
  });
});

// Uji integrasi opsional terhadap berkas ekspor nyata, kalau tersedia di
// mesin pengembangan (berkas berisi data pribadi, tidak masuk git — lihat
// .gitignore). Dilewati otomatis kalau berkasnya tidak ada, termasuk di CI.
const BERKAS_NYATA = join(
  __dirname,
  "..",
  "..",
  "docs",
  "JRCARE - KLAIM REPORT-FIX.xlsx",
);

describe.skipIf(!existsSync(BERKAS_NYATA))("parseBerkasEkspor (berkas nyata)", () => {
  it("mem-parse seluruh baris tanpa error dan tanpa mencetak data pribadi", () => {
    const buffer = readFileSync(BERKAS_NYATA);
    const hasil = parseBerkasEkspor(buffer);

    // Hanya periksa jumlah dan struktur, tidak pernah membandingkan/mencetak
    // nama korban, id jaminan, atau nomor surat jaminan.
    expect(hasil.length).toBe(2849);
    for (const b of hasil) {
      expect(b.idJaminan.length).toBeGreaterThan(0);
      expect(b.tglGl).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
