/** @type {import('next').NextConfig} */
const path = require("path");

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
  // Client-side rendering içine dönüştürülecek sayfaları belirle
  unstable_runtimeJS: true,
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

module.exports = nextConfig;
