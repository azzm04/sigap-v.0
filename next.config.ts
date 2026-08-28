import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["https://less-ride-strictly-bobby.trycloudflare.com"],
  experimental: {
    // Next.js membatasi body Server Action 1 MB secara default -- lebih
    // kecil dari batas unggahan sendiri yang sudah divalidasi di kode
    // (KSKK maks 10 MB, Tanda Tangan Saksi/Kepala Cabang/Petugas Survei
    // maks 2 MB, lihat app/gl/[idJaminan]/actions.ts dan
    // app/pengaturan/actions.ts). Tanpa ini, unggahan di atas 1 MB ditolak
    // Next.js sendiri sebelum sempat menyentuh validasi kita, dengan pesan
    // error mentah yang tidak jelas bagi petugas.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  /* config options here */
};

export default nextConfig;
