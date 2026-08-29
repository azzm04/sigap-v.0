"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror, laporanSurveiTkp, statusProsesPusat, tinjauan } from "@/lib/db/schema";
import {
  ambilPilihanTahapProses,
  ambilRiwayatTahapProses,
  TAHAP_KELUAR_PERINGATAN,
  TAHAP_PEMICU_PAID,
  tandaiBerkasSelesai,
} from "@/lib/gl/tahap-proses";
import { enkripsiIdJaminan } from "@/lib/gl/token-url";
import { simpanLaporanTkp } from "@/lib/laporan-tkp/laporan";

// URL detail GL memakai token terenkripsi (bukan Nomor ID Jaminan asli --
// lihat lib/gl/token-url.ts), jadi path yang di-revalidatePath() harus
// dibangun dari token yang sama supaya cocok persis dengan URL yang sedang
// dibuka pengguna.
function pathDetailGL(idJaminan: string): string {
  return `/gl/${encodeURIComponent(enkripsiIdJaminan(idJaminan))}`;
}

export async function tandaiDitinjau(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db.insert(tinjauan).values({
    idJaminan,
    userId,
    catatan: catatan.trim(),
    perluTindakLanjut,
  });

  revalidatePath(pathDetailGL(idJaminan));
  revalidatePath("/peringatan");
}

export interface StatusTahapProses {
  berhasil: boolean;
  pesan: string;
}

// Mencatat tahap proses GL di sistem pusat ("Berkas Diajukan Ke Pusat",
// "Berkas Selesai") — koreksi MANUAL yang diinput petugas saat meninjau,
// karena aplikasi ini tidak menyentuh sistem pusat sama sekali (CLAUDE.md
// aturan keras #1). Petugas boleh memilih tahap mana pun bebas, tidak
// dipaksa berurutan -- KECUALI TAHAP_KELUAR_PERINGATAN ("Berkas Diajukan Ke
// Pusat"), yang wajib GL-nya sudah punya Laporan Survei TKP DAN KSKK
// (arahan pemilik proyek: dokumen itu memang syarat sebelum benar-benar
// diajukan ke pusat di dunia nyata, jadi aplikasi menolak di titik ini,
// bukan cuma diam-diam membiarkan GL tetap di Peringatan seperti
// sebelumnya -- lihat juga pengecekan dinamis yang tetap dipertahankan di
// lib/gl/peringatan.ts sebagai jaring pengaman kalau dokumennya dihapus lagi
// belakangan).
//
// Begitu tahap mencapai TAHAP_PEMICU_PAID ("Berkas Selesai") -- lewat sini
// (staff klik manual, sudah lewat pop-up konfirmasi dulu di client,
// components/gl/form-tahap-proses.tsx) ATAU lewat pencocokan otomatis
// impor Sentralisasi Pembayaran (lib/sumber-data/sumber-sentralisasi.ts) --
// tandaiBerkasSelesai() di lib/gl/tahap-proses.ts menjalankan tiga hal
// sekaligus: status_pembayaran jadi Paid, tahapan (JRCare) jadi "Done", dan
// dikunci permanen lewat tinjauan.diabaikan supaya GL ini tidak muncul lagi
// di papan peringatan walau berkas impor berikutnya masih bilang Unpaid
// (gl_mirror selalu mengikuti impor terakhir, jadi kalau tidak ditandai
// diabaikan, statusnya bisa tertimpa balik ke Unpaid saat re-impor).
//
// Mengembalikan status (bukan throw) supaya formnya bisa menampilkan pop-up
// "Dokumen Belum Lengkap" langsung di halaman, bukan error mentah.
export async function catatTahapProses(
  _sebelumnya: StatusTahapProses | undefined,
  formData: FormData,
): Promise<StatusTahapProses> {
  const session = await auth();
  if (!session?.user?.id) {
    return { berhasil: false, pesan: "Sesi tidak valid, silakan masuk ulang." };
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const tahap = formData.get("tahap");

  if (typeof idJaminan !== "string" || !idJaminan) {
    return { berhasil: false, pesan: "ID Jaminan tidak valid." };
  }
  if (typeof tahap !== "string" || !tahap) {
    return { berhasil: false, pesan: "Tahap proses wajib dipilih." };
  }

  const pilihanValid = await ambilPilihanTahapProses();
  if (!pilihanValid.includes(tahap)) {
    return { berhasil: false, pesan: "Tahap proses tidak dikenali." };
  }

  if (tahap === TAHAP_KELUAR_PERINGATAN) {
    const [gl] = await db
      .select({
        kskkNamaBerkas: glMirror.kskkNamaBerkas,
        punyaLaporanTkp: sql<boolean>`EXISTS (
          SELECT 1 FROM ${laporanSurveiTkp} AS ltk
          WHERE ltk.id_jaminan = ${glMirror}.id_jaminan
        )`,
      })
      .from(glMirror)
      .where(eq(glMirror.idJaminan, idJaminan))
      .limit(1);

    if (!gl?.punyaLaporanTkp || !gl.kskkNamaBerkas) {
      const kurang = [
        !gl?.punyaLaporanTkp && "Laporan Survei TKP",
        !gl?.kskkNamaBerkas && "KSKK",
      ]
        .filter(Boolean)
        .join(" dan ");
      return {
        berhasil: false,
        pesan: `Dokumen Belum Lengkap: ${kurang} belum ada untuk GL ini. Lengkapi dulu sebelum mencatat tahap "${TAHAP_KELUAR_PERINGATAN}".`,
      };
    }
  }

  const sudahPaid = tahap === TAHAP_PEMICU_PAID;

  await db.transaction(async (tx) => {
    if (sudahPaid) {
      const catatan = `Tahap proses pusat mencapai "${TAHAP_PEMICU_PAID}" — dikonfirmasi manual oleh petugas, status otomatis ditandai Paid.`;
      await tandaiBerkasSelesai(tx, idJaminan, userId, catatan);
    } else {
      await tx.insert(statusProsesPusat).values({ idJaminan, tahap, userId });
    }
  });

  revalidatePath(pathDetailGL(idJaminan));
  revalidatePath("/peringatan");
  revalidatePath("/proses-pusat");
  if (sudahPaid) {
    revalidatePath("/");
    revalidatePath("/sebaran");
  }

  return { berhasil: true, pesan: `Tahap "${tahap}" berhasil dicatat.` };
}

// Perbaikan salah ketik pada catatan tinjauan yang sudah tersimpan. Hanya
// catatan dan perluTindakLanjut yang bisa diubah -- diabaikan/alasanAbaikan
// tetap, karena itu adalah jejak keputusan bisnis (mis. dari
// catatTahapProses di atas) yang tidak diubah lewat sini.
export async function perbaruiTinjauan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const id = formData.get("id");
  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";

  if (typeof id !== "string" || !id) {
    throw new Error("Catatan tidak valid.");
  }
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db
    .update(tinjauan)
    .set({ catatan: catatan.trim(), perluTindakLanjut })
    .where(eq(tinjauan.id, Number(id)));

  revalidatePath(pathDetailGL(idJaminan));
  revalidatePath("/peringatan");
}

