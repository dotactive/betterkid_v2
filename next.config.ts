import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['axios'], // ensure axios is bundled properly
};

export default nextConfig;
