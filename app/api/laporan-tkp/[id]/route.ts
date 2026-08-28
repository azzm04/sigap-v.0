import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ambilDetailGL } from "@/lib/gl/detail";
import { generateLaporanSurveiTkpPdf } from "@/lib/laporan-tkp/generate";
import { ambilLaporanTkp } from "@/lib/laporan-tkp/laporan";
import {
  ambilTandaTangan,
  PEMILIK_KEPALA_CABANG,
  PEMILIK_PETUGAS_SURVEI,
} from "@/lib/laporan-tkp/tanda-tangan";

// PDF DIBUAT ULANG tiap diunduh dari field yang tersimpan + data GL/tanda
// tangan TERKINI (lib/db/schema.ts, komentar laporan_survei_tkp) -- bukan
// berkas statis yang disimpan sekali. Sudah dilindungi middleware, dicek
// lagi di sini sebagai lapisan kedua (pola sama seperti /api/ekspor).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const { id } = await params;
  const laporan = await ambilLaporanTkp(Number(id));
  if (!laporan) {
    return NextResponse.json({ pesan: "Laporan tidak ditemukan." }, { status: 404 });
  }

  const detail = await ambilDetailGL(laporan.idJaminan);
  if (!detail) {
    return NextResponse.json({ pesan: "GL untuk laporan ini tidak ditemukan." }, { status: 404 });
  }
  // Hari/Tanggal Survei: Tanggal Masuk (otomatis) kalau ada, kalau tidak
  // pakai tanggalSurveiManual yang disimpan saat laporan dibuat (lihat
  // app/gl/[idJaminan]/actions.ts) -- salah satunya WAJIB terisi, ditegakkan
  // di sana saat penyimpanan, bukan di sini.
  const tanggalSurvei = detail.tanggalMasuk ?? laporan.tanggalSurveiManual;
  // Tgl Kejadian (Tgl LAKA DASI) boleh digantikan Tanggal Masuk -- lihat
  // komentar sama di simpanLaporanSurveiTkp (app/gl/[idJaminan]/actions.ts).
  const tglKejadianEfektif = detail.tglKejadian ?? detail.tanggalMasuk;
  if (!detail.lokasi || !tglKejadianEfektif || !tanggalSurvei) {
    return NextResponse.json(
      { pesan: "Data GL (Lokasi/Tgl LAKA) atau Hari/Tanggal Survei belum lengkap untuk membuat PDF." },
      { status: 422 },
    );
  }

  // Kepala Cabang dan Petugas Survei KEDUANYA tetap/satu-satunya untuk
  // semua laporan -- tidak lagi dipetakan dari PIC Pengajuan GL ini (lihat
  // komentar sentinel di lib/laporan-tkp/tanda-tangan.ts).
  const [ttdKepalaCabang, ttdPetugasSurvei] = await Promise.all([
    ambilTandaTangan(PEMILIK_KEPALA_CABANG),
    ambilTandaTangan(PEMILIK_PETUGAS_SURVEI),
  ]);

  const pdfBytes = await generateLaporanSurveiTkpPdf({
    nomorLp: laporan.nomorLp,
    alamatKorban: laporan.alamatKorban,
    uraianKesimpulan: laporan.uraianKesimpulan,
    namaSaksi: laporan.namaSaksi,
    ttdSaksi: laporan.ttdSaksi,
    namaKorban: detail.namaKorban,
    namaPetugasSurvei: ttdPetugasSurvei?.namaTampil?.trim() || "-",
    lokasi: detail.lokasi,
    tglKejadian: tglKejadianEfektif,
    tanggalSurvei,
    ttdKepalaCabang,
    ttdPetugasSurvei,
  });

  // Nama berkas sengaja TIDAK memuat Nomor ID Jaminan/nama korban (CLAUDE.md
  // aturan keras #4) -- pakai id lokal laporan saja.
  const namaBerkas = `laporan-survei-tkp-${laporan.id}.pdf`;

  // ?unduh=1 -> paksa download (tombol "Unduh PDF"); tanpa itu -> tampil
  // inline di tab baru (tombol "Lihat", browser modern langsung merender
  // PDF-nya sendiri tanpa perlu viewer kustom di aplikasi ini).
  const modeUnduh = request.nextUrl.searchParams.get("unduh") === "1";

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${modeUnduh ? "attachment" : "inline"}; filename="${namaBerkas}"`,
    },
  });
}