// Kalau baris yang dihapus punya diabaikan=true, hapus ini juga
// menghilangkan pengecualian permanennya dari papan peringatan (lihat
// komentar tinjauan.diabaikan di lib/db/schema.ts) -- status_pembayaran di
// gl_mirror sendiri tidak berubah, jadi GL baru berpotensi muncul lagi di
// peringatan kalau impor berikutnya membalikkan status_pembayaran ke
// Unpaid. Makanya "/" dan "/sebaran" ikut di-revalidate.
export async function hapusTinjauan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const id = formData.get("id");
  const idJaminan = formData.get("idJaminan");

  if (typeof id !== "string" || !id) {
    throw new Error("Catatan tidak valid.");
  }
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }

  await db.delete(tinjauan).where(eq(tinjauan.id, Number(id)));

  revalidatePath(pathDetailGL(idJaminan));
  revalidatePath("/peringatan");
  revalidatePath("/");
  revalidatePath("/sebaran");
}

const POLA_TANGGAL_ISO = /^\d{4}-\d{2}-\d{2}$/;

function ambilTanggalOpsional(formData: FormData, kunci: string): string | null {
  const nilai = formData.get(kunci);
  if (typeof nilai !== "string" || !nilai) return null;
  if (!POLA_TANGGAL_ISO.test(nilai)) {
    throw new Error(`Format tanggal "${kunci}" tidak valid.`);
  }
  return nilai;
}

