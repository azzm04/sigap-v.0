import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatTanggal, tanggalHariIniWIB } from "@/lib/format";
import { ambilDetailRumahSakit } from "@/lib/gl/sebaran";

const FONT_BODY: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12 };
const FONT_TITLE: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 16, bold: true };
const FONT_INFO: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11 };
const FONT_TOTAL: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12, bold: true };
const FONT_HEADER: Partial<ExcelJS.Font> = {
  name: "Times New Roman",
  size: 12,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

// Warna baris total, disamakan dengan status-near-bg/status-safe-bg/status-info-bg (app/globals.css)
const FILL_UNPAID: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF2E6" } };
const FILL_PAID: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4EC" } };
const FILL_AKTIF: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F6FE" } };

const JUDUL_KOLOM = ["No", "Tahapan GL", "Jumlah GL", "Nominal (Nilai Disetujui)"];
const FORMAT_RUPIAH = '"Rp" #,##0';

// Ekspor persis mengikuti tabel di halaman /sebaran/[nama]: rincian per
// Tahapan (Active + Unpaid saja, GL Paid tidak dipecah tahapannya) diikuti
// tiga baris total (Unpaid/Paid/Aktif) dengan warna yang sama seperti di layar.
//
// Sudah dilindungi middleware, dicek lagi di sini sebagai lapisan kedua
// (pola sama seperti /api/ekspor-pelimpahan).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const namaRumahSakit = request.nextUrl.searchParams.get("nama");
  if (!namaRumahSakit) {
    return NextResponse.json({ pesan: "Nama rumah sakit wajib diisi." }, { status: 400 });
  }

  const detail = await ambilDetailRumahSakit(namaRumahSakit);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Sebaran Rumah Sakit");

  ws.columns = [
    { width: 6 }, // No
    { width: 36 }, // Tahapan GL
    { width: 16 }, // Jumlah GL
    { width: 22 }, // Nominal (Nilai Disetujui)
  ];

  const judul = ws.addRow([namaRumahSakit.toUpperCase()]);
  judul.font = FONT_TITLE;
  judul.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(judul.number, 1, judul.number, JUDUL_KOLOM.length);

  const keterangan = [
    `Per ${formatTanggal(tanggalHariIniWIB())}`,
    `Total GL: ${detail.totalGL}`,
    `GL Berstatus Cancel: ${detail.totalCancel}`,
    `Dicetak: ${formatTanggal(tanggalHariIniWIB())}`,
  ];
  for (const teks of keterangan) {
    const barisInfo = ws.addRow([teks]);
    barisInfo.font = FONT_INFO;
    ws.mergeCells(barisInfo.number, 1, barisInfo.number, JUDUL_KOLOM.length);
  }
  ws.addRow([]);

  const barisHeader = ws.addRow(JUDUL_KOLOM);
  barisHeader.eachCell((sel) => {
    sel.font = FONT_HEADER;
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sel.border = THIN_BORDER;
  });

  if (detail.tahapan.length === 0) {
    const barisKosong = ws.addRow(["", "Tidak ada GL Unpaid untuk rumah sakit ini.", "", ""]);
    ws.mergeCells(barisKosong.number, 2, barisKosong.number, 3);
    barisKosong.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  detail.tahapan.forEach((t, indeks) => {
    const baris = ws.addRow([indeks + 1, t.tahapan, t.jumlah, t.nominal]);
    baris.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
    baris.getCell(4).numFmt = FORMAT_RUPIAH;
  });

  function tulisBarisTotal(label: string, jumlah: number, nominal: number, fill: ExcelJS.Fill) {
    const baris = ws.addRow(["", label, jumlah, nominal]);
    ws.mergeCells(baris.number, 1, baris.number, 2);
    baris.eachCell((sel) => {
      sel.font = FONT_TOTAL;
      sel.border = THIN_BORDER;
      sel.fill = fill;
      sel.alignment = { vertical: "middle" };
    });
    baris.getCell(4).numFmt = FORMAT_RUPIAH;
  }

  tulisBarisTotal("Total Unpaid", detail.totalUnpaid.jumlah, detail.totalUnpaid.nominal, FILL_UNPAID);
  tulisBarisTotal("Total Paid", detail.totalPaid.jumlah, detail.totalPaid.nominal, FILL_PAID);
  tulisBarisTotal("Total GL Aktif", detail.totalAktif.jumlah, detail.totalAktif.nominal, FILL_AKTIF);

  const buffer = await workbook.xlsx.writeBuffer();
  const namaBerkas = `sebaran-${namaRumahSakit.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
