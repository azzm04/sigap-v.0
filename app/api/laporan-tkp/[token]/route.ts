import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ambilDetailGL } from "@/lib/gl/detail";
import { dekripsiToken } from "@/lib/gl/token-url";
import { generateLaporanSurveiTkpPdf } from "@/lib/laporan-tkp/generate";
import { ambilBerkasLaporanTkp, ambilLaporanTkp } from "@/lib/laporan-tkp/laporan";
import {
  ambilTandaTangan,
  PEMILIK_KEPALA_CABANG,
  PEMILIK_PETUGAS_SURVEI,
} from "@/lib/laporan-tkp/tanda-tangan";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const { token } = await params;
  const idMentah = dekripsiToken(decodeURIComponent(token));
  const id = idMentah ? Number(idMentah) : NaN;
  if (!idMentah || !Number.isInteger(id)) {
    return NextResponse.json({ pesan: "Token tidak valid." }, { status: 404 });
  }

  const laporan = await ambilLaporanTkp(id);
  if (!laporan) {
    return NextResponse.json({ pesan: "Laporan tidak ditemukan." }, { status: 404 });
  }

  // Laporan yang sudah jadi dari luar dikirim APA ADANYA -- tidak
  // di-generate ulang dan tidak ditempeli tanda tangan, karena isinya sudah
  // final. Lihat komentar laporanSurveiTkp di lib/db/schema.ts.
  const unggahan = await ambilBerkasLaporanTkp(laporan.id);
  if (unggahan) {
    const base64 = unggahan.berkas.split(",")[1] ?? "";
    const bytes = Buffer.from(base64, "base64");
    const nama = unggahan.namaBerkas || `laporan-survei-tkp-${laporan.id}.pdf`;
    const unduh = request.nextUrl.searchParams.get("unduh") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="${nama.replace(/"/g, "")}"`,
      },
    });
  }

  const detail = await ambilDetailGL(laporan.idJaminan);
  if (!detail) {
    return NextResponse.json({ pesan: "GL untuk laporan ini tidak ditemukan." }, { status: 404 });
  }
  const tanggalSurvei = detail.tanggalMasuk ?? laporan.tanggalSurveiManual;
  // Tgl LAKA boleh kosong (arahan pemilik proyek) -- yang wajib cuma Lokasi
  // LAKA. Hari/Tanggal Survei selalu ada karena ditegakkan saat laporan
  // disimpan: dari Tanggal Masuk, atau isian manual di form.
  const tglKejadianEfektif = detail.tglKejadian ?? detail.tanggalMasuk;
  if (!detail.lokasi || !tanggalSurvei) {
    return NextResponse.json(
      { pesan: "Lokasi LAKA atau Hari/Tanggal Survei belum lengkap untuk membuat PDF." },
      { status: 422 },
    );
  }

  const [ttdKepalaCabang, ttdPetugasSurvei] = await Promise.all([
    ambilTandaTangan(PEMILIK_KEPALA_CABANG),
    ambilTandaTangan(PEMILIK_PETUGAS_SURVEI),
  ]);

  const pdfBytes = await generateLaporanSurveiTkpPdf({
    nomorLp: laporan.nomorLp ?? "-",
    alamatKorban: laporan.alamatKorban ?? "-",
    uraianKesimpulan: laporan.uraianKesimpulan ?? "-",
    namaSaksi: laporan.namaSaksi ?? "-",
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
