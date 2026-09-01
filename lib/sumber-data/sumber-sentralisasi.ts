import { and, eq, isNull } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { tandaiBerkasSelesai } from "../gl/tahap-proses";
import { cariGlPalingCocok, type KandidatGl } from "./pencocokan-sentralisasi";

export interface BarisSentralisasi {
  namaKorban: string; // dari kolom "Trading Partner" -- lihat catatan di parseBerkasSentralisasi
  noInvoice: string;
  statusInvoice: string; // ditampilkan di teks catatan saja, TIDAK dipakai sebagai patokan lunas (lihat simpanDataSentralisasi)
  transactionReference: string | null; // patokan sebenarnya -- lihat simpanDataSentralisasi
  tglPembayaran: string | null; // ISO YYYY-MM-DD, cuma untuk teks catatan
  /** ISO YYYY-MM-DD. Pembeda utama saat satu nama punya beberapa GL -- lihat cariGlPalingCocok() */
  tglPengajuan: string | null;
  /** Rupiah bulat. Pembeda kedua, sekaligus penanda pembayaran yang sudah tercatat di JRCare */
  nominalInvoice: number;
}

export class GalatValidasiSentralisasi extends Error {
  readonly masalah: string[];

  constructor(masalah: string[]) {
    super(`Berkas Sentralisasi Pembayaran ditolak:\n${masalah.join("\n")}`);
    this.name = "GalatValidasiSentralisasi";
    this.masalah = masalah;
  }
}

// Patokan "sudah benar-benar dibayar" adalah kolom TRANSACTION REFERENCE
// terisi -- BUKAN kolom Status Invoice. Awalnya diasumsikan Status Invoice
// === "Selesai Proses Santunan" (nilai lain yang teramati: "Kasir", "Staf
// Keuangan (Sub Pra-Verifikasi)"), tapi pemilik proyek mengecek langsung ke
// JRCare untuk korban "MIFTAHUL ANAM" yang Status Invoice-nya masih
// "Kasir" -- ternyata di JRCare GL itu SUDAH Paid dan Tahapan-nya sudah
// Done. Jadi Status Invoice "Kasir" TIDAK selalu berarti belum lunas;
// Transaction Reference terisi adalah sinyal yang terbukti akurat
// Kalau Transaction Reference kosong, baris dilewati (belum lunas) -- bukan error, bukan penolakan berkas.

function excelDateToISO(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split("T")[0];
}

// Kolom "Nominal Invoice" DUA TIPE dalam satu berkas (diuji pada berkas
// nyata: 694 sel teks, 109 sel angka):
//
//   teks  "20.968.750"  -> titik = pemisah ribuan, buang saja  -> 20968750
//   angka  616.28       -> Excel terlanjur menafsirkan titik ribuan
//                          sebagai koma desimal ("616.280" jadi 616.28),
//                          jadi harus dikalikan 1000              -> 616280
//
// Hipotesis x1000 itu BUKAN tebakan: diuji ke seluruh 109 sel bertipe
// angka, dan 109/109 hasilnya cocok PERSIS dengan gl_mirror.jumlah_pembayaran
// GL yang sudah lunas. Nilai bertitik dua (mis. "50.000.000") tidak pernah
// terbaca sebagai angka karena bukan angka yang sah, jadi selalu lewat
// jalur teks.
export function nominalInvoiceKeRupiah(nilai: unknown): number {
  if (typeof nilai === "number") return Math.round(nilai * 1000);
  const teks = String(nilai ?? "").trim();
  if (!teks) return 0;
  return Number(teks.replace(/[^0-9]/g, "")) || 0;
}

/**
 * kolom yang dipakai:
 * "Trading Partner" (nama korban -- BUKAN "Nama Penerima", yang isinya nama
 * RS/PT penerima pembayaran, sudah dikonfirmasi ke pemilik proyek),
 * "No Invoice", "Status Invoice", "Transaction Reference", "Tgl Pembayaran",
 * "Tgl Pengajuan", "Nominal Invoice".
 */
