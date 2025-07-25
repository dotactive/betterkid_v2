import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['axios'], // ensure axios is bundled properly
  },
};

export default nextConfig;
