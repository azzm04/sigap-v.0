ALTER TABLE "impor_log" ALTER COLUMN "nama_berkas" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "impor_log" ADD COLUMN "jenis" text DEFAULT 'impor' NOT NULL;