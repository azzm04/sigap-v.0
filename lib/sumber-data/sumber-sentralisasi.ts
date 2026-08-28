import { and, eq, isNull } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../db";
import { glMirror } from "../db/schema";
import { tandaiBerkasSelesai } from "../gl/tahap-proses";

export interface BarisSentralisasi {
  namaKorban: string; // dari kolom "Trading Partner" -- lihat catatan di parseBerkasSentralisasi
  noInvoice: string;
  statusInvoice: string; // ditampilkan di teks catatan saja, TIDAK dipakai sebagai patokan lunas (lihat simpanDataSentralisasi)
  transactionReference: string | null; // patokan sebenarnya -- lihat simpanDataSentralisasi
  tglPembayaran: string | null; // ISO YYYY-MM-DD, cuma untuk teks catatan
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

/**
 * kolom yang dipakai:
 * "Trading Partner" (nama korban -- BUKAN "Nama Penerima", yang isinya nama
 * RS/PT penerima pembayaran, sudah dikonfirmasi ke pemilik proyek),
 * "No Invoice", "Status Invoice", "Transaction Reference", "Tgl Pembayaran".
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
}

/**
 * Mencocokkan tiap baris Sentralisasi Pembayaran (yang Transaction Reference-nya sudah terisi -- lihat catatan di atas BarisSentralisasi
 * soal kenapa bukan Status Invoice) ke gl_mirror yang masih Unpaid lewat
 * Trading Partner <-> namaKorban, EXACT match ternormalisasi (trim + uppercase -- pola sama seperti kunciRumahSakit()/ambilPetaPicRumahSakit()
 * di lib/gl/pic.ts), BUKAN ilike/fuzzy seperti sumber-dasi.ts, supaya nama
 * yang cuma mirip tidak salah tertandai lunas. Kalau satu nama cocok ke
 * lebih dari satu GL Unpaid, SEMUANYA ditandai (arahan pemilik proyek).
 */
export async function simpanDataSentralisasi(
  baris: BarisSentralisasi[],
  userId: number,
): Promise<HasilSimpanSentralisasi> {
  const kandidat = await db
    .select({ idJaminan: glMirror.idJaminan, namaKorban: glMirror.namaKorban })
    .from(glMirror)
    .where(
      and(
        isNull(glMirror.dihapusPada),
        eq(glMirror.tipeKlaim, "GL"),
        eq(glMirror.statusPembayaran, "Unpaid"),
      ),
    );

  const petaGl = new Map<string, string[]>();
  for (const k of kandidat) {
    const kunci = k.namaKorban.trim().toUpperCase();
    const daftar = petaGl.get(kunci);
    if (daftar) daftar.push(k.idJaminan);
    else petaGl.set(kunci, [k.idJaminan]);
  }

  let jumlahDiproses = 0;
  let jumlahBelumTerbayar = 0;
  let jumlahGlDiperbarui = 0;
  let jumlahTidakCocok = 0;

  await db.transaction(async (tx) => {
    for (const b of baris) {
      if (!b.transactionReference) {
        jumlahBelumTerbayar++;
        continue;
      }
      jumlahDiproses++;

      const cocok = petaGl.get(b.namaKorban.trim().toUpperCase());
      if (!cocok || cocok.length === 0) {
        jumlahTidakCocok++;
        continue;
      }

      const catatan = `Tahap proses pusat mencapai "Berkas Selesai" — cocok otomatis dari impor Sentralisasi Pembayaran (Transaction Reference ${b.transactionReference}${b.tglPembayaran ? `, dibayar ${b.tglPembayaran}` : ""}).`;
      for (const idJaminan of cocok) {
        await tandaiBerkasSelesai(tx, idJaminan, userId, catatan);
        jumlahGlDiperbarui++;
      }
    }
  });

  return {
    jumlahBaris: baris.length,
    jumlahDiproses,
    jumlahBelumTerbayar,
    jumlahGlDiperbarui,
    jumlahTidakCocok,
  };
}
