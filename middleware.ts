import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // api/cron dikecualikan: rute di bawahnya dipanggil cron sistem lewat
  // token rahasia sendiri (CLAUDE.md bagian 3), bukan sesi login.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
