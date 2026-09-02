import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "../db";
import { glMirror, laporanSurveiTkp, statusProsesPusat } from "../db/schema";
import { labelLaporanTkp } from "../laporan-tkp/laporan";
import { ambilPetaPicRumahSakit, cariPic } from "./pic";
import { TAHAP_KELUAR_PERINGATAN } from "./tahap-proses";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisProsesPusat {
  idJaminan: string;
  tokenUrl: string;
  namaKorban: string;
  namaRumahSakit: string | null;
  picPengajuan: string | null;
  nomorSuratJaminan: string | null;
  statusPembayaran: string;
  tahapProses: string;
  tahapDicatatPada: Date;
  laporanTkpId: number | null;
  laporanTkpNomorLp: string | null;
}

export interface FilterProsesPusat {
  halaman?: number;
  ukuran?: number;
  /** Dicocokkan ke Nama Korban atau Nomor ID Jaminan */
  cari?: string;
  picPengajuan?: string;
  /** ISO "YYYY-MM-DD", batas bawah Tgl GL */
  dari?: string;
  /** ISO "YYYY-MM-DD", batas atas Tgl GL */
  sampai?: string;
}

export interface HasilProsesPusat {
  baris: BarisProsesPusat[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
}

const UKURAN_HALAMAN_DEFAULT = 20;

// Halaman "Proses Pusat" -- daftar GL yang MASIH DITUNGGU pusat: tahap
// proses pusat terkininya TAHAP_KELUAR_PERINGATAN ("Berkas Diajukan Ke
// Pusat") DAN status_pembayaran-nya masih Unpaid (lihat
// lib/gl/tahap-proses.ts). Begitu tandaiBerkasSelesai() dijalankan (manual
// via pop-up konfirmasi, atau otomatis lewat impor Sentralisasi Pembayaran,
// lib/sumber-data/sumber-sentralisasi.ts) -- status_pembayaran jadi Paid --
// GL itu otomatis hilang dari sini, TIDAK ditampilkan lagi meski tahap
// terkininya sudah "Berkas Selesai". Ini kebalikan dari Papan Peringatan
// yang isinya justru GL yang BELUM sampai tahap "Diajukan Ke Pusat".
export async function ambilDaftarProsesPusat(
  filter: FilterProsesPusat = {},
): Promise<HasilProsesPusat> {
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const ukuran = filter.ukuran ?? UKURAN_HALAMAN_DEFAULT;

  const [petaPic, semuaTahapProses] = await Promise.all([
    ambilPetaPicRumahSakit(),
    db
      .select({
        idJaminan: statusProsesPusat.idJaminan,
        tahap: statusProsesPusat.tahap,
        dicatatPada: statusProsesPusat.dicatatPada,
      })
      .from(statusProsesPusat)
      .orderBy(desc(statusProsesPusat.dicatatPada)),
  ]);

  const tahapTerkiniPerId = new Map<string, { tahap: string; dicatatPada: Date }>();
  for (const t of semuaTahapProses) {
    if (!tahapTerkiniPerId.has(t.idJaminan)) {
      tahapTerkiniPerId.set(t.idJaminan, { tahap: t.tahap, dicatatPada: t.dicatatPada });
    }
  }

  const idRelevan = [...tahapTerkiniPerId.entries()]
    .filter(([, v]) => v.tahap === TAHAP_KELUAR_PERINGATAN)
    .map(([id]) => id);

  if (idRelevan.length === 0) {
    return { baris: [], total: 0, halaman: 1, ukuran, totalHalaman: 1 };
  }

  const kondisiGL = [
    isNull(glMirror.dihapusPada),
    inArray(glMirror.idJaminan, idRelevan),
    eq(glMirror.statusPembayaran, "Unpaid"),
  ];
  if (filter.dari) kondisiGL.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisiGL.push(lte(glMirror.tglGl, filter.sampai));

  const [semuaGL, semuaLaporanTkp] = await Promise.all([
    db
      .select({
        idJaminan: glMirror.idJaminan,
        namaKorban: glMirror.namaKorban,
        namaRumahSakit: glMirror.namaRumahSakit,
        nomorSuratJaminan: glMirror.nomorSuratJaminan,
        statusPembayaran: glMirror.statusPembayaran,
      })
      .from(glMirror)
      .where(and(...kondisiGL)),
    db
      .select({
        id: laporanSurveiTkp.id,
        idJaminan: laporanSurveiTkp.idJaminan,
        nomorLp: laporanSurveiTkp.nomorLp,
        namaBerkas: laporanSurveiTkp.namaBerkas,
      })
      .from(laporanSurveiTkp)
      .where(inArray(laporanSurveiTkp.idJaminan, idRelevan))
      .orderBy(desc(laporanSurveiTkp.dibuatPada)),
  ]);

  const laporanTerkiniPerId = new Map<string, { id: number; nomorLp: string }>();
  for (const l of semuaLaporanTkp) {
    if (!laporanTerkiniPerId.has(l.idJaminan)) {
      laporanTerkiniPerId.set(l.idJaminan, { id: l.id, nomorLp: labelLaporanTkp(l) });
    }
  }

  const semuaBaris = semuaGL
    .map((b) => {
      const tahap = tahapTerkiniPerId.get(b.idJaminan)!;
      const laporan = laporanTerkiniPerId.get(b.idJaminan) ?? null;
      return {
        idJaminan: b.idJaminan,
        tokenUrl: enkripsiIdJaminan(b.idJaminan),
        namaKorban: b.namaKorban,
        namaRumahSakit: b.namaRumahSakit,
        picPengajuan: cariPic(petaPic, b.namaRumahSakit).picPengajuan,
        nomorSuratJaminan: b.nomorSuratJaminan,
        statusPembayaran: b.statusPembayaran,
        tahapProses: tahap.tahap,
        tahapDicatatPada: tahap.dicatatPada,
        laporanTkpId: laporan?.id ?? null,
        laporanTkpNomorLp: laporan?.nomorLp ?? null,
      };
    })
    .filter((b) => !filter.picPengajuan || b.picPengajuan === filter.picPengajuan)
    .filter((b) => {
      if (!filter.cari) return true;
      const pola = filter.cari.toLowerCase();
      return (
        b.namaKorban.toLowerCase().includes(pola) || b.idJaminan.toLowerCase().includes(pola)
      );
    })
    .sort((a, b) => b.tahapDicatatPada.getTime() - a.tahapDicatatPada.getTime());

  const total = semuaBaris.length;
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;
  const baris = semuaBaris.slice(mulai, mulai + ukuran);

  return { baris, total, halaman, ukuran, totalHalaman };
}
