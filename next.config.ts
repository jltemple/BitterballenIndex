import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Leaflet requires transpiling for Next.js
  transpilePackages: [],
};

export default nextConfig;
