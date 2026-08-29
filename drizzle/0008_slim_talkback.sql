CREATE TABLE "laporan_survei_tkp" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"id_jaminan" text NOT NULL,
	"nomor_lp" text NOT NULL,
	"alamat_korban" text NOT NULL,
	"uraian_kesimpulan" text NOT NULL,
	"nama_saksi" text NOT NULL,
	"user_id" bigint NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tanda_tangan" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pemilik" text NOT NULL,
	"gambar" text,
	"diperbarui_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tanda_tangan_pemilik_unique" UNIQUE("pemilik")
);
--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ADD CONSTRAINT "laporan_survei_tkp_id_jaminan_gl_mirror_id_jaminan_fk" FOREIGN KEY ("id_jaminan") REFERENCES "public"."gl_mirror"("id_jaminan") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ADD CONSTRAINT "laporan_survei_tkp_user_id_pengguna_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;