ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "nomor_lp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "alamat_korban" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "uraian_kesimpulan" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "nama_saksi" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gl_mirror" ADD COLUMN "kskk_tempel_ttd" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ADD COLUMN "berkas" text;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ADD COLUMN "nama_berkas" text;