// Diisi PIC Task Force lewat halaman detail GL -- Tanggal Masuk (kapan
// kasus ini mulai dipantau, terpisah dari Tgl GL), Tanggal Pulang Pasien
// (tanda kunjungan RS sudah dilakukan dan korban sudah pulang), dan Lokasi
// LAKA manual (kalau berkas DASI belum ter-impor/belum cocok). Ketiga
// field ini MANUAL, tidak dari berkas ekspor JRCare (lihat lib/db/schema.ts),
// jadi aman diedit berkali-kali tanpa tertimpa impor JRCare -- Lokasi LAKA
// dan Tgl LAKA (tglKejadian) beda dikit: keduanya MEMANG bisa ditimpa kalau
// berkas DASI diimpor dan cocok (lib/sumber-data/sumber-dasi.ts,
// simpanDataDASI, overwrite tanpa syarat), sengaja begitu supaya data DASI
// asli tetap jadi sumber kebenaran begitu tersedia -- isian manual di sini
// cuma pengganti sementara.
//
// Tgl LAKA (tglKejadian) otomatis ikut terisi dari Tanggal Masuk kalau
// masih kosong (arahan pemilik proyek: keduanya dianggap tanggal yang sama
// secara operasional) -- pakai COALESCE dalam satu UPDATE atomik supaya
// TIDAK PERNAH menimpa Tgl LAKA yang sudah ada (baik dari DASI asli maupun
// dari pengisian sebelumnya), hanya mengisi kalau benar-benar masih NULL.
export async function simpanKunjunganTaskForce(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const idJaminan = formData.get("idJaminan");
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }

  const tanggalMasuk = ambilTanggalOpsional(formData, "tanggalMasuk");
  const tanggalPulangPasien = ambilTanggalOpsional(formData, "tanggalPulangPasien");
  const lokasiMentah = formData.get("lokasi");
  const lokasi = typeof lokasiMentah === "string" && lokasiMentah.trim() ? lokasiMentah.trim() : null;

  await db
    .update(glMirror)
    .set({
      tanggalMasuk,
      tanggalPulangPasien,
      lokasi,
      ...(tanggalMasuk
        ? { tglKejadian: sql`coalesce(${glMirror.tglKejadian}, ${tanggalMasuk})` }
        : {}),
    })
    .where(eq(glMirror.idJaminan, idJaminan));

  revalidatePath(pathDetailGL(idJaminan));
  revalidatePath("/peringatan");
  picuSinkronSheetsLatarBelakang();
}

const TIPE_TTD_SAKSI_DIIZINKAN = ["image/png", "image/jpeg", "application/pdf"];
const UKURAN_MAKS_TTD_SAKSI = 2 * 1024 * 1024; // 2 MB

export interface StatusLaporanTkp {
  berhasil: boolean;
  pesan: string;
  /** Hanya ada kalau berhasil -- dipakai tautan "Unduh PDF" langsung tanpa nunggu refresh tabel riwayat. */
  laporanId?: number;
}

// Sinkron Sheets dipicu di background (TIDAK di-await oleh pemanggil) supaya
// petugas tidak perlu menunggu beberapa detik ekstra cuma untuk tautan
// dokumen muncul di spreadsheet -- proses Node.js tetap hidup di VPS
// (bukan serverless/edge, lihat CLAUDE.md bagian 3) jadi promise ini AMAN
// terus jalan sampai selesai walau response sudah dikirim ke browser.
// Kegagalan (mis. GOOGLE_SHEET_ID belum diset) sengaja HANYA dicatat ke
// log, tidak pernah menggagalkan pembuatan laporan itu sendiri -- Sheets
// murni cerminan, bukan sumber kebenaran.
function picuSinkronSheetsLatarBelakang() {
  import("@/lib/google-sheets/sinkron")
    .then(({ sinkronKeGoogleSheets }) => sinkronKeGoogleSheets())
    .catch((error) => {
      console.error("Sinkron Sheets otomatis setelah Laporan Survei TKP gagal:", error);
    });
}

