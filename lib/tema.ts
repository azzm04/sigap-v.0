"use server";

import { cookies } from "next/headers";

const KUNCI_COOKIE_TEMA = "tema";

export async function ambilTema(): Promise<"light" | "dark"> {
  const cookieStore = await cookies();
  return cookieStore.get(KUNCI_COOKIE_TEMA)?.value === "dark" ? "dark" : "light";
}

export async function alihkanTema(temaSaatIni: "light" | "dark") {
  const cookieStore = await cookies();
  const temaBaru = temaSaatIni === "dark" ? "light" : "dark";
  cookieStore.set(KUNCI_COOKIE_TEMA, temaBaru, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
