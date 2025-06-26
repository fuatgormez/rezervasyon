import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Socket.IO client tarafı için node modüllerini polifill
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      fs: false,
      dns: false,
      tls: false,
      child_process: false,
      lokijs: false, // İntl API için gerekebiliyor
    };

    return config;
  },
};

export default nextConfig;