export function parseBerkasSentralisasi(sumber: Buffer | ArrayBuffer): BarisSentralisasi[] {
  const workbook = XLSX.read(sumber, { type: "buffer", raw: true });
  const namaSheet = workbook.SheetNames[0];
  if (!namaSheet) {
    throw new GalatValidasiSentralisasi(["Berkas tidak memuat sheet apa pun."]);
  }

  const sheet = workbook.Sheets[namaSheet];
  const baris2d = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const idxHeader = baris2d.findIndex(
    (r) =>
      r.some((c) => String(c ?? "").trim() === "Trading Partner") &&
      r.some((c) => String(c ?? "").trim() === "Status Invoice"),
  );
  if (idxHeader < 0) {
    throw new GalatValidasiSentralisasi([
      'Baris header (kolom "Trading Partner" dan "Status Invoice") tidak ditemukan.',
    ]);
  }

  const header = baris2d[idxHeader].map((c) => String(c ?? "").trim());
  const idxTradingPartner = header.indexOf("Trading Partner");
  const idxNoInvoice = header.indexOf("No Invoice");
  const idxStatusInvoice = header.indexOf("Status Invoice");
  const idxTransactionReference = header.indexOf("Transaction Reference");
  const idxTglPembayaran = header.indexOf("Tgl Pembayaran");
  const idxTglPengajuan = header.indexOf("Tgl Pengajuan");
  const idxNominalInvoice = header.indexOf("Nominal Invoice");

  const masalah: string[] = [];
  const hasil: BarisSentralisasi[] = [];

  for (let i = idxHeader + 1; i < baris2d.length; i++) {
    const raw = baris2d[i] ?? [];
    if (raw.every((v) => v === null || v === undefined || String(v).trim() === "")) {
      continue;
    }

    const nomorBaris = i + 1;
    const namaKorbanRaw = raw[idxTradingPartner];
    const noInvoiceRaw = raw[idxNoInvoice];
    const statusRaw = raw[idxStatusInvoice];
    const refRaw = idxTransactionReference >= 0 ? raw[idxTransactionReference] : null;
    const tglBayarRaw = idxTglPembayaran >= 0 ? raw[idxTglPembayaran] : null;
    const tglPengajuanRaw = idxTglPengajuan >= 0 ? raw[idxTglPengajuan] : null;
    const nominalRaw = idxNominalInvoice >= 0 ? raw[idxNominalInvoice] : null;

    if (!namaKorbanRaw || String(namaKorbanRaw).trim() === "") {
      masalah.push(`Baris ${nomorBaris}: Trading Partner kosong.`);
      continue;
    }
    if (!noInvoiceRaw || String(noInvoiceRaw).trim() === "") {
      masalah.push(`Baris ${nomorBaris}: No Invoice kosong.`);
      continue;
    }
    if (!statusRaw || String(statusRaw).trim() === "") {
      masalah.push(`Baris ${nomorBaris}: Status Invoice kosong.`);
      continue;
    }

    const refTrim = refRaw ? String(refRaw).trim() : "";
    hasil.push({
      namaKorban: String(namaKorbanRaw).trim(),
      noInvoice: String(noInvoiceRaw).trim(),
      statusInvoice: String(statusRaw).trim(),
      transactionReference: refTrim === "" ? null : refTrim,
      tglPembayaran: typeof tglBayarRaw === "number" ? excelDateToISO(tglBayarRaw) : null,
      tglPengajuan: typeof tglPengajuanRaw === "number" ? excelDateToISO(tglPengajuanRaw) : null,
      nominalInvoice: nominalInvoiceKeRupiah(nominalRaw),
    });
  }

  if (masalah.length > 0) {
    const ditampilkan = masalah.slice(0, 20);
    if (masalah.length > 20) {
      ditampilkan.push(`...dan ${masalah.length - 20} masalah lainnya.`);
    }
    throw new GalatValidasiSentralisasi(ditampilkan);
  }

  return hasil;
}


