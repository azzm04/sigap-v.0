"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { cekRateLimit, catatGagal } from "@/lib/auth/rate-limit";
import { verifikasiTurnstile } from "@/lib/auth/turnstile";

export interface StatusLogin {
  galat?: string;
}

export async function masuk(
  _sebelumnya: StatusLogin | undefined,
  formData: FormData,
): Promise<StatusLogin> {
  const username = formData.get("username");
  const password = formData.get("password");
  const ingatSaya = formData.get("ingatSaya") === "on";

  if (typeof username !== "string" || !username.trim()) {
    return { galat: "Username wajib diisi." };
  }
  if (typeof password !== "string" || !password) {
    return { galat: "Kata sandi wajib diisi." };
  }

  // Verifikasi CAPTCHA (Cloudflare Turnstile) -- dicek paling awal, sebelum
  // rate limit maupun Auth.js, supaya percobaan otomatis (bot) tidak pernah
  // sempat menyentuh keduanya. Tidak aktif sama sekali kalau
  // TURNSTILE_SECRET_KEY belum diisi (lihat lib/auth/turnstile.ts).
  const turnstileToken = formData.get("cf-turnstile-response");
  const turnstileLolos = await verifikasiTurnstile(
    typeof turnstileToken === "string" ? turnstileToken : null,
  );
  if (!turnstileLolos) {
    return { galat: "Verifikasi CAPTCHA gagal. Coba lagi." };
  }

  // Rate limiting — cek sebelum menyentuh Auth.js
  const limit = cekRateLimit(username);
  if (limit.diblokir) {
    const menit = Math.ceil(limit.sisaDetik / 60);
    return {
      galat: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${menit} menit.`,
    };
  }

  try {
    await signIn("credentials", {
      username,
      password,
      ingatSaya: ingatSaya ? "true" : "false",
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      catatGagal(username);
      return { galat: "Username atau kata sandi salah." };
    }
    // NEXT_REDIRECT dan error lain harus di-throw ulang
    throw error;
  }

  return {};
}