// Menyimpan field manual Laporan Survei TKP (CLAUDE.md bagian 6, Tahap 2).
// Field otomatis (Nama Korban, Petugas Survei, Tempat/Tgl Kecelakaan)
// TIDAK disimpan di sini -- diambil ulang dari gl_mirror setiap PDF-nya
// di-generate/diunduh (lib/laporan-tkp/generate.ts), supaya selalu
// konsisten dengan data GL terkini. Pengecualian: Hari/Tanggal Survei
// biasanya juga otomatis (= Tanggal Masuk), tapi kalau Tanggal Masuk masih
// kosong, petugas boleh isi manual lewat tanggalSurveiManual -- makanya
// field ini DISIMPAN di sini (bukan diambil ulang dari gl_mirror), beda
// dari field otomatis lain.
//
// Mengembalikan status (bukan throw) supaya form-nya (useActionState di
// components/gl/form-laporan-tkp.tsx) bisa menampilkan pesan sukses/gagal
// langsung di halaman -- sebelumnya throw polos bikin petugas tidak tahu
// submit-nya berhasil atau tidak selain lewat network tab.
export async function simpanLaporanSurveiTkp(
  _sebelumnya: StatusLaporanTkp | undefined,
  formData: FormData,
): Promise<StatusLaporanTkp> {
  const session = await auth();
  if (!session?.user?.id) {
    return { berhasil: false, pesan: "Sesi tidak valid, silakan masuk ulang." };
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const nomorLp = formData.get("nomorLp");
  const alamatKorban = formData.get("alamatKorban");
  const uraianKesimpulan = formData.get("uraianKesimpulan");
  const namaSaksi = formData.get("namaSaksi");
  const tanggalSurveiManual = formData.get("tanggalSurveiManual");
  const berkasTtdSaksi = formData.get("ttdSaksi");

  if (typeof idJaminan !== "string" || !idJaminan) {
    return { berhasil: false, pesan: "ID Jaminan tidak valid." };
  }
  if (typeof nomorLp !== "string" || !nomorLp.trim()) {
    return { berhasil: false, pesan: "Nomor LP wajib diisi." };
  }
  if (typeof alamatKorban !== "string" || !alamatKorban.trim()) {
    return { berhasil: false, pesan: "Alamat Korban wajib diisi." };
  }
  if (typeof uraianKesimpulan !== "string" || !uraianKesimpulan.trim()) {
    return { berhasil: false, pesan: "Uraian dan Kesimpulan wajib diisi." };
  }
  if (typeof namaSaksi !== "string" || !namaSaksi.trim()) {
    return { berhasil: false, pesan: "Nama Saksi wajib diisi." };
  }

  const [gl] = await db
    .select({
      lokasi: glMirror.lokasi,
      tglKejadian: glMirror.tglKejadian,
      tanggalMasuk: glMirror.tanggalMasuk,
    })
    .from(glMirror)
    .where(eq(glMirror.idJaminan, idJaminan))
    .limit(1);

  if (!gl) return { berhasil: false, pesan: "GL tidak ditemukan." };
  // Tgl Kejadian (Tgl LAKA DASI) boleh digantikan Tanggal Masuk -- sesuai
  // arahan pemilik proyek: keduanya dianggap tanggal yang sama secara
  // operasional (Tanggal Masuk sudah punya jalur isi manual sendiri di
  // form Kunjungan PIC Task Force, jadi tidak perlu input Tgl LAKA
  // terpisah). Lokasi TETAP wajib -- diisi manual di form yang sama kalau
  // DASI belum ada (lihat simpanKunjunganTaskForce).
  if (!gl.lokasi || (!gl.tglKejadian && !gl.tanggalMasuk)) {
    return {
      berhasil: false,
      pesan:
        "Lokasi LAKA dan Tgl LAKA/Tanggal Masuk belum terisi untuk GL ini. Lengkapi dulu lewat form Kunjungan PIC Task Force sebelum membuat Laporan Survei TKP.",
    };
  }

  // Hari/Tanggal Survei: pakai Tanggal Masuk kalau sudah ada, kalau belum
  // wajib isi manual -- jangan blokir seluruh form hanya karena PIC Task
  // Force belum sempat kunjungan.
  const tanggalManualBersih =
    typeof tanggalSurveiManual === "string" && tanggalSurveiManual.trim()
      ? tanggalSurveiManual.trim()
      : null;
  if (!gl.tanggalMasuk && !tanggalManualBersih) {
    return {
      berhasil: false,
      pesan: "Hari/Tanggal Survei wajib diisi manual karena Tanggal Masuk belum ada di detail GL.",
    };
  }

  let ttdSaksi: string | null = null;
  if (berkasTtdSaksi instanceof File && berkasTtdSaksi.size > 0) {
    if (!TIPE_TTD_SAKSI_DIIZINKAN.includes(berkasTtdSaksi.type)) {
      return { berhasil: false, pesan: "Tanda Tangan Saksi harus format PNG, JPEG, atau PDF." };
    }
    if (berkasTtdSaksi.size > UKURAN_MAKS_TTD_SAKSI) {
      return { berhasil: false, pesan: "Ukuran berkas Tanda Tangan Saksi maksimal 2 MB." };
    }
    const arrayBuffer = await berkasTtdSaksi.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    ttdSaksi = `data:${berkasTtdSaksi.type};base64,${base64}`;
  }

  const { id: laporanId } = await simpanLaporanTkp({
    idJaminan,
    nomorLp: nomorLp.trim(),
    alamatKorban: alamatKorban.trim(),
    uraianKesimpulan: uraianKesimpulan.trim(),
    namaSaksi: namaSaksi.trim(),
    ttdSaksi,
    tanggalSurveiManual: gl.tanggalMasuk ? null : tanggalManualBersih,
    userId,
  });

  revalidatePath(pathDetailGL(idJaminan));
  picuSinkronSheetsLatarBelakang();

  return {
    berhasil: true,
    pesan: `Laporan Survei TKP berhasil dibuat (Nomor LP: ${nomorLp.trim()}). Tautan sedang dikirim ke Google Sheets di latar belakang.`,
    laporanId,
  };
}

const UKURAN_MAKS_KSKK = 10 * 1024 * 1024; // 10 MB, cukup untuk scan PDF beberapa halaman

// KSKK diunggah manual oleh PIC Pengajuan -- aplikasi tidak bisa
// generate-nya sendiri (beda dari Laporan Survei TKP), jadi cuma simpan
// berkas apa adanya. Satu KSKK "terkini" per GL: unggah ulang menimpa yang
// lama (lihat komentar kolom kskk di lib/db/schema.ts).
export async function simpanKskk(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const idJaminan = formData.get("idJaminan");
  const berkas = formData.get("kskk");

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (!(berkas instanceof File) || berkas.size === 0) {
    throw new Error("Pilih berkas PDF KSKK terlebih dahulu.");
  }
  if (berkas.type !== "application/pdf") {
    throw new Error("Berkas KSKK harus format PDF.");
  }
  if (berkas.size > UKURAN_MAKS_KSKK) {
    throw new Error("Ukuran berkas KSKK maksimal 10 MB.");
  }

  const arrayBuffer = await berkas.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  await db
    .update(glMirror)
    .set({
      kskk: `data:application/pdf;base64,${base64}`,
      kskkNamaBerkas: berkas.name,
      kskkDiunggahPada: new Date(),
    })
    .where(eq(glMirror.idJaminan, idJaminan));

  revalidatePath(pathDetailGL(idJaminan));
  picuSinkronSheetsLatarBelakang();
}

// Begitu GL sudah "Berkas Diajukan Ke Pusat" atau "Berkas Selesai", KSKK
// dan Laporan Survei TKP jadi bukti historis apa yang benar dikirim ke
// pusat -- tidak boleh dihapus lagi (cuma boleh diganti/unggah ulang).
// Mencegah GL "nyangkut" di Proses Pusat/status Diajukan Ke Pusat padahal
// dokumen syaratnya sudah tidak ada. Jaring pengaman server -- tombol UI
// juga sudah dikunci (components/gl/tabel-dokumen.tsx), ini cuma
// pertahanan kalau ada yang memanggil action-nya langsung.
async function pastikanDokumenBolehDihapus(idJaminan: string): Promise<void> {
  const [tahapTerkini] = await ambilRiwayatTahapProses(idJaminan);
  if (
    tahapTerkini &&
    (tahapTerkini.tahap === TAHAP_KELUAR_PERINGATAN || tahapTerkini.tahap === TAHAP_PEMICU_PAID)
  ) {
    throw new Error(
      `GL ini sudah tahap "${tahapTerkini.tahap}" -- dokumen tidak bisa dihapus lagi, sudah jadi bukti historis. Gunakan "Ganti berkas" kalau perlu mengoreksi.`,
    );
  }
}

// Menghapus satu Laporan Survei TKP yang sudah dibuat (dari tabel gabungan
// dokumen di halaman detail GL). Dicocokkan idJaminan sekaligus id supaya
// tidak mungkin menghapus laporan milik GL lain lewat id yang salah ketik.
export async function hapusLaporanTkp(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const id = formData.get("id");
  const idJaminan = formData.get("idJaminan");
  if (typeof id !== "string" || !id) {
    throw new Error("Laporan tidak valid.");
  }
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }

  await pastikanDokumenBolehDihapus(idJaminan);

  await db
    .delete(laporanSurveiTkp)
    .where(and(eq(laporanSurveiTkp.id, Number(id)), eq(laporanSurveiTkp.idJaminan, idJaminan)));

  revalidatePath(pathDetailGL(idJaminan));
  picuSinkronSheetsLatarBelakang();
}

// Menghapus KSKK yang sudah diunggah -- cukup kosongkan kolomnya di
// gl_mirror (bukan tabel terpisah, lihat lib/db/schema.ts), sama seperti
// mekanisme "ganti berkas" tapi tanpa berkas pengganti.
export async function hapusKskk(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const idJaminan = formData.get("idJaminan");
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }

  await pastikanDokumenBolehDihapus(idJaminan);

  await db
    .update(glMirror)
    .set({ kskk: null, kskkNamaBerkas: null, kskkDiunggahPada: null })
    .where(eq(glMirror.idJaminan, idJaminan));

  revalidatePath(pathDetailGL(idJaminan));
  picuSinkronSheetsLatarBelakang();
}
