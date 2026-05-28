import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevents webpack from bundling pdf-parse, which loads test fixtures
  // at module-init time and breaks the Next.js bundler.
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
