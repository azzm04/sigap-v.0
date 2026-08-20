import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { pengguna } from "../db/schema";
import { verifikasiKredensial } from "./verifikasi-kredensial";

// Butuh database lokal jalan (docker compose up -d), sama seperti migrasi
// dan seeder. Memakai akun uji khusus, bukan akun "petugas" asli, dan
// membersihkannya lagi setelah selesai.
const USERNAME_UJI = "__uji_verifikasi_kredensial__";
const PASSWORD_UJI = "kata-sandi-uji-123";

describe("verifikasiKredensial", () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(PASSWORD_UJI, 12);
    await db
      .insert(pengguna)
      .values({ username: USERNAME_UJI, passwordHash })
      .onConflictDoUpdate({ target: pengguna.username, set: { passwordHash } });
  });

  afterAll(async () => {
    await db.delete(pengguna).where(eq(pengguna.username, USERNAME_UJI));
  });

  it("mengembalikan pengguna kalau username dan kata sandi benar", async () => {
    const hasil = await verifikasiKredensial(USERNAME_UJI, PASSWORD_UJI);
    expect(hasil).toMatchObject({ name: USERNAME_UJI });
  });

  it("mengembalikan null kalau kata sandi salah", async () => {
    const hasil = await verifikasiKredensial(USERNAME_UJI, "kata-sandi-salah");
    expect(hasil).toBeNull();
  });

  it("mengembalikan null kalau username tidak terdaftar", async () => {
    const hasil = await verifikasiKredensial("__tidak_pernah_didaftarkan__", PASSWORD_UJI);
    expect(hasil).toBeNull();
  });

  it("mengembalikan null kalau input bukan string", async () => {
    expect(await verifikasiKredensial(undefined, PASSWORD_UJI)).toBeNull();
    expect(await verifikasiKredensial(USERNAME_UJI, undefined)).toBeNull();
    expect(await verifikasiKredensial(123, PASSWORD_UJI)).toBeNull();
  });
});
