import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { ambilDaftarPelimpahan } from "@/lib/gl/daftar-pelimpahan";
import { TAHAP_BELUM_LIMPAH } from "@/lib/gl/pelimpahan";

const FONT_BODY: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12 };
const FONT_TITLE: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 16, bold: true };
const FONT_INFO: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11 };
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

const JUDUL_KOLOM = [
  "No",
  "Loket Cabang",
  "Nama Korban",
  "Nomor ID Jaminan",
  "Nomor Surat Jaminan",
  "Nama Rumah Sakit",
  "PIC Pengajuan",
  "Tgl GL",
  "Dicatat pada",
  "Status Pembayaran",
];

// Ekspor daftar berkas yang belum dilimpahkan. Filter yang sedang aktif di
// halaman ikut diteruskan lewat query string -- jadi menekan Ekspor saat
// menyaring satu loket menghasilkan berkas berisi loket itu saja, bukan
// seluruh data. Filter yang dipakai ditulis ulang di baris keterangan
// supaya penerima berkasnya tahu isi yang dia pegang cakupannya apa.
//
// Sudah dilindungi middleware, dicek lagi di sini sebagai lapisan kedua
// (pola sama seperti /api/ekspor dan /api/ekspor-peringatan).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const loketPelimpahan = sp.get("loket_pelimpahan") || undefined;
  const picPengajuan = sp.get("pic_pengajuan") || undefined;
  const dari = sp.get("dari") || undefined;
  const sampai = sp.get("sampai") || undefined;
  const cari = sp.get("cari") || undefined;

  const { baris, total } = await ambilDaftarPelimpahan({
    ukuran: 100000,
    loketPelimpahan,
    picPengajuan,
    dari,
    sampai,
    cari,
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Belum Dilimpahkan");

  ws.columns = [
    { width: 6 }, // No
    { width: 38 }, // Loket Cabang
    { width: 26 }, // Nama Korban
    { width: 30 }, // Nomor ID Jaminan
    { width: 26 }, // Nomor Surat Jaminan
    { width: 36 }, // Nama Rumah Sakit
    { width: 22 }, // PIC Pengajuan
    { width: 14 }, // Tgl GL
    { width: 20 }, // Dicatat pada
    { width: 18 }, // Status Pembayaran
  ];

  const judul = ws.addRow([`DAFTAR BERKAS ${TAHAP_BELUM_LIMPAH.toUpperCase()}`]);
  judul.font = FONT_TITLE;
  judul.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(judul.number, 1, judul.number, JUDUL_KOLOM.length);

  const keterangan = [
    `Loket Cabang: ${loketPelimpahan ?? "Semua loket"}`,
    `PIC Pengajuan: ${picPengajuan ?? "Semua"}`,
    `Rentang Tgl GL: ${dari || sampai ? `${dari ?? "awal"} s.d. ${sampai ?? "akhir"}` : "Semua"}`,
    cari ? `Pencarian: ${cari}` : null,
    `Jumlah GL: ${total}`,
    `Dicetak: ${formatWaktu(new Date())}`,
  ].filter((t): t is string => t !== null);

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

  baris.forEach((b, indeks) => {
    const barisData = ws.addRow([
      indeks + 1,
      b.loketPelimpahan ?? "-",
      b.namaKorban,
      b.idJaminan,
      b.nomorSuratJaminan ?? "-",
      b.namaRumahSakit ?? "-",
      b.picPengajuan ?? "-",
      formatTanggal(b.tglGl),
      formatWaktu(b.dicatatPada),
      b.statusPembayaran,
    ]);
    barisData.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const namaBerkas = `belum-dilimpahkan-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
