ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "nomor_lp" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "alamat_korban" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "uraian_kesimpulan" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" ALTER COLUMN "nama_saksi" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" DROP COLUMN "berkas";--> statement-breakpoint
ALTER TABLE "laporan_survei_tkp" DROP COLUMN "nama_berkas";