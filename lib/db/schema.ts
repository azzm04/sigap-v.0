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

// Salinan data GL dari impor terakhir. Lihat CLAUDE.md bagian 5 dan docs/domain-gl.md.
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

  diimporPada: timestamp("diimpor_pada", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // Soft delete: diisi saat petugas menekan "Hapus Semua Data" di Kelola
  // Data. Semua query tampilan WAJIB menyaring baris dengan dihapusPada
  // IS NULL. Baris yang dihapus dengan waktu yang sama dianggap satu
  // "batch" yang bisa dipulihkan bersama dari halaman Sampah. Kalau ID
  // Jaminan yang sama muncul lagi di impor berikutnya, kolom ini otomatis
  // dikosongkan lagi (lihat lib/sumber-data/normalizer.ts) — berkas ekspor
  // tetap jadi sumber kebenaran paling baru.
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

// Log Data: catatan tiap aktivitas yang mengubah gl_mirror secara massal --
// unggahan impor, "Hapus Semua Data", dan pemulihan lewat halaman Sampah --
// disatukan di sini supaya semuanya bisa dianalisis dari satu riwayat.
// Dibedakan lewat kolom jenis; nama_berkas cuma relevan untuk jenis "impor".
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
  // diabaikan = true menyingkirkan GL dari papan peringatan secara permanen
  // (CLAUDE.md bagian 5 dan 7), beda dari perluTindakLanjut yang hanya menandai.
  diabaikan: boolean("diabaikan").notNull().default(false),
  alasanAbaikan: text("alasan_abaikan"),
  ditinjauPada: timestamp("ditinjau_pada", { withTimezone: true })
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
// Wajib dibaca dari sini, bukan di-hardcode di kode (CLAUDE.md aturan keras #3).
export const nilaiReferensi = pgTable(
  "nilai_referensi",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kategori: text("kategori").notNull(),
    nilai: text("nilai").notNull(),
  },
  (t) => [unique().on(t.kategori, t.nilai)],
);
