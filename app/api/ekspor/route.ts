import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { formatTanggal } from "@/lib/format";
import { ambilDataUntukEkspor } from "@/lib/gl/ekspor";

// Sudah dilindungi middleware (matcher menyertakan /api/ekspor), dicek lagi
// di sini sebagai lapisan kedua.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const baris = await ambilDataUntukEkspor({
    loket: sp.get("loket") || undefined,
    tahapan: sp.get("tahapan") || undefined,
    statusPembayaran: sp.get("status_pembayaran") || undefined,
    glStatus: sp.get("gl_status") || undefined,
    picTaskForce: sp.get("pic_task_force") || undefined,
    picPengajuan: sp.get("pic_pengajuan") || undefined,
    dari: sp.get("dari") || undefined,
    sampai: sp.get("sampai") || undefined,
    cari: sp.get("cari") || undefined,
  });

  const data = baris.map((b) => ({
    Loket: b.loket,
    "Nomor ID Jaminan": b.idJaminan,
    "Nama Korban": b.namaKorban,
    "Tgl GL": formatTanggal(b.tglGl),
    "Umur (hari)": b.umurHari,
    Tahapan: b.tahapan,
    "Status GL": b.glStatus,
    "Status Pembayaran": b.statusPembayaran,
    "Nilai Diajukan": b.nilaiDiajukan,
    "Nilai Disetujui": b.nilaiDisetujui,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 24 }, // Loket
    { wch: 28 }, // Nomor ID Jaminan
    { wch: 22 }, // Nama Korban
    { wch: 12 }, // Tgl GL
    { wch: 12 }, // Umur (hari)
    { wch: 22 }, // Tahapan
    { wch: 10 }, // Status GL
    { wch: 16 }, // Status Pembayaran
    { wch: 16 }, // Nilai Diajukan
    { wch: 16 }, // Nilai Disetujui
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar GL");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const namaBerkas = `daftar-gl-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
