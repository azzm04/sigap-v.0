import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { GalatValidasiSentralisasi, parseBerkasSentralisasi } from "./sumber-sentralisasi";

const HEADER_ROW = [
  "Jenis Sentralisasi",
  "Tgl Pengajuan",
  "No Invoice",
  "Trading Partner",
  "Deskripsi",
  "Nominal Invoice",
  "Nama Penerima",
  "Jadwal Bayar",
  "Tgl Pembayaran",
  "Status Invoice",
  "Transaction Reference",
];

// Serial Excel untuk 06-08-2026 (dipakai sebagai Tgl Pembayaran contoh).
const SERIAL_06_08_2026 = 46240;

const BARIS_LENGKAP: unknown[] = [
  "Santunan",
  46142,
  "2-330-00-04-06-07-2026",
  "Contoh Nama",
  "LUKA-LUKA",
  "20.671.000",
  "YAKKUM RS PANTI WILASA DR CIPTO",
  SERIAL_06_08_2026,
  SERIAL_06_08_2026,
  "Selesai Proses Santunan",
  "0100-SPT-BRI-26080161-002039",
];

function buatBuffer(barisData: unknown[][]): Buffer {
  // Meniru berkas nyata: ada baris judul di atas header asli (beda dari
  // JRCare/DASI yang datanya langsung mulai dari row 0/setelah blok filter).
  const rows: unknown[][] = [["Sentralisasi Pembayaran"], HEADER_ROW, ...barisData];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseBerkasSentralisasi", () => {
  it("mem-parse berkas berstruktur standar dengan benar", () => {
    const buffer = buatBuffer([BARIS_LENGKAP]);
    const hasil = parseBerkasSentralisasi(buffer);

    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toMatchObject({
      namaKorban: "Contoh Nama",
      noInvoice: "2-330-00-04-06-07-2026",
      statusInvoice: "Selesai Proses Santunan",
      transactionReference: "0100-SPT-BRI-26080161-002039",
      tglPembayaran: "2026-08-06",
    });
  });

  it("transactionReference null kalau kolomnya kosong (mis. Status Invoice masih 'Kasir'/'Staf Keuangan')", () => {
    // Kasus nyata yang ditemukan: baris berstatus "Kasir" TERNYATA sudah
    // Paid+Done di JRCare (dikonfirmasi silang oleh pemilik proyek) --
    // makanya patokan lunas adalah Transaction Reference terisi, BUKAN teks
    // Status Invoice. Null di sini mewakili baris yang BENAR-BENAR belum
    // dibayar (Transaction Reference kosong).
    const barisBelumBayar = [...BARIS_LENGKAP];
    barisBelumBayar[9] = "Staf Keuangan (Sub Pra-Verifikasi)";
    barisBelumBayar[10] = null;
    const buffer = buatBuffer([barisBelumBayar]);
    const hasil = parseBerkasSentralisasi(buffer);
    expect(hasil[0].transactionReference).toBeNull();
  });

  it("transactionReference tetap terbaca walau Status Invoice masih 'Kasir'", () => {
    const barisKasir = [...BARIS_LENGKAP];
    barisKasir[9] = "Kasir";
    barisKasir[10] = "0100-SPT-BRI-26080831-023992";
    const buffer = buatBuffer([barisKasir]);
    const hasil = parseBerkasSentralisasi(buffer);
    expect(hasil[0].transactionReference).toBe("0100-SPT-BRI-26080831-023992");
  });

  it("tidak keliru mengira baris judul sebagai header", () => {
    const buffer = buatBuffer([BARIS_LENGKAP]);
    expect(() => parseBerkasSentralisasi(buffer)).not.toThrow();
  });

  it("melewati baris kosong di tengah data tanpa menghentikan proses", () => {
    const barisKosong = new Array(HEADER_ROW.length).fill(null);
    const buffer = buatBuffer([BARIS_LENGKAP, barisKosong, BARIS_LENGKAP]);
    const hasil = parseBerkasSentralisasi(buffer);
    expect(hasil).toHaveLength(2);
  });

  it("tglPembayaran null kalau selnya bukan serial Excel (angka)", () => {
    const barisTanpaTglBayar = [...BARIS_LENGKAP];
    barisTanpaTglBayar[8] = null;
    const buffer = buatBuffer([barisTanpaTglBayar]);
    const hasil = parseBerkasSentralisasi(buffer);
    expect(hasil[0].tglPembayaran).toBeNull();
  });

  it("menolak berkas yang tidak punya baris header", () => {
    const ws = XLSX.utils.aoa_to_sheet([["Bukan berkas Sentralisasi"], ["baris lain"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    expect(() => parseBerkasSentralisasi(buffer)).toThrow(GalatValidasiSentralisasi);
  });

  it("menolak baris dengan Trading Partner kosong", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[3] = null;
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasSentralisasi(buffer)).toThrow(GalatValidasiSentralisasi);
  });

  it("menolak baris dengan No Invoice kosong", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[2] = null;
    const buffer = buatBuffer([barisSalah]);

    expect(() => parseBerkasSentralisasi(buffer)).toThrow(GalatValidasiSentralisasi);
  });

  it("tidak menyimpan data separuh: satu baris salah membatalkan seluruh berkas", () => {
    const barisSalah = [...BARIS_LENGKAP];
    barisSalah[3] = null; // Trading Partner kosong pada baris kedua
    const buffer = buatBuffer([BARIS_LENGKAP, barisSalah]);

    expect(() => parseBerkasSentralisasi(buffer)).toThrow(GalatValidasiSentralisasi);
  });

  it("tetap mem-parse baris dengan Status Invoice apa pun apa adanya (tidak divalidasi struktural)", () => {
    // Validasi struktural tidak menyaring berdasarkan isi Status Invoice
    // ATAU Transaction Reference -- keduanya cuma dibaca apa adanya di sini.
    // Keputusan "sudah lunas atau belum" itu urusan simpanDataSentralisasi
    // (dilewati kalau Transaction Reference kosong, bukan ditolak).
    const barisLain = [...BARIS_LENGKAP];
    barisLain[9] = "Dalam Proses";
    const buffer = buatBuffer([barisLain]);
    const hasil = parseBerkasSentralisasi(buffer);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].statusInvoice).toBe("Dalam Proses");
  });
});
