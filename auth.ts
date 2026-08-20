import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { verifikasiKredensial } from "./lib/auth/verifikasi-kredensial";

// Autentikasi satu akun, kredensial disiapkan lewat seeder (scripts/buat-akun.ts),
// bukan halaman pendaftaran. Lihat CLAUDE.md aturan keras #6.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Kata Sandi", type: "password" },
      },
      authorize: (kredensial) =>
        verifikasiKredensial(kredensial?.username, kredensial?.password),
    }),
  ],
});
