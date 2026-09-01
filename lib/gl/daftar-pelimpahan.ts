import { and, desc, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "../db";
import { glMirror, statusProsesPusat } from "../db/schema";
import { TAHAP_BELUM_LIMPAH } from "./pelimpahan";
import { ambilPetaPicRumahSakit, cariPic } from "./pic";
import { enkripsiIdJaminan } from "./token-url";

export interface BarisPelimpahan {
  idJaminan: string;
  tokenUrl: string;
  namaKorban: string;
  namaRumahSakit: string | null;
  picPengajuan: string | null;
  nomorSuratJaminan: string | null;
  tglGl: string;
  statusPembayaran: string;
  loketPelimpahan: string | null;
  dicatatPada: Date;
}

export interface FilterPelimpahan {
  halaman?: number;
  ukuran?: number;
  /** Dicocokkan ke Nama Korban atau Nomor ID Jaminan */
  cari?: string;
  /** Loket cabang tujuan pelimpahan (lib/gl/pelimpahan.ts) */
  loketPelimpahan?: string;
  picPengajuan?: string;
  /** ISO "YYYY-MM-DD", batas bawah Tgl GL */
  dari?: string;
  /** ISO "YYYY-MM-DD", batas atas Tgl GL */
  sampai?: string;
}

export interface HasilPelimpahan {
  baris: BarisPelimpahan[];
  total: number;
  halaman: number;
  ukuran: number;
  totalHalaman: number;
  /** Jumlah GL per loket cabang, dihitung SEBELUM filter loket diterapkan */
  jumlahPerLoket: { loket: string; jumlah: number }[];
}

const UKURAN_HALAMAN_DEFAULT = 20;

// Halaman "Pelimpahan" -- daftar GL yang berkasnya masih menunggu
// dilimpahkan ke loket lain: tahap proses pusat TERKINI-nya persis
// TAHAP_BELUM_LIMPAH. Begitu petugas mencatat tahap berikutnya ("Berkas
// Diajukan Ke Pusat"), GL otomatis hilang dari daftar ini tanpa perlu aksi
// khusus -- arahan pemilik proyek, supaya tidak ada langkah "sudah
// dilimpah" yang harus dicatat terpisah.
//
// Pakai tahap TERKINI, bukan sekadar "pernah punya baris
// TAHAP_BELUM_LIMPAH": GL yang dulu pernah menunggu pelimpahan lalu sudah
// diajukan tidak boleh nongol lagi di sini.
export async function ambilDaftarPelimpahan(
  filter: FilterPelimpahan = {},
): Promise<HasilPelimpahan> {
  const halaman = Math.max(1, Math.floor(filter.halaman ?? 1));
  const ukuran = filter.ukuran ?? UKURAN_HALAMAN_DEFAULT;
  const kosong: HasilPelimpahan = {
    baris: [],
    total: 0,
    halaman: 1,
    ukuran,
    totalHalaman: 1,
    jumlahPerLoket: [],
  };

  const [petaPic, semuaTahapProses] = await Promise.all([
    ambilPetaPicRumahSakit(),
    db
      .select({
        idJaminan: statusProsesPusat.idJaminan,
        tahap: statusProsesPusat.tahap,
        loketPelimpahan: statusProsesPusat.loketPelimpahan,
        dicatatPada: statusProsesPusat.dicatatPada,
      })
      .from(statusProsesPusat)
      .orderBy(desc(statusProsesPusat.dicatatPada)),
  ]);

  const terkiniPerId = new Map<
    string,
    { tahap: string; loketPelimpahan: string | null; dicatatPada: Date }
  >();
  for (const t of semuaTahapProses) {
    if (!terkiniPerId.has(t.idJaminan)) terkiniPerId.set(t.idJaminan, t);
  }

  const idRelevan = [...terkiniPerId.entries()]
    .filter(([, v]) => v.tahap === TAHAP_BELUM_LIMPAH)
    .map(([id]) => id);

  if (idRelevan.length === 0) return kosong;

  const kondisiGL = [isNull(glMirror.dihapusPada), inArray(glMirror.idJaminan, idRelevan)];
  if (filter.dari) kondisiGL.push(gte(glMirror.tglGl, filter.dari));
  if (filter.sampai) kondisiGL.push(lte(glMirror.tglGl, filter.sampai));

  const semuaGL = await db
    .select({
      idJaminan: glMirror.idJaminan,
      namaKorban: glMirror.namaKorban,
      namaRumahSakit: glMirror.namaRumahSakit,
      nomorSuratJaminan: glMirror.nomorSuratJaminan,
      tglGl: glMirror.tglGl,
      statusPembayaran: glMirror.statusPembayaran,
    })
    .from(glMirror)
    .where(and(...kondisiGL));

  const sebelumFilterLoket = semuaGL
    .map((b) => {
      const terkini = terkiniPerId.get(b.idJaminan)!;
      return {
        idJaminan: b.idJaminan,
        tokenUrl: enkripsiIdJaminan(b.idJaminan),
        namaKorban: b.namaKorban,
        namaRumahSakit: b.namaRumahSakit,
        picPengajuan: cariPic(petaPic, b.namaRumahSakit).picPengajuan,
        nomorSuratJaminan: b.nomorSuratJaminan,
        tglGl: b.tglGl,
        statusPembayaran: b.statusPembayaran,
        loketPelimpahan: terkini.loketPelimpahan,
        dicatatPada: terkini.dicatatPada,
      };
    })
    .filter((b) => !filter.picPengajuan || b.picPengajuan === filter.picPengajuan)
    .filter((b) => {
      if (!filter.cari) return true;
      const pola = filter.cari.toLowerCase();
      return b.namaKorban.toLowerCase().includes(pola) || b.idJaminan.toLowerCase().includes(pola);
    });

  // Rekap per loket dihitung sebelum filter loket diterapkan, supaya petugas
  // tetap melihat sebaran seluruh loket walau sedang menyaring satu loket.
  const rekap = new Map<string, number>();
  for (const b of sebelumFilterLoket) {
    const kunci = b.loketPelimpahan ?? "(loket belum dicatat)";
    rekap.set(kunci, (rekap.get(kunci) ?? 0) + 1);
  }
  const jumlahPerLoket = [...rekap.entries()]
    .map(([loket, jumlah]) => ({ loket, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.loket.localeCompare(b.loket, "id-ID"));

  const semuaBaris = sebelumFilterLoket
    .filter((b) => !filter.loketPelimpahan || b.loketPelimpahan === filter.loketPelimpahan)
    .sort((a, b) => b.dicatatPada.getTime() - a.dicatatPada.getTime());

  const total = semuaBaris.length;
  const totalHalaman = Math.max(1, Math.ceil(total / ukuran));
  const mulai = (halaman - 1) * ukuran;

  return {
    baris: semuaBaris.slice(mulai, mulai + ukuran),
    total,
    halaman,
    ukuran,
    totalHalaman,
    jumlahPerLoket,
  };
}
