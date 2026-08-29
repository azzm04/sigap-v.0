import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror } from "@/lib/db/schema";
import { dekripsiToken } from "@/lib/gl/token-url";

// Sama seperti /gl/[idJaminan]: token terenkripsi di URL, BUKAN Nomor ID
// Jaminan asli (CLAUDE.md aturan keras #4). Dilindungi middleware, dicek
// lagi di sini sebagai lapisan kedua (pola sama seperti /api/laporan-tkp).
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
    .select({ kskk: glMirror.kskk, kskkNamaBerkas: glMirror.kskkNamaBerkas })
    .from(glMirror)
    .where(eq(glMirror.idJaminan, idJaminan))
    .limit(1);

  if (!gl?.kskk) {
    return NextResponse.json({ pesan: "KSKK belum diunggah untuk GL ini." }, { status: 404 });
  }

  const base64 = gl.kskk.split(",")[1] ?? "";
  const bytes = Buffer.from(base64, "base64");

  // Nama berkas dipertahankan apa adanya (bisa saja memuat nama korban,
  // sama seperti kebiasaan penamaan berkas manual yang sudah berjalan) --
  // aman karena hanya diunduh lewat rute terautentikasi ini, bukan URL publik.
  const namaBerkas = gl.kskkNamaBerkas || "kskk.pdf";

  // ?unduh=1 -> paksa download; tanpa itu -> tampil inline di tab baru (lihat komentar serupa di /api/laporan-tkp).
  const modeUnduh = request.nextUrl.searchParams.get("unduh") === "1";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${modeUnduh ? "attachment" : "inline"}; filename="${namaBerkas.replace(/"/g, "")}"`,
    },
  });
}
