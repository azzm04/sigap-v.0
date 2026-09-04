import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { ambilDaftarProsesPusat } from "@/lib/gl/proses-pusat";

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

// Sheet rekap dua tingkat: baris KELOMPOK (tanggal + PIC + jumlah + total
// nilai) diikuti baris RINCIAN tiap GL-nya. Empat kolom pertama hanya diisi
// di baris kelompok, empat terakhir hanya di baris rincian -- supaya sekali
// lihat ketahuan "siapa mengajukan berapa" sekaligus "GL apa saja itu".
const KOLOM_REKAP = [
  "No",
  "Tanggal Diajukan",
  "PIC Pengajuan",
  "Jumlah GL Diajukan",
  "Tgl GL",
  "Nama Korban",
  "Nomor Surat Jaminan",
  "Nilai Diajukan",
];

const FORMAT_RUPIAH = '"Rp" #,##0';
const FILL_KELOMPOK: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCE6F1" },
};

const KOLOM_DETAIL = [
  "No",
  "Tanggal Diajukan",
  "PIC Pengajuan",
  "Nama Korban",
  "Nomor ID Jaminan",
  "Nomor Surat Jaminan",
  "Nama Rumah Sakit",
  "Tgl GL",
  "Status Pembayaran",
  "Laporan Survei TKP",
];

