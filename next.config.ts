import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;

