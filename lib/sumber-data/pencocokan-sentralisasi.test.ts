import { describe, expect, it } from "vitest";
import { cariGlPalingCocok, type KandidatGl } from "./pencocokan-sentralisasi";

function gl(sebagian: Partial<KandidatGl> & { idJaminan: string }): KandidatGl {
  return {
    tglGl: "2026-05-26",
    nilaiDisetujui: 0,
    jumlahPembayaran: 0,
    statusPembayaran: "Unpaid",
    ...sebagian,
  };
}

describe("cariGlPalingCocok", () => {
  it("melewati baris yang pembayarannya sudah tercatat lunas dengan nominal sama persis", () => {
    // Kasus nyata DEBBY INDRIYANI WIRYANTO: dua GL, yang benar sudah Paid
    // dari impor JRCare. Versi lama membatasi kandidat ke Unpaid saja
    // sehingga GL yang benar tersembunyi, dan pembayaran 17 juta nyasar ke
    // GL lain yang nilainya cuma 342 ribu.
    const kandidat = [
      gl({ idJaminan: "GnCE", tglGl: "2026-07-06", nilaiDisetujui: 342540 }),
      gl({
        idJaminan: "CJJW",
        tglGl: "2026-05-26",
        nilaiDisetujui: 16089322,
        jumlahPembayaran: 17089322,
        statusPembayaran: "Paid",
      }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 17089322,
    });

    expect(hasil).toEqual({ jenis: "sudah_tercatat" });
  });

  it("menandai satu-satunya GL yang belum lunas", () => {
    const hasil = cariGlPalingCocok([gl({ idJaminan: "A" })], {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 500000,
    });

    expect(hasil).toEqual({ jenis: "tandai", idJaminan: "A" });
  });

  it("memilih GL yang Tgl GL-nya paling dekat ke Tgl Pengajuan", () => {
    const kandidat = [
      gl({ idJaminan: "JAUH", tglGl: "2026-07-06" }),
      gl({ idJaminan: "DEKAT", tglGl: "2026-05-26" }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 500000,
    });

    expect(hasil).toEqual({ jenis: "tandai", idJaminan: "DEKAT" });
  });

  it("tidak mensyaratkan Tgl GL lebih dulu dari Tgl Pengajuan -- yang dipakai jaraknya, bukan urutannya", () => {
    // Pada data nyata, Tgl GL justru kerap SESUDAH Tgl Pengajuan (kasus
    // DEBBY: pengajuan 25-05, Tgl GL 26-05). Aturan "harus sebelum" akan
    // membuang kandidat yang benar.
    const kandidat = [
      gl({ idJaminan: "SESUDAH_DEKAT", tglGl: "2026-05-26" }),
      gl({ idJaminan: "SEBELUM_JAUH", tglGl: "2026-01-10" }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 500000,
    });

    expect(hasil).toEqual({ jenis: "tandai", idJaminan: "SESUDAH_DEKAT" });
  });

  it("memakai selisih nominal sebagai pembanding kedua saat tanggalnya sama kuat", () => {
    const kandidat = [
      gl({ idJaminan: "NOMINAL_JAUH", tglGl: "2026-05-26", nilaiDisetujui: 100000 }),
      gl({ idJaminan: "NOMINAL_DEKAT", tglGl: "2026-05-24", nilaiDisetujui: 4900000 }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 5000000,
    });

    expect(hasil).toEqual({ jenis: "tandai", idJaminan: "NOMINAL_DEKAT" });
  });

  it("menyerahkan ke petugas kalau dua kandidat sama kuat di tanggal DAN nominal", () => {
    const kandidat = [
      gl({ idJaminan: "A", tglGl: "2026-05-24", nilaiDisetujui: 500000 }),
      gl({ idJaminan: "B", tglGl: "2026-05-26", nilaiDisetujui: 500000 }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 500000,
    });

    expect(hasil).toEqual({ jenis: "perlu_tinjau_manual" });
  });

  it("menyerahkan ke petugas kalau Tgl Pengajuan tidak terbaca padahal kandidatnya banyak", () => {
    const kandidat = [gl({ idJaminan: "A" }), gl({ idJaminan: "B", tglGl: "2026-07-06" })];

    const hasil = cariGlPalingCocok(kandidat, { tglPengajuan: null, nominalInvoice: 500000 });

    expect(hasil).toEqual({ jenis: "perlu_tinjau_manual" });
  });

  it("menyerahkan ke petugas kalau semua kandidat di luar toleransi 365 hari", () => {
    const kandidat = [
      gl({ idJaminan: "A", tglGl: "2020-01-01" }),
      gl({ idJaminan: "B", tglGl: "2021-01-01" }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 500000,
    });

    expect(hasil).toEqual({ jenis: "perlu_tinjau_manual" });
  });

  it("melaporkan tidak cocok kalau namanya tidak ada di gl_mirror sama sekali", () => {
    const hasil = cariGlPalingCocok([], { tglPengajuan: "2026-05-25", nominalInvoice: 500000 });

    expect(hasil).toEqual({ jenis: "tidak_cocok" });
  });

  it("menganggap sudah tercatat kalau semua kandidat sudah Paid walau nominalnya beda", () => {
    const kandidat = [
      gl({ idJaminan: "A", statusPembayaran: "Paid", jumlahPembayaran: 111 }),
      gl({ idJaminan: "B", statusPembayaran: "Paid", jumlahPembayaran: 222 }),
    ];

    const hasil = cariGlPalingCocok(kandidat, {
      tglPengajuan: "2026-05-25",
      nominalInvoice: 999,
    });

    expect(hasil).toEqual({ jenis: "sudah_tercatat" });
  });

  it("tidak menganggap lunas hanya karena sama-sama nol -- nominal 0 bukan bukti", () => {
    const kandidat = [
      gl({ idJaminan: "A", statusPembayaran: "Paid", jumlahPembayaran: 0 }),
      gl({ idJaminan: "B" }),
    ];

    const hasil = cariGlPalingCocok(kandidat, { tglPengajuan: "2026-05-25", nominalInvoice: 0 });

    expect(hasil).toEqual({ jenis: "tandai", idJaminan: "B" });
  });
});
