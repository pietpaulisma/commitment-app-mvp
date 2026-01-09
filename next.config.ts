import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
  // Enable static optimization for better client-side navigation
  output: 'standalone',
  trailingSlash: false,
  // Optimize for client-side routing
  generateEtags: false,
  poweredByHeader: false,
  // Expose app version as env variable for client components
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
  },
};

export default nextConfig;
