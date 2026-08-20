import type { NextAuthConfig } from "next-auth";

// Konfigurasi yang aman dijalankan di middleware (Edge runtime): tidak ada
// akses database atau bcrypt di sini. Provider Credentials (yang butuh
// keduanya) ditambahkan di auth.ts, dipakai di route handler & server action.
export const authConfig = {
  // Aplikasi ini di-deploy sendiri lewat Docker Compose di satu VPS
  // (CLAUDE.md bagian 3), bukan layanan multi-tenant, jadi host request
  // selalu bisa dipercaya. Tanpa ini Auth.js menolak semua request di mode
  // produksi dengan galat UntrustedHost.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
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
    // Auth.js tidak otomatis meneruskan id pengguna ke sesi JWT — tanpa ini
    // session.user.id selalu undefined, padahal dipakai untuk mencatat siapa
    // yang menulis baris tinjauan (CLAUDE.md bagian 5).
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
