import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/kskk/**/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  /* config options here */
};

export default nextConfig;
