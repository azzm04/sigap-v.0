import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";


const ALGORITMA = "aes-256-cbc";

function turunkanKunci(): Buffer {
  const rahasia = process.env.AUTH_SECRET;
  if (!rahasia) {
    throw new Error(
      "AUTH_SECRET tidak diset -- dibutuhkan untuk mengenkripsi URL detail GL.",
    );
  }
  return createHash("sha256").update(`sigap-token-gl:${rahasia}`).digest();
}

function ivUntuk(plaintext: string, kunci: Buffer): Buffer {
  return createHmac("sha256", kunci).update(plaintext).digest().subarray(0, 16);
}

export function enkripsiTeks(teks: string): string {
  const kunci = turunkanKunci();
  const iv = ivUntuk(teks, kunci);
  const cipher = createCipheriv(ALGORITMA, kunci, iv);
  const terenkripsi = Buffer.concat([cipher.update(teks, "utf8"), cipher.final()]);
  return Buffer.concat([iv, terenkripsi]).toString("base64url");
}

export function enkripsiIdJaminan(idJaminan: string): string {
  return enkripsiTeks(idJaminan);
}

// null kalau token tidak valid/rusak/dipalsukan -- pemanggil (halaman detail GL) harus menampilkan 404, bukan melempar error ke pengguna.
export function dekripsiToken(token: string): string | null {
  try {
    const kunci = turunkanKunci();
    const gabungan = Buffer.from(token, "base64url");
    if (gabungan.length <= 16) return null;
    const iv = gabungan.subarray(0, 16);
    const terenkripsi = gabungan.subarray(16);
    const decipher = createDecipheriv(ALGORITMA, kunci, iv);
    const hasil = Buffer.concat([decipher.update(terenkripsi), decipher.final()]);
    return hasil.toString("utf8");
  } catch {
    return null;
  }
}
