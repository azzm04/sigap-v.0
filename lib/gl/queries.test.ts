import { describe, expect, it } from "vitest";
import { ambilDaftarGL, ambilOpsiFilter } from "./queries";

// Butuh database lokal jalan (docker compose up -d) dan sudah diisi lewat
// `npm run seed`, seperti tes lain yang menyentuh DB di proyek ini.

describe("ambilOpsiFilter", () => {
  it("mengembalikan nilai loket, tahapan, dan status pembayaran dari data yang ada", async () => {
    const opsi = await ambilOpsiFilter();

    expect(opsi.loket.length).toBeGreaterThan(0);
    expect(opsi.tahapan.length).toBeGreaterThan(0);
    expect(opsi.statusPembayaran).toEqual(expect.arrayContaining(["Paid", "Unpaid"]));
  });
});

describe("ambilDaftarGL", () => {
  it("mengembalikan 20 baris per halaman dan total keseluruhan tanpa filter", async () => {
    const hasil = await ambilDaftarGL({});

    expect(hasil.baris.length).toBeLessThanOrEqual(20);
    expect(hasil.total).toBeGreaterThan(0);
    expect(hasil.halaman).toBe(1);
  });

  it("menyaring hasil berdasarkan loket", async () => {
    const opsi = await ambilOpsiFilter();
    const loketPertama = opsi.loket[0];

    const hasil = await ambilDaftarGL({ loket: loketPertama });

    expect(hasil.total).toBeGreaterThan(0);
    for (const baris of hasil.baris) {
      expect(baris.loket).toBe(loketPertama);
    }
  });

  it("mencari berdasarkan nama korban (tidak peka huruf besar/kecil)", async () => {
    const hasil = await ambilDaftarGL({ cari: "budi" });

    expect(hasil.total).toBeGreaterThan(0);
    for (const baris of hasil.baris) {
      expect(baris.namaKorban.toLowerCase()).toContain("budi");
    }
  });

  it("mencari berdasarkan nomor ID jaminan", async () => {
    const semua = await ambilDaftarGL({});
    const idContoh = semua.baris[0].idJaminan;

    const hasil = await ambilDaftarGL({ cari: idContoh });

    expect(hasil.baris.some((b) => b.idJaminan === idContoh)).toBe(true);
  });

  it("halaman berikutnya berisi baris yang berbeda dari halaman pertama", async () => {
    const halaman1 = await ambilDaftarGL({ halaman: 1 });
    const halaman2 = await ambilDaftarGL({ halaman: 2 });

    expect(halaman1.total).toBeGreaterThan(20);
    const idHalaman1 = new Set(halaman1.baris.map((b) => b.idJaminan));
    for (const baris of halaman2.baris) {
      expect(idHalaman1.has(baris.idJaminan)).toBe(false);
    }
  });

  it("mengembalikan baris kosong kalau tidak ada yang cocok", async () => {
    const hasil = await ambilDaftarGL({ cari: "__tidak_akan_pernah_ada__" });

    expect(hasil.total).toBe(0);
    expect(hasil.baris).toHaveLength(0);
  });
});
