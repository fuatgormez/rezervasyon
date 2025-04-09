const nextConfig = {
  eslint: {
    // Uyarılar için derlemeyi durdurmayacak
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typescript hatalarını görmezden gel
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
