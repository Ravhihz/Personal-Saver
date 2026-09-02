import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys", "pino", "pino-pretty"],
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
