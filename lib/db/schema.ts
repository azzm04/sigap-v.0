import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const glMirror = pgTable("gl_mirror", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  idJaminan: text("id_jaminan").notNull().unique(),

  tipeKlaim: text("tipe_klaim").notNull(),
  tipeCidera: text("tipe_cidera").notNull(),
  namaRumahSakit: text("nama_rumah_sakit"),
  loket: text("loket").notNull(),
  namaKorban: text("nama_korban").notNull(),
  nomorSuratJaminan: text("nomor_surat_jaminan"),
  tglGl: date("tgl_gl").notNull(),
  glStatus: text("gl_status").notNull(),
  tahapan: text("tahapan").notNull(),
  tglDiajukan: date("tgl_diajukan"),
  statusVerifikasi: text("status_verifikasi"),
  nilaiDiajukan: integer("nilai_diajukan").notNull(),
  nilaiDisetujui: integer("nilai_disetujui").notNull(),
  tglVerifikasi: date("tgl_verifikasi"),
  statusPembayaran: text("status_pembayaran").notNull(),
  jumlahPembayaran: integer("jumlah_pembayaran").notNull(),
  tglPembayaran: date("tgl_pembayaran"),
  tglKejadian: date("tgl_kejadian"),
  lokasi: text("lokasi"),

  // Diisi MANUAL oleh PIC Task Force lewat halaman detail GL
  // tanggalMasuk = kapan kasus ini mulai dipantau petugas (bukan Tgl GL).
  // tanggalPulangPasien = tanda PIC Task Force sudah kunjungan ke RS dan
  // Peringatan 2 (fallback ke Tgl GL kalau masih kosong).
  tanggalMasuk: date("tanggal_masuk"),
  tanggalPulangPasien: date("tanggal_pulang_pasien"),

  // KSKK diunggah MANUAL oleh PIC Pengajuan lewat halaman detail GL
  kskk: text("kskk"), // data URI base64 application/pdf
  kskkNamaBerkas: text("kskk_nama_berkas"),
  kskkDiunggahPada: timestamp("kskk_diunggah_pada", { withTimezone: true }),
  // Apakah tanda tangan Kepala Cabang + Mobile Service perlu ditempelkan
  // SIGAP saat berkas KSKK dibuka (app/api/kskk/[token]/route.ts).
  // Dimatikan untuk GL pelimpahan: berkasnya datang dari loket lain dalam
  // keadaan SUDAH bertanda tangan, jadi kalau tetap ditempel hasilnya
  // dobel -- dan dobelnya berulang tiap kali dibuka, karena penempelan
  // terjadi saat baca, bukan saat unggah. Default true = perilaku lama.
  kskkTempelTtd: boolean("kskk_tempel_ttd").notNull().default(true),

  diimporPada: timestamp("diimpor_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // Soft delete: diisi saat petugas menekan "Hapus Semua Data" di Kelola Data
  dihapusPada: timestamp("dihapus_pada", { withTimezone: true }),
});

