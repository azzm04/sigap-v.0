import { config } from "dotenv";

// Sama seperti scripts/seed.ts: env harus dimuat sebelum modul yang
// bergantung padanya diimpor, jadi dipakai import() dinamis di bawah.
config({ path: ".env.local" });

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error(
      "ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi di .env.local sebelum menjalankan skrip ini.",
    );
    process.exit(1);
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { pengguna } = await import("../lib/db/schema");

  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await db
    .select({ id: pengguna.id })
    .from(pengguna)
    .where(eq(pengguna.username, username))
    .limit(1);

  if (existing) {
    await db.update(pengguna).set({ passwordHash }).where(eq(pengguna.username, username));
    console.log(`Akun "${username}" diperbarui.`);
  } else {
    await db.insert(pengguna).values({ username, passwordHash });
    console.log(`Akun "${username}" dibuat.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal membuat akun:", err);
  process.exit(1);
});
