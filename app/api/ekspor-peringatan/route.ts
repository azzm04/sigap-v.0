import { type NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { formatRupiah, formatTanggal, formatTanggalOpsional, formatWaktu } from "@/lib/format";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";
import { ambilPeringatanTaskForce } from "@/lib/gl/peringatan-task-force";
import { ambilSemuaTinjauan } from "@/lib/gl/semua-tinjauan";

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

// Blok judul + info dua-kolom (label di A:B, nilai di C dengan D:F ikut
// digaya supaya sejajar) -- gaya asli sheet "Pengajuan Pusat", dipakai ulang
// di ketiga tab supaya berkas ekspor peringatan konsisten satu sama lain.
function tulisJudulDanInfo(
  ws: ExcelJS.Worksheet,
  judul: string,
  info: [string, string][],
  jumlahKolom: number,
) {
  const rowTitle = ws.addRow([]);
  rowTitle.height = 28;
  ws.mergeCells(rowTitle.number, 1, rowTitle.number, jumlahKolom);
  rowTitle.getCell(1).value = judul;
  rowTitle.getCell(1).font = FONT_TITLE;
  rowTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  for (const [label, value] of info) {
    const rowNum = ws.lastRow!.number + 1;
    const row = ws.addRow([]);

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
}

function tulisHeaderKolom(ws: ExcelJS.Worksheet, kolom: string[]) {
  const headerRow = ws.addRow(kolom);
  headerRow.eachCell((cell) => {
    cell.font = FONT_HEADER;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;
}

function tulisBarisData(ws: ExcelJS.Worksheet, nilai: (string | number)[]) {
  const row = ws.addRow(nilai);
  row.eachCell((cell) => {
    cell.font = FONT_BODY;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "top", wrapText: true };
  });
  return row;
}

function kirimWorkbook(workbook: ExcelJS.Workbook, namaBerkas: string) {
  return workbook.xlsx.writeBuffer().then(
    (buffer) =>
      new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${namaBerkas}"`,
        },
      }),
  );
}

// Ekspor mengikuti tab yang sedang aktif di halaman Laporan Peringatan
// (query param "tab", sama seperti yang dipakai TabPeringatan) DAN filter
// yang sedang aktif di tab itu -- supaya menekan Ekspor Data menghasilkan
// berkas yang persis sama dengan tabel yang sedang dilihat petugas, bukan
// selalu seluruh data tab "Pengajuan Pusat".
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const tab = sp.get("tab") === "catatan" ? "catatan" : sp.get("tab") === "task-force" ? "task-force" : "gl";
  const namaPengekspor = session.user.name ?? "-";
  const tanggalEkspor = formatTanggal(new Date().toISOString().slice(0, 10));

  if (tab === "task-force") {
    return eksporTaskForce(sp, namaPengekspor, tanggalEkspor);
  }
  if (tab === "catatan") {
    return eksporCatatan(sp, namaPengekspor, tanggalEkspor);
  }
  return eksporGL(sp, namaPengekspor, tanggalEkspor);
}

