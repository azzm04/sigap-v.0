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
  const tanggalSurvei = detail.tanggalMasuk ?? laporan.tanggalSurveiManual;
  const tglKejadianEfektif = detail.tglKejadian ?? detail.tanggalMasuk;
  if (!detail.lokasi || !tglKejadianEfektif || !tanggalSurvei) {
    return NextResponse.json(
      { pesan: "Data GL (Lokasi/Tgl LAKA) atau Hari/Tanggal Survei belum lengkap untuk membuat PDF." },
      { status: 422 },
    );
  }

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

  const namaBerkas = `laporan-survei-tkp-${laporan.id}.pdf`;

  const modeUnduh = request.nextUrl.searchParams.get("unduh") === "1";

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${modeUnduh ? "attachment" : "inline"}; filename="${namaBerkas}"`,
    },
  });
}
