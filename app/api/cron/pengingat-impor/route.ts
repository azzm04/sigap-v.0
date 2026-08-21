import { type NextRequest, NextResponse } from "next/server";
import { ambilWaktuImporTerakhirBerhasil } from "@/lib/impor-log";
import { kirimEmailPengingatImpor } from "@/lib/notifikasi/email";
import { apakahPerluMengingatkan } from "@/lib/notifikasi/pengingat-impor";
import { ambilAmbangHariPengingat, ambilEmailPengingat } from "@/lib/pengaturan";

// Dipanggil cron sistem di VPS (CLAUDE.md bagian 3: "Penjadwalan
// sinkronisasi: cron sistem memanggil API route terproteksi"), bukan lewat
// sesi login petugas -- diproteksi dengan token rahasia, bukan middleware
// auth biasa (middleware.ts mengecualikan /api/cron).
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ pesan: "Tidak diizinkan." }, { status: 401 });
  }

  const [diimporTerakhir, ambangHari, email] = await Promise.all([
    ambilWaktuImporTerakhirBerhasil(),
    ambilAmbangHariPengingat(),
    ambilEmailPengingat(),
  ]);

  if (!apakahPerluMengingatkan(diimporTerakhir, ambangHari)) {
    return NextResponse.json({ terkirim: false, alasan: "Impor masih dalam ambang waktu." });
  }

  if (!email) {
    return NextResponse.json({
      terkirim: false,
      alasan: "Alamat email pengingat belum diatur di halaman Pengaturan.",
    });
  }

  try {
    await kirimEmailPengingatImpor(email, diimporTerakhir);
    return NextResponse.json({ terkirim: true });
  } catch (error) {
    // Tanpa data pribadi -- cuma pesan galat SMTP (CLAUDE.md aturan keras #4).
    console.error("Gagal mengirim email pengingat impor:", error);
    return NextResponse.json({ terkirim: false, alasan: "Gagal mengirim email." }, { status: 500 });
  }
}
