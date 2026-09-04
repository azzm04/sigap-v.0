CREATE TABLE "loket_pelimpahan" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loket_pelimpahan_nama_unique" UNIQUE("nama")
);
