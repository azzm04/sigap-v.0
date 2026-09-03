const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Sengaja opsional: kalau TURNSTILE_SECRET_KEY belum diisi (mis. lingkungan
 * pengembangan sebelum kunci Cloudflare didaftarkan), CAPTCHA dianggap tidak
 * aktif dan verifikasi selalu lolos -- form login tetap berfungsi tanpa
 * widget. Begitu kunci diisi di produksi, verifikasi wajib lolos.
 */
export function turnstileAktif(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifikasiTurnstile(token: string | null): Promise<boolean> {
  if (!turnstileAktif()) return true;
  if (!token) return false;

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: token,
      }),
    });
    const data: { success: boolean } = await res.json();
    return data.success === true;
  } catch {
    // Cloudflare tidak bisa dihubungi -- anggap gagal, jangan biarkan
    // brute force lolos cuma karena layanan verifikasi sedang down.
    return false;
  }
}