// Riwayat perubahan antar-impor. Baris baru hanya disisipkan saat ada nilai yang berubah.
export const glSnapshot = pgTable("gl_snapshot", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  idJaminan: text("id_jaminan")
    .notNull()
    .references(() => glMirror.idJaminan, { onDelete: "cascade" }),
  tahapan: text("tahapan").notNull(),
  statusVerifikasi: text("status_verifikasi"),
  statusPembayaran: text("status_pembayaran").notNull(),
  direkamPada: timestamp("direkam_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Log Data: catatan tiap aktivitas yang mengubah gl_mirror secara massal unggahan impor, "Hapus Semua Data", dan pemulihan lewat halaman Sampah disatukan di sini supaya semuanya bisa dianalisis dari satu riwayat.
export const imporLog = pgTable("impor_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  jenis: text("jenis").notNull().default("impor"),
  namaBerkas: text("nama_berkas"),
  diimporPada: timestamp("diimpor_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
  jumlahBaris: integer("jumlah_baris").notNull(),
  jumlahBaru: integer("jumlah_baru").notNull(),
  jumlahBerubah: integer("jumlah_berubah").notNull(),
  berhasil: boolean("berhasil").notNull(),
  alasanPenolakan: text("alasan_penolakan"),
});

// Catatan tindak lanjut petugas atas sebuah GL.
export const tinjauan = pgTable("tinjauan", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  idJaminan: text("id_jaminan")
    .notNull()
    .references(() => glMirror.idJaminan, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => pengguna.id, { onDelete: "cascade" }),
  catatan: text("catatan").notNull(),
  perluTindakLanjut: boolean("perlu_tindak_lanjut").notNull().default(false),
  diabaikan: boolean("diabaikan").notNull().default(false),
  alasanAbaikan: text("alasan_abaikan"),
  ditinjauPada: timestamp("ditinjau_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const statusProsesPusat = pgTable("status_proses_pusat", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  idJaminan: text("id_jaminan")
    .notNull()
    .references(() => glMirror.idJaminan, { onDelete: "cascade" }),
  tahap: text("tahap").notNull(),
  // Loket tujuan pelimpahan berkas -- HANYA terisi untuk tahap "Berkas
  // Belum Di Limpah" (lib/gl/pelimpahan.ts), null untuk tahap lain.
  // Disimpan per baris riwayat, bukan di gl_mirror, supaya kelihatan loket
  // mana yang dicatat pada saat itu kalau petugas mengoreksinya belakangan.
  loketPelimpahan: text("loket_pelimpahan"),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => pengguna.id, { onDelete: "cascade" }),
  dicatatPada: timestamp("dicatat_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Pemetaan PIC (penanggung jawab) per rumah sakit -- dua peran terpisah:
// PIC Task Force (kunjungan ke RS) dan PIC Pengajuan. Diisi dan diubah lewat halaman Pengaturan, BUKAN di-hardcode di kode
// namaRumahSakit dicocokkan ke gl_mirror.namaRumahSakit lewat perbandingan
export const picRumahSakit = pgTable("pic_rumah_sakit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  namaRumahSakit: text("nama_rumah_sakit").notNull().unique(),
  picTaskForce: text("pic_task_force"),
  picPengajuan: text("pic_pengajuan"),
  diperbaruiPada: timestamp("diperbarui_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Pengaturan key-value. Minimal berisi ambang hari peringatan (CLAUDE.md aturan keras #2).
export const pengaturan = pgTable("pengaturan", {
  kunci: text("kunci").primaryKey(),
  nilai: text("nilai").notNull(),
});

// Autentikasi satu akun.
export const pengguna = pgTable("pengguna", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  dibuatPada: timestamp("dibuat_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Daftar nilai enum terbuka (tahapan, status verifikasi, tipe cidera, dst).
export const nilaiReferensi = pgTable(
  "nilai_referensi",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kategori: text("kategori").notNull(),
    nilai: text("nilai").notNull(),
  },
  (t) => [unique().on(t.kategori, t.nilai)],
);

// Gambar tanda tangan untuk PDF Laporan Survei TKP (lib/laporan-tkp/).
export const tandaTangan = pgTable("tanda_tangan", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  pemilik: text("pemilik").notNull().unique(),
  gambar: text("gambar"),
  namaTampil: text("nama_tampil"),
  jabatan: text("jabatan"),
  diperbaruiPada: timestamp("diperbarui_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const laporanSurveiTkp = pgTable("laporan_survei_tkp", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  idJaminan: text("id_jaminan")
    .notNull()
    .references(() => glMirror.idJaminan, { onDelete: "cascade" }),
  // Empat field manual ini NULLABLE karena satu tabel menampung DUA
  // asal-usul laporan:
  //
  //   berkas = NULL  -> dibuat SIGAP, PDF di-generate ulang tiap diunduh
  //                     dari field di bawah + data GL terkini
  //   berkas terisi  -> laporan sudah jadi dari luar (kasus lama yang
  //                     LHS-nya sudah ada), disimpan dan dikirim apa adanya
  //
  // Sengaja satu tabel, bukan tabel terpisah: seluruh pengecekan
  // kelengkapan dokumen bertanya hal yang sama -- "apakah GL ini punya
  // baris di laporan_survei_tkp?" -- di enam tempat (syarat tahap proses
  // pusat, badge Status Dokumen, Kartu Kinerja, kolom Google Sheets, tabel
  // Dokumen GL). Dengan satu tabel, keenamnya ikut benar tanpa disentuh.
  nomorLp: text("nomor_lp"),
  alamatKorban: text("alamat_korban"),
  uraianKesimpulan: text("uraian_kesimpulan"),
  namaSaksi: text("nama_saksi"),
  /** data URI base64 application/pdf, null kalau laporan di-generate SIGAP */
  berkas: text("berkas"),
  namaBerkas: text("nama_berkas"),
  ttdSaksi: text("ttd_saksi"),
  tanggalSurveiManual: date("tanggal_survei_manual"),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => pengguna.id, { onDelete: "cascade" }),
  dibuatPada: timestamp("dibuat_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
