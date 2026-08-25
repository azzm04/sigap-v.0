import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";

// URL detail GL (/gl/[idJaminan]) memuat Nomor ID Jaminan asli sebagai
// parameter route -- data pribadi (CLAUDE.md aturan keras #4) yang jadi
// gampang ditebak/dibagikan lewat riwayat browser, screenshot, atau link
// yang di-paste ke tempat lain. Token di sini menggantikan Nomor ID Jaminan
// di URL dengan bentuk terenkripsi yang tidak bisa dibaca balik tanpa
// AUTH_SECRET server.
//
// Dibuat DETERMINISTIK (idJaminan yang sama selalu menghasilkan token yang
// sama) supaya revalidatePath(`/gl/${token}`) di app/gl/[idJaminan]/actions.ts
// selalu cocok persis dengan URL yang sedang dibuka pengguna -- kalau
// token acak setiap kali di-generate, revalidatePath akan menyasar path
// yang salah. IV diturunkan dari HMAC(kunci, idJaminan) supaya deterministik
// tapi tetap tidak bocorkan kemiripan prefix antar-idJaminan yang berbeda
// (beda dari IV tetap yang bisa bocor lewat mode CBC).

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

export function enkripsiIdJaminan(idJaminan: string): string {
  const kunci = turunkanKunci();
  const iv = ivUntuk(idJaminan, kunci);
  const cipher = createCipheriv(ALGORITMA, kunci, iv);
  const terenkripsi = Buffer.concat([cipher.update(idJaminan, "utf8"), cipher.final()]);
  return Buffer.concat([iv, terenkripsi]).toString("base64url");
}

// null kalau token tidak valid/rusak/dipalsukan -- pemanggil (halaman
// detail GL) harus menampilkan 404, bukan melempar error ke pengguna.
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
