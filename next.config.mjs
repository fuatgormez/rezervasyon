/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  eslint: {
    // Uyarılar için derlemeyi durdurmayacak
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typescript hatalarını görmezden gel
    ignoreBuildErrors: true,
  },
  output: "standalone", // Server kısmını ayrı paketleyecek
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  swcMinify: true,
  experimental: {
    // Modül yolu çözümlemesini geliştir
    esmExternals: "loose",
    // Server Component'lerin dışında tutulacak paketler
    serverComponentsExternalPackages: ["bufferutil", "utf-8-validate"],
  },
  // Statik optimize edilecek sayfaları yapılandır
  staticPageGenerationTimeout: 180,
  webpack: (config, { isServer }) => {
    // Resolve alias'ların düzgün çalışmasını sağla
    config.resolve.alias["@"] = path.resolve(__dirname, "src");

    // window nesnesini kullanmak isteyen modülleri client-side olarak işaretle
    if (isServer) {
      config.externals = [...config.externals, "bufferutil", "utf-8-validate"];
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
  // Vercel KV ortam değişkenleri
  env: {
    KV_REST_API_URL: process.env.KV_REST_API_URL || "",
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || "",
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN || "",
  },
};

export default nextConfig;
