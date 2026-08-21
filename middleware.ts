import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // api/cron dikecualikan: dipanggil cron sistem lewat token rahasia
  // sendiri (lihat app/api/cron/pengingat-impor/route.ts), bukan sesi login.
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