/** Date -> "DD/MM/YYYY" menurut WIB, dipakai sebagai kunci pengelompokan rekap */
function tanggalWIB(waktu: Date): string {
  return waktu.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "DD/MM/YYYY" -> angka untuk pengurutan, tanpa bergantung parser tanggal bawaan */
function kunciUrut(tanggal: string): number {
  const [d, m, y] = tanggal.split("/");
  return Number(`${y}${m}${d}`);
}

function tulisJudulDanKeterangan(
  ws: ExcelJS.Worksheet,
  judul: string,
  keterangan: string[],
  jumlahKolom: number,
) {
  const barisJudul = ws.addRow([judul]);
  barisJudul.font = FONT_TITLE;
  barisJudul.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(barisJudul.number, 1, barisJudul.number, jumlahKolom);

  for (const teks of keterangan) {
    const barisInfo = ws.addRow([teks]);
    barisInfo.font = FONT_INFO;
    ws.mergeCells(barisInfo.number, 1, barisInfo.number, jumlahKolom);
  }
  ws.addRow([]);
}

function tulisHeader(ws: ExcelJS.Worksheet, judulKolom: string[]) {
  const barisHeader = ws.addRow(judulKolom);
  barisHeader.eachCell((sel) => {
    sel.font = FONT_HEADER;
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sel.border = THIN_BORDER;
  });
}

// Ekspor daftar GL yang sudah diajukan ke pusat. Filter yang sedang aktif di
// halaman ikut diteruskan lewat query string -- menekan Ekspor saat menyaring
// rentang Tgl GL bulan Januari menghasilkan berkas berisi Januari saja.
// Filter yang dipakai ditulis ulang di baris keterangan supaya penerima
// berkasnya tahu cakupan isinya.
//
// Dua sheet, sengaja dipisah karena jumlah kolomnya beda jauh:
//   "Rekap Pengajuan" -- menjawab "pada tanggal sekian, PIC siapa mengajukan
//                        berapa GL", satu baris per pasangan tanggal+PIC
//   "Daftar GL"       -- rincian tiap GL-nya
//
// Sudah dilindungi middleware, dicek lagi di sini sebagai lapisan kedua
// (pola sama seperti /api/ekspor-pelimpahan).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const picPengajuan = sp.get("pic_pengajuan") || undefined;
  const dari = sp.get("dari") || undefined;
  const sampai = sp.get("sampai") || undefined;
  const cari = sp.get("cari") || undefined;

  const { baris, total } = await ambilDaftarProsesPusat({
    ukuran: 100000,
    picPengajuan,
    dari,
    sampai,
    cari,
  });

  const keterangan = [
    `PIC Pengajuan: ${picPengajuan ?? "Semua"}`,
    `Rentang Tgl GL: ${dari || sampai ? `${dari ?? "awal"} s.d. ${sampai ?? "akhir"}` : "Semua"}`,
    cari ? `Pencarian: ${cari}` : null,
    `Jumlah GL: ${total}`,
    `Dicetak: ${formatWaktu(new Date())}`,
  ].filter((t): t is string => t !== null);

  const workbook = new ExcelJS.Workbook();

  // ---------- Sheet 1: Rekap Pengajuan ----------
  type Kelompok = { tanggal: string; pic: string; anggota: typeof baris };
  const rekap = new Map<string, Kelompok>();
  for (const b of baris) {
    const tanggal = tanggalWIB(b.tahapDicatatPada);
    const pic = b.picPengajuan ?? "(tanpa PIC)";
    const kunci = `${tanggal}|${pic}`;
    const adaSebelumnya = rekap.get(kunci);
    if (adaSebelumnya) adaSebelumnya.anggota.push(b);
    else rekap.set(kunci, { tanggal, pic, anggota: [b] });
  }

  const kelompok = [...rekap.values()].sort(
    (a, b) => kunciUrut(b.tanggal) - kunciUrut(a.tanggal) || a.pic.localeCompare(b.pic),
  );

  const wsRekap = workbook.addWorksheet("Rekap Pengajuan");
  wsRekap.columns = [
    { width: 6 }, // No
    { width: 20 }, // Tanggal Diajukan
    { width: 26 }, // PIC Pengajuan
    { width: 20 }, // Jumlah GL Diajukan
    { width: 14 }, // Tgl GL
    { width: 26 }, // Nama Korban
    { width: 26 }, // Nomor Surat Jaminan
    { width: 20 }, // Nilai Diajukan
  ];
  tulisJudulDanKeterangan(
    wsRekap,
    "REKAP PENGAJUAN BERKAS KE PUSAT",
    keterangan,
    KOLOM_REKAP.length,
  );
  tulisHeader(wsRekap, KOLOM_REKAP);

  let totalNilai = 0;

  kelompok.forEach((k, indeks) => {
    const nilaiKelompok = k.anggota.reduce((jml, b) => jml + b.nilaiDiajukan, 0);
    totalNilai += nilaiKelompok;

    const barisKelompok = wsRekap.addRow([
      indeks + 1,
      k.tanggal,
      k.pic,
      k.anggota.length,
      "",
      "",
      "",
      nilaiKelompok,
    ]);
    barisKelompok.eachCell((sel) => {
      sel.font = FONT_TOTAL;
      sel.border = THIN_BORDER;
      sel.fill = FILL_KELOMPOK;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
    barisKelompok.getCell(8).numFmt = FORMAT_RUPIAH;

    for (const b of k.anggota) {
      const barisRincian = wsRekap.addRow([
        "",
        "",
        "",
        "",
        formatTanggal(b.tglGl),
        b.namaKorban,
        b.nomorSuratJaminan ?? "-",
        b.nilaiDiajukan,
      ]);
      barisRincian.eachCell((sel) => {
        sel.font = FONT_BODY;
        sel.border = THIN_BORDER;
        sel.alignment = { vertical: "middle", wrapText: true };
      });
      barisRincian.getCell(8).numFmt = FORMAT_RUPIAH;
    }
  });

  const barisTotal = wsRekap.addRow(["", "", "TOTAL", total, "", "", "", totalNilai]);
  barisTotal.eachCell((sel) => {
    sel.font = FONT_TOTAL;
    sel.border = THIN_BORDER;
    sel.alignment = { vertical: "middle" };
  });
  barisTotal.getCell(8).numFmt = FORMAT_RUPIAH;

  // ---------- Sheet 2: Daftar GL ----------
  const wsDetail = workbook.addWorksheet("Daftar GL");
  wsDetail.columns = [
    { width: 6 }, // No
    { width: 20 }, // Tanggal Diajukan
    { width: 24 }, // PIC Pengajuan
    { width: 26 }, // Nama Korban
    { width: 30 }, // Nomor ID Jaminan
    { width: 26 }, // Nomor Surat Jaminan
    { width: 36 }, // Nama Rumah Sakit
    { width: 14 }, // Tgl GL
    { width: 18 }, // Status Pembayaran
    { width: 30 }, // Laporan Survei TKP
  ];
  tulisJudulDanKeterangan(
    wsDetail,
    "DAFTAR GL YANG SUDAH DIAJUKAN KE PUSAT",
    keterangan,
    KOLOM_DETAIL.length,
  );
  tulisHeader(wsDetail, KOLOM_DETAIL);

  baris.forEach((b, indeks) => {
    const barisData = wsDetail.addRow([
      indeks + 1,
      formatWaktu(b.tahapDicatatPada),
      b.picPengajuan ?? "-",
      b.namaKorban,
      b.idJaminan,
      b.nomorSuratJaminan ?? "-",
      b.namaRumahSakit ?? "-",
      formatTanggal(b.tglGl),
      b.statusPembayaran,
      b.laporanTkpNomorLp ?? "-",
    ]);
    barisData.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const namaBerkas = `proses-pusat-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
