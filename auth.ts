import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { verifikasiKredensial } from "./lib/auth/verifikasi-kredensial";

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
