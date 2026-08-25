CREATE TABLE "status_proses_pusat" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"id_jaminan" text NOT NULL,
	"tahap" text NOT NULL,
	"user_id" bigint NOT NULL,
	"dicatat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "status_proses_pusat" ADD CONSTRAINT "status_proses_pusat_id_jaminan_gl_mirror_id_jaminan_fk" FOREIGN KEY ("id_jaminan") REFERENCES "public"."gl_mirror"("id_jaminan") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_proses_pusat" ADD CONSTRAINT "status_proses_pusat_user_id_pengguna_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pengguna"("id") ON DELETE cascade ON UPDATE no action;