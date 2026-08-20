CREATE TABLE "gl_mirror" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"id_jaminan" text NOT NULL,
	"tipe_klaim" text NOT NULL,
	"tipe_cidera" text NOT NULL,
	"nama_rumah_sakit" text,
	"loket" text NOT NULL,
	"nama_korban" text NOT NULL,
	"nomor_surat_jaminan" text,
	"tgl_gl" date NOT NULL,
	"gl_status" text NOT NULL,
	"tahapan" text NOT NULL,
	"tgl_diajukan" date,
	"status_verifikasi" text,
	"nilai_diajukan" integer NOT NULL,
	"nilai_disetujui" integer NOT NULL,
	"tgl_verifikasi" date,
	"status_pembayaran" text NOT NULL,
	"jumlah_pembayaran" integer NOT NULL,
	"tgl_pembayaran" date,
	"diimpor_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gl_mirror_id_jaminan_unique" UNIQUE("id_jaminan")
);
--> statement-breakpoint
CREATE TABLE "gl_snapshot" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"id_jaminan" text NOT NULL,
	"tahapan" text NOT NULL,
	"status_verifikasi" text,
	"status_pembayaran" text NOT NULL,
	"direkam_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impor_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nama_berkas" text NOT NULL,
	"diimpor_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"jumlah_baris" integer NOT NULL,
	"jumlah_baru" integer NOT NULL,
	"jumlah_berubah" integer NOT NULL,
	"berhasil" boolean NOT NULL,
	"alasan_penolakan" text
);
--> statement-breakpoint
CREATE TABLE "nilai_referensi" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kategori" text NOT NULL,
	"nilai" text NOT NULL,
	CONSTRAINT "nilai_referensi_kategori_nilai_unique" UNIQUE("kategori","nilai")
);
--> statement-breakpoint
CREATE TABLE "pengaturan" (
	"kunci" text PRIMARY KEY NOT NULL,
	"nilai" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengguna" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pengguna_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "tinjauan" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"id_jaminan" text NOT NULL,
	"user_id" bigint NOT NULL,
	"catatan" text NOT NULL,
	"perlu_tindak_lanjut" boolean DEFAULT false NOT NULL,
	"ditinjau_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gl_snapshot" ADD CONSTRAINT "gl_snapshot_id_jaminan_gl_mirror_id_jaminan_fk" FOREIGN KEY ("id_jaminan") REFERENCES "public"."gl_mirror"("id_jaminan") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tinjauan" ADD CONSTRAINT "tinjauan_id_jaminan_gl_mirror_id_jaminan_fk" FOREIGN KEY ("id_jaminan") REFERENCES "public"."gl_mirror"("id_jaminan") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tinjauan" ADD CONSTRAINT "tinjauan_user_id_pengguna_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;