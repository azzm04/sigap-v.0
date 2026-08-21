import type { BarisGL, SumberData } from "./index";

// Generator data contoh untuk pengembangan. Struktur dan nilai enum mengikuti
// docs/domain-gl.md persis. Bukan sumber produksi — lihat sumber-impor.ts.
//
// RNG diberi seed tetap supaya `npm run seed` idempoten: dijalankan ulang
// menghasilkan baris yang sama persis (id_jaminan sama), sehingga menguji
// jalur upsert normalizer, bukan menumpuk data baru tiap kali dijalankan.

const JUMLAH_BARIS = 600;
const SEED = 20260101;
// Dipakai di id_jaminan hanya untuk format yang realistis (mirip pola
// tanggal di ID Jaminan asli). SENGAJA tetap, TIDAK boleh dari tglGl/hari
// ini -- tglGl bergeser tiap hari seiring umurHari dihitung ulang, kalau
// dipakai di kunci alami maka id_jaminan berubah tiap hari dan seeder jadi
// tidak idempoten (baris lama tidak ketemu lagi, dianggap baru semua).
const PREFIX_ID_TETAP = "20260101";

function buatRng(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function acakInt(rng: () => number, min: number, maks: number): number {
  return Math.floor(rng() * (maks - min + 1)) + min;
}

function pilih<T>(rng: () => number, daftar: readonly T[]): T {
  return daftar[Math.floor(rng() * daftar.length)];
}

function pilihBerbobot<T>(
  rng: () => number,
  opsi: readonly (readonly [T, number])[],
): T {
  const total = opsi.reduce((s, [, bobot]) => s + bobot, 0);
  let ambang = rng() * total;
  for (const [nilai, bobot] of opsi) {
    ambang -= bobot;
    if (ambang <= 0) return nilai;
  }
  return opsi[opsi.length - 1][0];
}

function keIso(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

function tambahHari(tanggal: Date, hari: number): Date {
  const hasil = new Date(tanggal);
  hasil.setUTCDate(hasil.getUTCDate() + hari);
  return hasil;
}

const NAMA_DEPAN = [
  "Budi", "Siti", "Ahmad", "Dewi", "Agus", "Rini", "Joko", "Sri", "Bambang",
  "Wati", "Eko", "Yuni", "Slamet", "Umi", "Hadi", "Nur", "Tono", "Ratna",
  "Wahyu", "Indah",
];
const NAMA_BELAKANG = [
  "Santoso", "Wijaya", "Kusuma", "Pratama", "Setiawan", "Handoko", "Susanto",
  "Rahayu", "Purnomo", "Hidayat", "Saputra", "Wulandari", "Nugroho", "Utami",
];

const RUMAH_SAKIT = [
  "RSUD TUGUREJO, KOTA SEMARANG",
  "RS SAMSOE HIDAJAT, KOTA SEMARANG",
  "RS TELOGOREJO, KOTA SEMARANG",
  "RS KARIADI, KOTA SEMARANG",
  "RS ROEMANI MUHAMMADIYAH, KOTA SEMARANG",
  "RSUD KOTA SEMARANG",
  "RS PANTI WILASA CITARUM, KOTA SEMARANG",
  null,
];

// Ada lebih dari satu loket dipakai supaya filter loket di dashboard punya
// sesuatu untuk difilter. Data nyata yang sudah diperiksa cuma menunjukkan
// satu nilai ("LOKET CABANG SEMARANG"); nilai lain di sini dikarang untuk
// keperluan pengembangan, lihat pertanyaan terbuka #3 di CLAUDE.md.
const LOKET = [
  ["LOKET CABANG SEMARANG", 70],
  ["LOKET CABANG PATI", 15],
  ["LOKET SAMSAT SEMARANG BARAT", 15],
] as const;

// 17 tahapan yang disebut klien (docs/domain-gl.md bagian Enum). Bobot
// mendekati sebaran yang teramati di sampel nyata, tapi dikarang untuk
// tahapan yang belum pernah muncul di sampel.
const TAHAPAN = [
  ["Penerimaan GL", 20],
  ["Konfirmasi RS", 6],
  ["Konfirmasi K3", 4],
  ["Surat Kuasa", 8],
  ["Surat Keterangan Kesehatan", 14],
  ["Upload Form Kesehatan", 4],
  ["Upload Surat Kematian", 2],
  ["Waiting First Layer Verification", 5],
  ["Waiting Second Layer Verification", 3],
  ["Waiting JRCare Manual Verification", 3],
  ["Verifikasi User", 12],
  ["Verifikasi Kewajaran", 3],
  ["Pengajuan Claim", 10],
  ["Release to DivYan", 2],
  ["Kirim Data DASI", 2],
  ["Update Data dari DASI", 2],
  ["Done", 25],
] as const;

const STATUS_VERIFIKASI = [
  ["New", 45],
  ["Verified", 30],
  ["Process", 10],
  ["Revision", 8],
  ["Reject", 2],
  ["Setuju", 2],
  ["Tidak Setuju", 1],
  ["Berkaitan", 1],
  ["Tidak Berkaitan", 1],
] as const;

const TIPE_CIDERA = [
  ["LL", 90],
  ["MD LL", 4],
  ["LL PG", 3],
  ["LL CT", 3],
] as const;

export const sumberDummy: SumberData = {
  async ambilGL(): Promise<BarisGL[]> {
    const rng = buatRng(SEED);
    const hariIni = new Date();
    const baris: BarisGL[] = [];

    for (let i = 0; i < JUMLAH_BARIS; i++) {
      const tipeKlaim = rng() < 0.05 ? "Reimbursement" : "GL";
      const glStatus = rng() < 0.04 ? "Cancel" : "Active";
      const tahapan = pilihBerbobot(rng, TAHAPAN);
      const statusPembayaran = rng() < 0.55 ? "Unpaid" : "Paid";
      const statusVerifikasi = pilihBerbobot(rng, STATUS_VERIFIKASI);
      const tipeCidera = pilihBerbobot(rng, TIPE_CIDERA);
      const loket = pilihBerbobot(rng, LOKET);
      const namaRumahSakit = pilih(rng, RUMAH_SAKIT);

      // Sebaran umur: sengaja dibuat lebar supaya ada kasus di bawah,
      // sekitar, dan jauh di atas ambang default (14 hari).
      const umurHari = pilihBerbobot(rng, [
        [acakInt(rng, 0, 13), 30],
        [acakInt(rng, 14, 30), 25],
        [acakInt(rng, 31, 90), 25],
        [acakInt(rng, 91, 365), 20],
      ] as const);
      const tglGl = tambahHari(hariIni, -umurHari);

      const sudahDiajukan = tahapan !== "Penerimaan GL";
      const tglDiajukan = sudahDiajukan
        ? tambahHari(tglGl, acakInt(rng, 1, Math.min(umurHari, 10) || 1))
        : null;

      const sudahDiverifikasi = statusVerifikasi === "Verified" || tahapan === "Done";
      const tglVerifikasi =
        sudahDiverifikasi && tglDiajukan
          ? tambahHari(tglDiajukan, acakInt(rng, 1, 14))
          : null;

      const tglPembayaran =
        statusPembayaran === "Paid"
          ? tambahHari(tglDiajukan ?? tglGl, acakInt(rng, 5, 30))
          : null;

      const nilaiDiajukan = acakInt(rng, 500_000, 45_000_000);
      const potongan = rng() < 0.3 ? acakInt(rng, 0, Math.floor(nilaiDiajukan * 0.2)) : 0;
      const nilaiDisetujui = nilaiDiajukan - potongan;
      const jumlahPembayaran = statusPembayaran === "Paid" ? nilaiDisetujui : 0;

      // Nomor Surat Jaminan diamati hanya terisi pada tahapan lanjut
      // (temuan dari berkas lengkap, lihat docs/domain-gl.md).
      const tahapLanjut = tahapan === "Verifikasi User" || tahapan === "Done";
      const nomorSuratJaminan = tahapLanjut
        ? `PL/${String(i + 1).padStart(10, "0")}/${acakInt(rng, 100, 999)}/26`
        : null;

      baris.push({
        tipeKlaim,
        tipeCidera,
        namaRumahSakit,
        loket,
        idJaminan: `${PREFIX_ID_TETAP}${String(i + 1).padStart(6, "0")}.0826.d${i
          .toString(36)
          .padStart(3, "0")}`,
        namaKorban: `${pilih(rng, NAMA_DEPAN)} ${pilih(rng, NAMA_BELAKANG)}`,
        nomorSuratJaminan,
        tglGl: keIso(tglGl),
        glStatus,
        tahapan,
        tglDiajukan: tglDiajukan ? keIso(tglDiajukan) : null,
        statusVerifikasi,
        nilaiDiajukan,
        nilaiDisetujui,
        tglVerifikasi: tglVerifikasi ? keIso(tglVerifikasi) : null,
        statusPembayaran,
        jumlahPembayaran,
        tglPembayaran: tglPembayaran ? keIso(tglPembayaran) : null,
      });
    }

    return baris;
  },
};
