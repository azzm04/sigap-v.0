import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { verifikasiKredensial } from "./lib/auth/verifikasi-kredensial";
import { resetPercobaan } from "./lib/auth/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Kata Sandi", type: "password" },
        ingatSaya: {},
      },
      async authorize(kredensial) {
        const user = await verifikasiKredensial(
          kredensial?.username,
          kredensial?.password,
        );
        if (!user) return null;

        // Reset hitungan rate limit setelah login berhasil
        if (typeof kredensial?.username === "string") {
          resetPercobaan(kredensial.username);
        }

        return {
          ...user,
          ingatSaya: kredensial?.ingatSaya === "true",
        };
      },
    }),
  ],
});
