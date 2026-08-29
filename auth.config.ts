import type { NextAuthConfig } from "next-auth";

// Durasi sesi berdasarkan checkbox "Ingat Saya" di halaman login.
// Disimpan sebagai token.sessionExpiry (epoch ms) di JWT, diperiksa
// setiap request di callback jwt di bawah.
const DURASI_INGAT_SAYA = 30 * 24 * 60 * 60 * 1000; // 30 hari
const DURASI_SESI_BIASA = 8 * 60 * 60 * 1000; // 8 jam (satu hari kerja)

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Batas maksimum umur cookie JWT. Diatur 30 hari (sama dengan
    // DURASI_INGAT_SAYA) — sesi yang lebih pendek (8 jam) dikontrol
    // lewat token.sessionExpiry di callback jwt, bukan lewat maxAge.
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const sudahMasuk = !!auth?.user;
      const diHalamanLogin = nextUrl.pathname.startsWith("/login");

      if (diHalamanLogin) {
        if (sudahMasuk) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return sudahMasuk;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // "ingatSaya" dikirim dari authorize() di auth.ts sebagai
        // properti tambahan di objek user — lihat app/login/actions.ts.
        const ingatSaya = (user as Record<string, unknown>).ingatSaya === true;
        token.sessionExpiry =
          Date.now() + (ingatSaya ? DURASI_INGAT_SAYA : DURASI_SESI_BIASA);
      }

      // Periksa expiry setiap request — kalau sesi habis, kosongkan
      // token supaya callback authorized() mengarahkan ke halaman login.
      if (
        typeof token.sessionExpiry === "number" &&
        Date.now() > token.sessionExpiry
      ) {
        return {} as typeof token;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
