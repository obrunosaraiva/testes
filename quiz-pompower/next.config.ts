import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone: gera .next/standalone com server.js + node_modules mínimos.
  // Crítico pro Dockerfile multi-stage usado no Railway.
  output: "standalone",
};

export default nextConfig;
