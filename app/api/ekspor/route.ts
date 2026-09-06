import ExcelJS from "exceljs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatTanggal } from "@/lib/format";
import { ambilDataUntukEkspor } from "@/lib/gl/ekspor";
import type { FilterDaftarGL } from "@/lib/gl/queries";

const FONT_BODY: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 12 };
const FONT_TITLE: Partial<ExcelJS.Font> = {
  name: "Times New Roman",
  size: 16,
  bold: true,
};
const FONT_INFO_LABEL: Partial<ExcelJS.Font> = {
  name: "Times New Roman",
  size: 11,
  bold: true,
};
const FONT_INFO_NILAI: Partial<ExcelJS.Font> = {
  name: "Times New Roman",
  size: 11,
  bold: true,
};
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
  "Nama Korban",
  "Nomor Surat Jaminan",
  "Nama Rumah Sakit",
  "Loket Cabang",
  "PIC Task Force",
  "PIC Pengajuan",
  "Tgl GL",
  "Tahapan",
  "Status Pembayaran",
  "Nilai Diajukan",
];

function labelStatusDuplikatNama(nilai: string | undefined): string {
  if (nilai === "duplikat") return "Nama Sama (>1 GL)";
  if (nilai === "unik") return "Nama Unik (1 GL)";
  return "ALL";
}

function labelRentangTglGl(
  dari: string | undefined,
  sampai: string | undefined,
): string {
  if (!dari && !sampai) return "ALL";
  return `${dari ? formatTanggal(dari) : "-"} s.d. ${sampai ? formatTanggal(sampai) : "-"}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const statusDuplikatNamaMentah = sp.get("status_duplikat_nama");
  const statusDuplikatNama =
    statusDuplikatNamaMentah === "duplikat" ||
    statusDuplikatNamaMentah === "unik"
      ? statusDuplikatNamaMentah
      : undefined;

  const filter: FilterDaftarGL = {
    loket: sp.get("loket") || undefined,
    tahapan: sp.get("tahapan") || undefined,
    statusPembayaran: sp.get("status_pembayaran") || undefined,
    glStatus: sp.get("gl_status") || undefined,
    namaRumahSakit: sp.get("nama_rumah_sakit") || undefined,
    picTaskForce: sp.get("pic_task_force") || undefined,
    picPengajuan: sp.get("pic_pengajuan") || undefined,
    dari: sp.get("dari") || undefined,
    sampai: sp.get("sampai") || undefined,
    cari: sp.get("cari") || undefined,
    statusDuplikatNama,
  };

  const baris = await ambilDataUntukEkspor(filter);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Daftar GL");

  ws.columns = [
    { width: 6 }, // No
    { width: 26 }, // Nama Korban
    { width: 26 }, // Nomor Surat Jaminan
    { width: 36 }, // Nama Rumah Sakit
    { width: 20 }, // Loket Cabang
    { width: 20 }, // PIC Task Force
    { width: 20 }, // PIC Pengajuan
    { width: 14 }, // Tgl GL
    { width: 24 }, // Tahapan
    { width: 18 }, // Status Pembayaran
    { width: 18 }, // Nilai Diajukan
  ];

  const judul = ws.addRow(["DAFTAR GL"]);
  judul.font = FONT_TITLE;
  judul.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells(judul.number, 1, judul.number, JUDUL_KOLOM.length);

  ws.addRow([]);

  const infoFilter: [string, string][] = [
    ["Tahapan", filter.tahapan ?? "ALL"],
    ["Status Pembayaran", filter.statusPembayaran ?? "ALL"],
    ["GL Status", filter.glStatus ?? "ALL"],
    ["Nama Rumah Sakit", filter.namaRumahSakit ?? "ALL"],
    ["PIC Task Force", filter.picTaskForce ?? "ALL"],
    ["PIC Pengajuan", filter.picPengajuan ?? "ALL"],
    ["Nama Korban", labelStatusDuplikatNama(filter.statusDuplikatNama)],
    ["Rentang Tgl GL", labelRentangTglGl(filter.dari, filter.sampai)],
    ["Pencarian", filter.cari ?? "ALL"],
  ];

  for (const [label, nilai] of infoFilter) {
    const barisInfo = ws.addRow([`${label} :`, nilai]);
    barisInfo.getCell(1).font = FONT_INFO_LABEL;
    barisInfo.getCell(2).font = FONT_INFO_NILAI;
  }

  ws.addRow([]);

  const barisHeader = ws.addRow(JUDUL_KOLOM);
  barisHeader.eachCell((sel) => {
    sel.font = FONT_HEADER;
    sel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };
    sel.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    sel.border = THIN_BORDER;
  });

  baris.forEach((b, indeks) => {
    const barisData = ws.addRow([
      indeks + 1,
      b.namaKorban,
      b.nomorSuratJaminan ?? "-",
      b.namaRumahSakit ?? "-",
      b.loket,
      b.picTaskForce ?? "-",
      b.picPengajuan ?? "-",
      formatTanggal(b.tglGl),
      b.tahapan,
      b.statusPembayaran,
      b.nilaiDiajukan,
    ]);
    barisData.eachCell((sel) => {
      sel.font = FONT_BODY;
      sel.border = THIN_BORDER;
      sel.alignment = { vertical: "middle", wrapText: true };
    });
    barisData.getCell(11).numFmt = "#,##0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const namaBerkas = `daftar-gl-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
