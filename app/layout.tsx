import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ambilTema } from "@/lib/tema";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "GL TRACKER",
  description: "Sistem pemantauan GL — Jasa Raharja cabang Semarang",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = await ambilTema();

  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${jetbrainsMono.variable} ${tema === "dark" ? "dark" : ""} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
