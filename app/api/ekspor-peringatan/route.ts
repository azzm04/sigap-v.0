import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { formatTanggal } from "@/lib/format";
import { ambilPapanPeringatan } from "@/lib/gl/peringatan";

// Sudah dilindungi middleware (matcher menyertakan /api/ekspor-peringatan),
// dicek lagi di sini sebagai lapisan kedua.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  // ukuran besar supaya seluruh baris papan peringatan ikut terekspor,
  // bukan cuma satu halaman tampilan.
  const { baris } = await ambilPapanPeringatan({ ukuran: 100000 });

  const data = baris.map((b) => ({
    "Nomor ID Jaminan": b.idJaminan,
    "Nama Korban": b.namaKorban,
    Loket: b.loket,
    "Nama Rumah Sakit": b.namaRumahSakit ?? "-",
    "Tipe Cidera": b.tipeCidera,
    "Tgl GL": formatTanggal(b.tglGl),
    Tahapan: b.tahapan,
    "Status Pembayaran": b.statusPembayaran,
    "Umur (hari)": b.umurHari,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 28 }, // Nomor ID Jaminan
    { wch: 22 }, // Nama Korban
    { wch: 24 }, // Loket
    { wch: 28 }, // Nama Rumah Sakit
    { wch: 16 }, // Tipe Cidera
    { wch: 12 }, // Tgl GL
    { wch: 18 }, // Tahapan
    { wch: 16 }, // Status Pembayaran
    { wch: 12 }, // Umur (hari)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Papan Peringatan");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const namaBerkas = `papan-peringatan-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
    },
  });
}
