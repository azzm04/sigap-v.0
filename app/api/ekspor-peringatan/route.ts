import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";

function formatTanggalOpsional(iso: string | null): string {
  return iso ? formatTanggal(iso) : "-";
}

const FONT_BODY: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12 };
const FONT_TITLE: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 18, bold: true };
const FONT_INFO_LABEL: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 14, bold: true };
const FONT_INFO_VALUE: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 14 };
const FONT_HEADER: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FFFFFFFF" } };

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const { baris, ambangHari } = await ambilPapanPeringatan({ ukuran: 100000 });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Laporan Peringatan");

  ws.columns = [
    { width: 14 },  // A  Tipe Klaim
    { width: 16 },  // B  Tipe Cidera
    { width: 36 },  // C  Nama Rumah Sakit
    { width: 32 },  // D  Loket
    { width: 34 },  // E  Nomor ID Jaminan
    { width: 26 },  // F  Nama Korban
    { width: 28 },  // G  Nomor Surat Jaminan
    { width: 14 },  // H  Tgl GL
    { width: 16 },  // I  Tgl LAKA (DASI)
    { width: 44 },  // J  Lokasi (DASI)
    { width: 14 },  // K  GL Status
    { width: 24 },  // L  Tahapan
    { width: 20 },  // M  Status Pembayaran
    { width: 22 },  // N  Jumlah Pembayaran
    { width: 16 },  // O  Tgl Pembayaran
    { width: 14 },  // P  Umur (hari)
    { width: 20 },  // Q  Status Verifikasi
    { width: 20 },  // R  Status Tinjauan
  ];

  // ── 1. JUDUL (baris 1) ──
  const rowTitle = ws.addRow([]);
  rowTitle.height = 28;
  ws.mergeCells("A1:R1");
  rowTitle.getCell(1).value = "LAPORAN PERINGATAN GL";
  rowTitle.getCell(1).font = FONT_TITLE;
  rowTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  // ── 2. INFO HEADER (baris 2-8) ──
  const infoData: [string, string][] = [
    ["Tipe Klaim :", "GL"],
    ["Status GL :", "Active"],
    ["Status Pembayaran :", "Unpaid"],
    ["Ambang Peringatan :", `> ${ambangHari} Hari`],
    ["Jumlah Data :", String(baris.length)],
    ["Diekspor oleh :", session.user.name ?? "-"],
    ["Tanggal Ekspor :", formatTanggal(new Date().toISOString().slice(0, 10))],
  ];

  for (const [label, value] of infoData) {
    const rowNum = ws.lastRow!.number + 1;
    const row = ws.addRow([]);

    // Label di-merge A:B agar teks panjang tidak terpotong
    ws.mergeCells(`A${rowNum}:B${rowNum}`);
    row.getCell(1).value = label;
    row.getCell(1).font = FONT_INFO_LABEL;
    row.getCell(1).alignment = { vertical: "middle" };
    row.getCell(3).font = FONT_INFO_VALUE;
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(`D${rowNum}:F${rowNum}`);
    row.getCell(3).value = value;
    row.getCell(4).font = FONT_INFO_VALUE;
    row.getCell(4).alignment = { vertical: "middle" };
  }

  ws.addRow([]);

  // ── 3. HEADER KOLOM TABEL (baris 10) ──
  const kolomHeader = [
    "Tipe Klaim",
    "Tipe Cidera",
    "Nama Rumah Sakit",
    "Loket",
    "Nomor ID Jaminan",
    "Nama Korban",
    "Nomor Surat Jaminan",
    "Tgl GL",
    "Tgl LAKA (DASI)",
    "Lokasi (DASI)",
    "GL Status",
    "Tahapan",
    "Status Pembayaran",
    "Jumlah Pembayaran",
    "Tgl Pembayaran",
    "Umur (hari)",
    "Status Verifikasi",
    "Status Tinjauan",
  ];

  const headerRow = ws.addRow(kolomHeader);
  headerRow.eachCell((cell) => {
    cell.font = FONT_HEADER;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" }, 
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  // ── 4. DATA BARIS ──
  for (const b of baris) {
    const dataRow = ws.addRow([
      b.tipeKlaim,
      b.tipeCidera,
      b.namaRumahSakit ?? "-",
      b.loket,
      b.idJaminan,
      b.namaKorban,
      b.nomorSuratJaminan ?? "-",
      formatTanggal(b.tglGl),
      formatTanggalOpsional(b.tglKejadian),
      b.lokasi ?? "-",
      b.glStatus,
      b.tahapan,
      b.statusPembayaran,
      formatRupiah(b.jumlahPembayaran),
      formatTanggalOpsional(b.tglPembayaran),
      b.umurHari,
      b.statusVerifikasi ?? "-",
      b.sudahDitinjau ? "Sudah Ditinjau" : "Belum Ditinjau",
    ]);

    dataRow.eachCell((cell) => {
      cell.font = FONT_BODY;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  // ── 5. Generate buffer ──
  const buffer = await workbook.xlsx.writeBuffer();

  const namaBerkas = `laporan-peringatan-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
