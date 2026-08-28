import type { NextAuthConfig } from "next-auth";

export const authConfig = {
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
