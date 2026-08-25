"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { glMirror, statusProsesPusat, tinjauan } from "@/lib/db/schema";
import {
  ambilPilihanTahapProses,
  TAHAP_PEMICU_PAID,
} from "@/lib/gl/tahap-proses";

export async function tandaiDitinjau(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db.insert(tinjauan).values({
    idJaminan,
    userId,
    catatan: catatan.trim(),
    perluTindakLanjut,
  });

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
}

// Mencatat tahap proses GL di sistem pusat (Sub Pra-Verifikasi, Pra
// Verifikasi, Siap Bayar, Selesai, dst) — koreksi MANUAL yang diinput
// petugas saat meninjau, karena aplikasi ini tidak menyentuh sistem pusat
// sama sekali (CLAUDE.md aturan keras #1). Petugas boleh memilih tahap
// mana pun bebas, tidak dipaksa berurutan.
//
// Begitu tahap mencapai TAHAP_PEMICU_PAID ("Berkas Selesai"),
// status_pembayaran di gl_mirror otomatis diubah jadi Paid, dan dicatat
// permanen lewat tinjauan.diabaikan supaya GL ini tidak muncul lagi di
// papan peringatan walau berkas impor berikutnya masih bilang Unpaid
// (gl_mirror selalu mengikuti impor terakhir, jadi kalau tidak ditandai
// diabaikan, statusnya bisa tertimpa balik ke Unpaid saat re-impor).
export async function catatTahapProses(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }
  const userId = Number(session.user.id);

  const idJaminan = formData.get("idJaminan");
  const tahap = formData.get("tahap");

  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof tahap !== "string" || !tahap) {
    throw new Error("Tahap proses wajib dipilih.");
  }

  const pilihanValid = await ambilPilihanTahapProses();
  if (!pilihanValid.includes(tahap)) {
    throw new Error("Tahap proses tidak dikenali.");
  }

  const sudahPaid = tahap === TAHAP_PEMICU_PAID;

  await db.transaction(async (tx) => {
    await tx.insert(statusProsesPusat).values({ idJaminan, tahap, userId });

    if (sudahPaid) {
      const catatan = `Tahap proses pusat mencapai "${TAHAP_PEMICU_PAID}" — status otomatis ditandai Paid.`;
      await tx.insert(tinjauan).values({
        idJaminan,
        userId,
        catatan,
        diabaikan: true,
        alasanAbaikan: catatan,
      });
      await tx
        .update(glMirror)
        .set({ statusPembayaran: "Paid" })
        .where(eq(glMirror.idJaminan, idJaminan));
    }
  });

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
  if (sudahPaid) {
    revalidatePath("/");
    revalidatePath("/sebaran");
  }
}

// Perbaikan salah ketik pada catatan tinjauan yang sudah tersimpan. Hanya
// catatan dan perluTindakLanjut yang bisa diubah -- diabaikan/alasanAbaikan
// tetap, karena itu adalah jejak keputusan bisnis (mis. dari
// catatTahapProses di atas) yang tidak diubah lewat sini.
export async function perbaruiTinjauan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const id = formData.get("id");
  const idJaminan = formData.get("idJaminan");
  const catatan = formData.get("catatan");
  const perluTindakLanjut = formData.get("perluTindakLanjut") === "on";

  if (typeof id !== "string" || !id) {
    throw new Error("Catatan tidak valid.");
  }
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }
  if (typeof catatan !== "string" || !catatan.trim()) {
    throw new Error("Catatan wajib diisi.");
  }

  await db
    .update(tinjauan)
    .set({ catatan: catatan.trim(), perluTindakLanjut })
    .where(eq(tinjauan.id, Number(id)));

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
}

// Kalau baris yang dihapus punya diabaikan=true, hapus ini juga
// menghilangkan pengecualian permanennya dari papan peringatan (lihat
// komentar tinjauan.diabaikan di lib/db/schema.ts) -- status_pembayaran di
// gl_mirror sendiri tidak berubah, jadi GL baru berpotensi muncul lagi di
// peringatan kalau impor berikutnya membalikkan status_pembayaran ke
// Unpaid. Makanya "/" dan "/sebaran" ikut di-revalidate.
export async function hapusTinjauan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid, silakan masuk ulang.");
  }

  const id = formData.get("id");
  const idJaminan = formData.get("idJaminan");

  if (typeof id !== "string" || !id) {
    throw new Error("Catatan tidak valid.");
  }
  if (typeof idJaminan !== "string" || !idJaminan) {
    throw new Error("ID Jaminan tidak valid.");
  }

  await db.delete(tinjauan).where(eq(tinjauan.id, Number(id)));

  revalidatePath(`/gl/${encodeURIComponent(idJaminan)}`);
  revalidatePath("/peringatan");
  revalidatePath("/");
  revalidatePath("/sebaran");
}
