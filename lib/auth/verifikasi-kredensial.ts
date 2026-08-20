import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { pengguna } from "../db/schema";

export interface PenggunaTerautentikasi {
  id: string;
  name: string;
}

export async function verifikasiKredensial(
  username: unknown,
  password: unknown,
): Promise<PenggunaTerautentikasi | null> {
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }

  const [user] = await db
    .select()
    .from(pengguna)
    .where(eq(pengguna.username, username))
    .limit(1);
  if (!user) return null;

  const cocok = await bcrypt.compare(password, user.passwordHash);
  if (!cocok) return null;

  return { id: String(user.id), name: user.username };
}
