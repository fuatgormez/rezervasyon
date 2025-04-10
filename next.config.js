/** @type {import('next').NextConfig} */
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
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
