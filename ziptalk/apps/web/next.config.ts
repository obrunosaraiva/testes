import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ziptalk/db", "@ziptalk/shared", "@ziptalk/evolution-client"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default config;