async function eksporGL(sp: URLSearchParams, namaPengekspor: string, tanggalEkspor: string) {
  const statusTinjauanRaw = sp.get("status_tinjauan");
  const statusTinjauan = statusTinjauanRaw === "sudah" || statusTinjauanRaw === "belum" ? statusTinjauanRaw : undefined;
  const statusDokumenRaw = sp.get("status_dokumen");
  const statusDokumen =
    statusDokumenRaw === "lengkap" || statusDokumenRaw === "belum_lengkap" ? statusDokumenRaw : undefined;
  const cari = sp.get("cari") || undefined;
  const dari = sp.get("dari") || undefined;
  const sampai = sp.get("sampai") || undefined;
  const picPengajuan = sp.get("pic_pengajuan") || undefined;

  const { baris, ambangHari } = await ambilPapanPeringatan({
    ukuran: 100000,
    cari,
    dari,
    sampai,
    statusTinjauan,
    statusDokumen,
    picPengajuan,
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Laporan Peringatan");

  ws.columns = [
    { width: 14 }, // A  Tipe Klaim
    { width: 16 }, // B  Tipe Cidera
    { width: 36 }, // C  Nama Rumah Sakit
    { width: 32 }, // D  Loket
    { width: 34 }, // E  Nomor ID Jaminan
    { width: 26 }, // F  Nama Korban
    { width: 28 }, // G  Nomor Surat Jaminan
    { width: 14 }, // H  Tgl GL
    { width: 16 }, // I  Tgl LAKA (DASI)
    { width: 44 }, // J  Lokasi (DASI)
    { width: 14 }, // K  GL Status
    { width: 24 }, // L  Tahapan
    { width: 20 }, // M  Status Pembayaran
    { width: 22 }, // N  Jumlah Pembayaran
    { width: 16 }, // O  Tgl Pembayaran
    { width: 14 }, // P  Umur (hari)
    { width: 20 }, // Q  Status Verifikasi
    { width: 20 }, // R  Status Tinjauan
    { width: 22 }, // S  Status Dokumen
  ];

  tulisJudulDanInfo(
    ws,
    "LAPORAN PERINGATAN GL",
    [
      ["Tipe Klaim :", "GL"],
      ["Status GL :", "Active"],
      ["Status Pembayaran :", "Unpaid"],
      ["Ambang Peringatan :", `> ${ambangHari} Hari`],
      ["Pencarian :", cari ?? "Semua"],
      ["Rentang Tgl GL :", dari || sampai ? `${dari ?? "awal"} s.d. ${sampai ?? "akhir"}` : "Semua"],
      ["Status Tinjauan :", statusTinjauan === "sudah" ? "Sudah Ditinjau" : statusTinjauan === "belum" ? "Belum Ditinjau" : "Semua"],
      ["Status Dokumen :", statusDokumen === "lengkap" ? "Lengkap" : statusDokumen === "belum_lengkap" ? "Belum Lengkap" : "Semua"],
      ["PIC Pengajuan :", picPengajuan ?? "Semua"],
      ["Jumlah Data :", String(baris.length)],
      ["Diekspor oleh :", namaPengekspor],
      ["Tanggal Ekspor :", tanggalEkspor],
    ],
    19,
  );

  tulisHeaderKolom(ws, [
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
    "Status Dokumen",
  ]);

  for (const b of baris) {
    tulisBarisData(ws, [
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
      b.statusDokumen,
    ]);
  }

  return kirimWorkbook(workbook, `laporan-peringatan-pengajuan-pusat-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function eksporTaskForce(sp: URLSearchParams, namaPengekspor: string, tanggalEkspor: string) {
  const statusTinjauanRaw = sp.get("status_tinjauan_task_force");
  const statusTinjauan = statusTinjauanRaw === "sudah" || statusTinjauanRaw === "belum" ? statusTinjauanRaw : undefined;
  const cari = sp.get("cari_task_force") || undefined;
  const picTaskForce = sp.get("pic_task_force") || undefined;
  const dari = sp.get("dari_task_force") || undefined;
  const sampai = sp.get("sampai_task_force") || undefined;

  const { baris, ambangHari } = await ambilPeringatanTaskForce({
    ukuran: 100000,
    cari,
    picTaskForce,
    statusTinjauan,
    dari,
    sampai,
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Kunjungan Rumah Sakit");

  ws.columns = [
    { width: 26 }, // A Nama Korban
    { width: 30 }, // B Nomor ID Jaminan
    { width: 36 }, // C Nama Rumah Sakit
    { width: 22 }, // D PIC Task Force
    { width: 20 }, // E Loket
    { width: 22 }, // F Tahapan
    { width: 16 }, // G Tanggal Masuk
    { width: 16 }, // H Umur Sejak Masuk (hari)
    { width: 22 }, // I Dasar Umur
    { width: 32 }, // J Data Belum Lengkap
    { width: 18 }, // K Status Tinjauan
  ];

  tulisJudulDanInfo(
    ws,
    "LAPORAN PERINGATAN PIC TASK FORCE (KUNJUNGAN RUMAH SAKIT)",
    [
      ["Ambang Peringatan :", `> ${ambangHari} Hari`],
      ["Pencarian :", cari ?? "Semua"],
      ["PIC Task Force :", picTaskForce ?? "Semua"],
      ["Status Tinjauan :", statusTinjauan === "sudah" ? "Sudah Ditinjau" : statusTinjauan === "belum" ? "Belum Ditinjau" : "Semua"],
      ["Rentang Tgl GL :", dari || sampai ? `${dari ?? "awal"} s.d. ${sampai ?? "akhir"}` : "Semua"],
      ["Jumlah Data :", String(baris.length)],
      ["Diekspor oleh :", namaPengekspor],
      ["Tanggal Ekspor :", tanggalEkspor],
    ],
    11,
  );

  tulisHeaderKolom(ws, [
    "Nama Korban",
    "Nomor ID Jaminan",
    "Nama Rumah Sakit",
    "PIC Task Force",
    "Loket",
    "Tahapan",
    "Tanggal Masuk",
    "Umur Sejak Masuk (hari)",
    "Dasar Umur",
    "Data Belum Lengkap",
    "Status Tinjauan",
  ]);

  for (const b of baris) {
    const dasarUmur =
      b.sumberUmurTaskForce === "tanggalMasuk"
        ? "Tanggal Masuk"
        : b.sumberUmurTaskForce === "tglKejadian"
          ? "berdasarkan Tgl LAKA"
          : "berdasarkan Tgl GL";
    const dataBelumLengkap =
      [!b.tanggalPulangPasien ? "Tanggal Pulang Pasien" : null, !b.lokasi ? "Lokasi LAKA" : null]
        .filter((t): t is string => t !== null)
        .join(", ") || "-";

    tulisBarisData(ws, [
      b.namaKorban,
      b.idJaminan,
      b.namaRumahSakit ?? "-",
      b.picTaskForce ?? "-",
      b.loket,
      b.tahapan,
      formatTanggalOpsional(b.tanggalMasuk),
      b.umurSejakMasuk,
      dasarUmur,
      dataBelumLengkap,
      b.sudahDitinjau ? "Sudah Ditinjau" : "Belum Ditinjau",
    ]);
  }

  return kirimWorkbook(
    workbook,
    `laporan-peringatan-kunjungan-rumah-sakit-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

async function eksporCatatan(sp: URLSearchParams, namaPengekspor: string, tanggalEkspor: string) {
  const labelRaw = sp.get("label");
  const label = labelRaw === "tindak_lanjut" || labelRaw === "diabaikan" ? labelRaw : undefined;
  const cari = sp.get("cari_catatan") || undefined;
  const namaRumahSakit = sp.get("rumah_sakit_catatan") || undefined;
  const dari = sp.get("dari_catatan") || undefined;
  const sampai = sp.get("sampai_catatan") || undefined;

  const { baris } = await ambilSemuaTinjauan({
    ukuran: 100000,
    cari,
    label,
    namaRumahSakit,
    dari,
    sampai,
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Catatan Tinjauan");

  ws.columns = [
    { width: 26 }, // A Nama Korban
    { width: 30 }, // B Nomor ID Jaminan
    { width: 26 }, // C Nomor Surat Jaminan
    { width: 14 }, // D Tgl GL
    { width: 20 }, // E Waktu Catatan
    { width: 22 }, // F Tahapan
    { width: 36 }, // G Nama Rumah Sakit
    { width: 50 }, // H Catatan
  ];

  tulisJudulDanInfo(
    ws,
    "LAPORAN CATATAN TINJAUAN",
    [
      ["Pencarian :", cari ?? "Semua"],
      ["Label :", label === "tindak_lanjut" ? "Perlu Tindak Lanjut" : label === "diabaikan" ? "Diabaikan (Paid Manual)" : "Semua"],
      ["Nama Rumah Sakit :", namaRumahSakit ?? "Semua"],
      ["Rentang Tgl GL :", dari || sampai ? `${dari ?? "awal"} s.d. ${sampai ?? "akhir"}` : "Semua"],
      ["Jumlah Data :", String(baris.length)],
      ["Diekspor oleh :", namaPengekspor],
      ["Tanggal Ekspor :", tanggalEkspor],
    ],
    8,
  );

  tulisHeaderKolom(ws, [
    "Nama Korban",
    "Nomor ID Jaminan",
    "Nomor Surat Jaminan",
    "Tgl GL",
    "Waktu Catatan",
    "Tahapan",
    "Nama Rumah Sakit",
    "Catatan",
  ]);

  for (const c of baris) {
    tulisBarisData(ws, [
      c.namaKorban,
      c.idJaminan,
      c.nomorSuratJaminan ?? "-",
      formatTanggal(c.tglGl),
      formatWaktu(c.ditinjauPada),
      c.tahapan,
      c.namaRumahSakit ?? "-",
      c.catatan,
    ]);
  }

  return kirimWorkbook(workbook, `laporan-catatan-tinjauan-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
