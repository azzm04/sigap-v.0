import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatTanggal, tanggalHariIniWIB } from "@/lib/format";
import {
  ambilDetailRumahSakit,
  ambilRincianGLRumahSakit,
  isKunciKelompokTahapan,
  KELOMPOK_TAHAPAN_GL,
} from "@/lib/gl/sebaran";

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

const JUDUL_KOLOM = ["No", "Tahapan GL", "Jumlah GL", "Nominal (Nilai Disetujui)", "Nominal (Nilai Dibayar)"];
const FORMAT_RUPIAH = '"Rp" #,##0';

// Ekspor persis mengikuti tabel di halaman /sebaran/[nama]: rincian per
// Tahapan (Active + Unpaid saja, GL Paid tidak dipecah tahapannya) diikuti
// tiga baris total (Unpaid/Paid/Aktif) dengan warna yang sama seperti di layar.
// Nominal ditampilkan dua macam: Nilai Disetujui dan Nilai Dibayar -- sesuai
// arahan pemilik proyek (lihat lib/gl/sebaran.ts).
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
  const dari = request.nextUrl.searchParams.get("dari") ?? undefined;
  const sampai = request.nextUrl.searchParams.get("sampai") ?? undefined;
  const kelompokMentah = request.nextUrl.searchParams.get("kelompok") ?? undefined;
  const kelompok = isKunciKelompokTahapan(kelompokMentah) ? kelompokMentah : undefined;

  const detail = await ambilDetailRumahSakit(namaRumahSakit, { dari, sampai, kelompok });
  const rincian = await ambilRincianGLRumahSakit(namaRumahSakit, { dari, sampai, kelompok });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Sebaran Rumah Sakit");

  ws.columns = [
    { width: 6 }, // No
    { width: 36 }, // Tahapan GL
    { width: 16 }, // Jumlah GL
    { width: 22 }, // Nominal (Nilai Disetujui)
    { width: 22 }, // Nominal (Nilai Dibayar)
  ];

  const judul = ws.addRow([namaRumahSakit.toUpperCase()]);
  judul.font = FONT_TITLE;
  judul.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(judul.number, 1, judul.number, JUDUL_KOLOM.length);

  const keterangan = [
    `Per ${formatTanggal(tanggalHariIniWIB())}`,
    dari || sampai ? `Rentang Tgl GL: ${dari ? formatTanggal(dari) : "awal"} - ${sampai ? formatTanggal(sampai) : "sekarang"}` : null,
    kelompok ? `Kelompok Tahapan: ${KELOMPOK_TAHAPAN_GL[kelompok].label}` : null,
    `Total GL: ${detail.totalGL}`,
    `GL Berstatus Cancel: ${detail.totalCancel}`,
    `Nilai Pembayaran: ${detail.nilaiPembayaran}`,
    `Dicetak: ${formatTanggal(tanggalHariIniWIB())}`,
  ].filter((baris): baris is string => baris !== null);
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
    const barisKosong = ws.addRow(["", "Tidak ada GL Unpaid untuk rumah sakit ini.", "", "", ""]);
    ws.mergeCells(barisKosong.number, 2, barisKosong.number, 4);
    barisKosong.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  detail.tahapan.forEach((t, indeks) => {
    const baris = ws.addRow([indeks + 1, t.tahapan, t.jumlah, t.nominalDisetujui, t.nominalDibayar]);
    baris.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
    baris.getCell(4).numFmt = FORMAT_RUPIAH;
    baris.getCell(5).numFmt = FORMAT_RUPIAH;
  });

  function tulisBarisTotal(
    label: string,
    jumlah: number,
    nominalDisetujui: number,
    nominalDibayar: number,
    fill: ExcelJS.Fill,
  ) {
    const baris = ws.addRow(["", label, jumlah, nominalDisetujui, nominalDibayar]);
    ws.mergeCells(baris.number, 1, baris.number, 2);
    baris.eachCell((sel) => {
      sel.font = FONT_TOTAL;
      sel.border = THIN_BORDER;
      sel.fill = fill;
      sel.alignment = { vertical: "middle" };
    });
    baris.getCell(4).numFmt = FORMAT_RUPIAH;
    baris.getCell(5).numFmt = FORMAT_RUPIAH;
  }

  tulisBarisTotal(
    "Total Unpaid",
    detail.totalUnpaid.jumlah,
    detail.totalUnpaid.nominalDisetujui,
    detail.totalUnpaid.nominalDibayar,
    FILL_UNPAID,
  );
  tulisBarisTotal(
    "Total Paid",
    detail.totalPaid.jumlah,
    detail.totalPaid.nominalDisetujui,
    detail.totalPaid.nominalDibayar,
    FILL_PAID,
  );
  tulisBarisTotal(
    "Total GL Aktif",
    detail.totalAktif.jumlah,
    detail.totalAktif.nominalDisetujui,
    detail.totalAktif.nominalDibayar,
    FILL_AKTIF,
  );

  // Tabel kedua: rincian per-record GL (bukan agregat per tahapan) --
  // HANYA muncul di file Excel ini, TIDAK di halaman web /sebaran/[nama],
  // sesuai permintaan pemilik proyek. Digabung jadi 1 tabel seperti contoh
  // referensi (Lampiran 2 - Daftar GL): kolom No, Nama Korban, Nomor Surat
  // Jaminan, Tgl GL, Tahapan, Status Pembayaran, Nilai Diajukan, Nilai
  // Disetujui, Jumlah Pembayaran -- ikut filter Rentang Tgl GL & Kelompok
  // Tahapan yang sama seperti tabel ringkasan di atas.
  ws.addRow([]);
  ws.addRow([]);
  const JUDUL_RINCIAN = [
    "No",
    "Nama Korban",
    "Nomor Surat Jaminan",
    "Tgl GL",
    "Tahapan",
    "Status Pembayaran",
    "Nilai Diajukan",
    "Nilai Disetujui",
    "Jumlah Pembayaran",
  ];
  const judulRincian = ws.addRow(["RINCIAN GL (PER RECORD)"]);
  judulRincian.font = FONT_TITLE;
  judulRincian.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(judulRincian.number, 1, judulRincian.number, JUDUL_RINCIAN.length);

  const barisHeaderRincian = ws.addRow(JUDUL_RINCIAN);
  barisHeaderRincian.eachCell((sel) => {
    sel.font = FONT_HEADER;
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sel.border = THIN_BORDER;
  });

  if (rincian.length === 0) {
    const barisKosong = ws.addRow(["", "Tidak ada rincian GL untuk rumah sakit ini.", "", "", "", "", "", "", ""]);
    ws.mergeCells(barisKosong.number, 2, barisKosong.number, JUDUL_RINCIAN.length);
    barisKosong.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  rincian.forEach((r, indeks) => {
    const baris = ws.addRow([
      indeks + 1,
      r.namaKorban,
      r.nomorSuratJaminan ?? "-",
      formatTanggal(r.tglGl),
      r.tahapan,
      r.statusPembayaran,
      r.nilaiDiajukan,
      r.nilaiDisetujui,
      r.jumlahPembayaran,
    ]);
    baris.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
    baris.getCell(7).numFmt = FORMAT_RUPIAH;
    baris.getCell(8).numFmt = FORMAT_RUPIAH;
    baris.getCell(9).numFmt = FORMAT_RUPIAH;
  });

  ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 26;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  const namaBerkas = `sebaran-${namaRumahSakit.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
