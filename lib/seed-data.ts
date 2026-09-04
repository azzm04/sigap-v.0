import { db } from "./db";
import { loketPelimpahan, pengaturan, picRumahSakit } from "./db/schema";
import { KUNCI_AMBANG_HARI, KUNCI_BATAS_RIWAYAT } from "./pengaturan";

// Daftar awal loket tujuan pelimpahan, sesuai daftar dari pemilik proyek
// (lib/gl/loket-pelimpahan.ts) -- boleh ditambah/diubah lewat halaman
// Pengaturan sesudah ini, bukan lagi lewat kode.
const LOKET_PELIMPAHAN_AWAL = [
  "LOKET KANTOR WILAYAH JAWA TENGAH",
  "LOKET KANTOR CABANG SURAKARTA",
  "LOKET KANTOR CABANG MAGELANG",
  "LOKET KANTOR CABANG PURWOKERTO",
  "LOKET KANTOR CABANG PATI",
  "LOKET KANTOR CABANG SEMARANG",
  "LOKET KANTOR CABANG SUKOHARJO",
  "LOKET KANTOR CABANG PEKALONGAN",
  "LOKET KANTOR PELAYANAN KLATEN",
  "LOKET KANTOR PELAYANAN WANGON",
  "LOKET KANTOR PELAYANAN DEMAK",
  "LOKET KANTOR PELAYANAN TEGAL",
];

// Pemetaan awal PIC per rumah sakit, sesuai daftar yang diberikan pemilik proyek. Nama rumah sakit di sini SUDAH disesuaikan ke ejaan persis yang
// muncul di gl_mirror.nama_rumah_sakit (dicek manual satu-satu terhadap
// data ekspor nyata), bukan singkatan yang aslinya dipakai pemilik proyek
// -- lihat lib/gl/pic.ts soal kenapa pencocokan harus persis.
//
// "RS PLAMONGAN INDAH" belum ketemu padanannya di data yang sudah ter-
// impor sampai sekarang (kemungkinan belum pernah ada GL dari sana), jadi
// disimpan apa adanya -- PIC-nya baru muncul di tabel GL begitu ada baris
// dengan nama_rumah_sakit yang persis sama, atau petugas bisa
// menyesuaikan ejaannya lewat halaman Pengaturan begitu tahu nama aslinya.
const PIC_RUMAH_SAKIT_AWAL: {
  namaRumahSakit: string;
  picTaskForce: string;
  picPengajuan: string;
}[] = [
  { namaRumahSakit: "RS SAMSOE HIDAJAT, KOTA SEMARANG", picTaskForce: "Ernita Kushanendri", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RSUP DR. KARIADI, KOTA SEMARANG", picTaskForce: "Ernita Kushanendri", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RSUD KRMT WONGSONEGORO, KOTA SEMARANG", picTaskForce: "Ernita Kushanendri", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RS BHAYANGKARA POLDA JATENG, KOTA SEMARANG", picTaskForce: "Bimo", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RS JIWA DR AMINO GONDO H, KOTA SEMARANG", picTaskForce: "Bimo", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RS PANTIWILASA CITARUM, KOTA SEMARANG", picTaskForce: "Bimo", picPengajuan: "Ernita Kushanendri" },
  { namaRumahSakit: "RS PRIMAYA, KOTA SEMARANG", picTaskForce: "Rika Wahyu Utami", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RS GIGI DAN MULUT UNIMUS, KOTA SEMARANG", picTaskForce: "Rika Wahyu Utami", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RS UNIMUS", picTaskForce: "Rika Wahyu Utami", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RS BHAYANGKARA AKPOL, KOTA SEMARANG", picTaskForce: "Nurani Prasetianti", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RS WILLIAM BOOTH, KOTA SEMARANG", picTaskForce: "Nurani Prasetianti", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RS PLAMONGAN INDAH", picTaskForce: "Nurani Prasetianti", picPengajuan: "Nurani Prasetianti" },
  { namaRumahSakit: "RSUD TUGUREJO, KOTA SEMARANG", picTaskForce: "Martina Lestari", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS HERMINA PANDANARAN, KOTA SEMARANG", picTaskForce: "Martina Lestari", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS TK III BHAKTI WIRA TAMTAMA, KOTA SEMARANG", picTaskForce: "Martina Lestari", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS HERMINA BANYUMANIK, KOTA SEMARANG", picTaskForce: "Arif Eka", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS BANYUMANIK, KOTA SEMARANG", picTaskForce: "Arif Eka", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS BANYUMANIK 2, KOTA SEMARANG", picTaskForce: "Arif Eka", picPengajuan: "Martina Lestari" },
  { namaRumahSakit: "RS NASIONAL DIPONEGORO, KOTA SEMARANG", picTaskForce: "Indra Yudistira", picPengajuan: "Pia Sofyana" },
  { namaRumahSakit: "RS ST. ELISABETH, KOTA SEMARANG", picTaskForce: "Indra Yudistira", picPengajuan: "Pia Sofyana" },
  { namaRumahSakit: "RS SILOAM HOSPITALS, KOTA SEMARANG", picTaskForce: "Indra Yudistira", picPengajuan: "Pia Sofyana" },
  { namaRumahSakit: "RS ISLAM SULTAN AGUNG, KOTA SEMARANG", picTaskForce: "Henggar Aziz", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "RS GIGI DAN MULUT SULTAN AGUNG, KOTA SEMARANG", picTaskForce: "Henggar Aziz", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "RS PANTIWILASA DR CIPTO, KOTA SEMARANG", picTaskForce: "Henggar Aziz", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "RS PERMATA MEDIKA, KOTA SEMARANG", picTaskForce: "Aris Murdiyanto", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "RS COLUMBIA ASIA, KOTA SEMARANG", picTaskForce: "Aris Murdiyanto", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "RS KELUARGA SEHAT III SEMARANG", picTaskForce: "Aris Murdiyanto", picPengajuan: "Henggar Aziz" },
  { namaRumahSakit: "Rumah Sakit CEPOKO", picTaskForce: "Pia Sofyana", picPengajuan: "Pia Sofyana" },
  { namaRumahSakit: "RS TELOGOREJO, KOTA SEMARANG", picTaskForce: "Pia Sofyana", picPengajuan: "Pia Sofyana" },
  { namaRumahSakit: "RS ROEMANI M., KOTA SEMARANG", picTaskForce: "Pia Sofyana", picPengajuan: "Pia Sofyana" },
];

export async function seedReferensiDanPengaturan() {
  await db
    .insert(pengaturan)
    .values([
      { kunci: KUNCI_AMBANG_HARI, nilai: "14" },
      { kunci: KUNCI_BATAS_RIWAYAT, nilai: "100" },
    ])
    .onConflictDoNothing({ target: pengaturan.kunci });

  await db
    .insert(picRumahSakit)
    .values(PIC_RUMAH_SAKIT_AWAL)
    .onConflictDoNothing({ target: picRumahSakit.namaRumahSakit });

  await db
    .insert(loketPelimpahan)
    .values(LOKET_PELIMPAHAN_AWAL.map((nama) => ({ nama })))
    .onConflictDoNothing({ target: loketPelimpahan.nama });
}