export interface HasilSimpanSentralisasi {
  jumlahBaris: number;
  jumlahDiproses: number;
  jumlahBelumTerbayar: number;
  jumlahGlDiperbarui: number;
  jumlahTidakCocok: number;
  /** Pembayarannya sudah tercermin di gl_mirror hasil impor JRCare -- tidak ada yang perlu diubah */
  jumlahSudahTercatat: number;
  /** Nama cocok tapi tidak ada satu GL pun yang jelas pemenangnya -- petugas yang memutuskan */
  jumlahPerluTinjauManual: number;
  /** Nama korban pada kategori di atas, untuk ditampilkan ke petugas */
  perluTinjauManual: string[];
}

/**
 * Mencocokkan tiap baris Sentralisasi Pembayaran yang Transaction
 * Reference-nya sudah terisi (lihat catatan di atas BarisSentralisasi soal
 * kenapa bukan Status Invoice) ke SATU GL lewat cariGlPalingCocok().
 *
 * Kandidat diambil dari SELURUH GL bernama sama -- termasuk yang sudah
 * Paid, bukan cuma yang Unpaid seperti versi lama. Justru pembatasan ke
 * Unpaid itu yang dulu membuat pembayaran nyasar ke GL yang salah.
 *
 * Nama tetap dicocokkan EXACT ternormalisasi (trim + uppercase, pola sama
 * seperti kunciRumahSakit() di lib/gl/pic.ts), BUKAN fuzzy.
 */
export async function simpanDataSentralisasi(
  baris: BarisSentralisasi[],
  userId: number,
): Promise<HasilSimpanSentralisasi> {
  const semuaGl = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      tglGl: glMirror.tglGl,
      nilaiDisetujui: glMirror.nilaiDisetujui,
      jumlahPembayaran: glMirror.jumlahPembayaran,
      statusPembayaran: glMirror.statusPembayaran,
    })
    .from(glMirror)
    .where(and(isNull(glMirror.dihapusPada), eq(glMirror.tipeKlaim, "GL")));

  const petaGl = new Map<string, KandidatGl[]>();
  for (const g of semuaGl) {
    const kunci = g.namaKorban.trim().toUpperCase();
    const daftar = petaGl.get(kunci);
    if (daftar) daftar.push(g);
    else petaGl.set(kunci, [g]);
  }

  let jumlahDiproses = 0;
  let jumlahBelumTerbayar = 0;
  let jumlahGlDiperbarui = 0;
  let jumlahTidakCocok = 0;
  let jumlahSudahTercatat = 0;
  const perluTinjauManual: string[] = [];

  await db.transaction(async (tx) => {
    for (const b of baris) {
      if (!b.transactionReference) {
        jumlahBelumTerbayar++;
        continue;
      }
      jumlahDiproses++;

      const kunci = b.namaKorban.trim().toUpperCase();
      const kandidat = petaGl.get(kunci) ?? [];
      const keputusan = cariGlPalingCocok(kandidat, b);

      if (keputusan.jenis === "tidak_cocok") {
        jumlahTidakCocok++;
        continue;
      }
      if (keputusan.jenis === "sudah_tercatat") {
        jumlahSudahTercatat++;
        continue;
      }
      if (keputusan.jenis === "perlu_tinjau_manual") {
        perluTinjauManual.push(b.namaKorban);
        continue;
      }

      const catatan = `Tahap proses pusat mencapai "Berkas Selesai" — cocok otomatis dari impor Sentralisasi Pembayaran (Transaction Reference ${b.transactionReference}${b.tglPembayaran ? `, dibayar ${b.tglPembayaran}` : ""}).`;
      await tandaiBerkasSelesai(tx, keputusan.idJaminan, userId, catatan);
      jumlahGlDiperbarui++;

      // Tandai lunas di peta juga, supaya baris berikutnya untuk korban
      // yang sama tidak memilih GL ini lagi -- satu korban bisa punya
      // beberapa pembayaran di satu berkas.
      const terpilih = petaGl.get(kunci)?.find((g) => g.idJaminan === keputusan.idJaminan);
      if (terpilih) terpilih.statusPembayaran = "Paid";
    }
  });

  return {
    jumlahBaris: baris.length,
    jumlahDiproses,
    jumlahBelumTerbayar,
    jumlahGlDiperbarui,
    jumlahTidakCocok,
    jumlahSudahTercatat,
    jumlahPerluTinjauManual: perluTinjauManual.length,
    perluTinjauManual,
  };
}
