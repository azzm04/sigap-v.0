import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror } from "@/lib/db/schema";
import { dekripsiToken } from "@/lib/gl/token-url";
import { ambilTandaTangan, PEMILIK_KEPALA_CABANG, PEMILIK_PETUGAS_SURVEI } from "@/lib/laporan-tkp/tanda-tangan";
import { tempelTtdKskk } from "@/lib/laporan-tkp/tempel-ttd-kskk";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const { token } = await params;
  const idJaminan = dekripsiToken(decodeURIComponent(token));
  if (!idJaminan) {
    return NextResponse.json({ pesan: "Token tidak valid." }, { status: 404 });
  }

  const [gl] = await db
    .select({
      kskk: glMirror.kskk,
      kskkNamaBerkas: glMirror.kskkNamaBerkas,
      kskkTempelTtd: glMirror.kskkTempelTtd,
    })
    .from(glMirror)
    .where(eq(glMirror.idJaminan, idJaminan))
    .limit(1);

  if (!gl?.kskk) {
    return NextResponse.json({ pesan: "KSKK belum diunggah untuk GL ini." }, { status: 404 });
  }

  const base64 = gl.kskk.split(",")[1] ?? "";
  const bytesAsli = Buffer.from(base64, "base64");

  // Tempelkan tanda tangan Mobile Service dan Kepala Cabang dari Pengaturan
  // ke halaman ke-2 PDF KSKK. Kalau belum ada tanda tangan yang diunggah,
  // atau PDF tidak bisa dimodifikasi, PDF asli dikembalikan apa adanya.
  //
  // DILEWATI kalau petugas melepas centang "Tanda tangan Kepala Cabang &
  // Mobile Service" saat mengunggah -- kasus GL pelimpahan, berkasnya sudah
  // bertanda tangan dari loket lain. Penempelan terjadi saat berkas DIBACA,
  // jadi tanpa penanda ini tanda tangannya akan dobel setiap kali dibuka.
  let bytesAkhir: Uint8Array = bytesAsli;
  if (gl.kskkTempelTtd) {
    const [ttdPetugasSurvei, ttdKepalaCabang] = await Promise.all([
      ambilTandaTangan(PEMILIK_PETUGAS_SURVEI),
      ambilTandaTangan(PEMILIK_KEPALA_CABANG),
    ]);
    bytesAkhir = await tempelTtdKskk(bytesAsli, ttdPetugasSurvei, ttdKepalaCabang);
  }

  const namaBerkas = gl.kskkNamaBerkas || "kskk.pdf";

  const modeUnduh = request.nextUrl.searchParams.get("unduh") === "1";

  return new NextResponse(new Uint8Array(bytesAkhir), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${modeUnduh ? "attachment" : "inline"}; filename="${namaBerkas.replace(/"/g, "")}"`,
    },
  });
}
