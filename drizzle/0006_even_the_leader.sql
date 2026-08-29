CREATE TABLE "pic_rumah_sakit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nama_rumah_sakit" text NOT NULL,
	"pic_task_force" text,
	"pic_pengajuan" text,
	"diperbarui_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pic_rumah_sakit_nama_rumah_sakit_unique" UNIQUE("nama_rumah_sakit")
);
