import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8080';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        // For the /chat endpoint which is outside /api
        source: '/chat',
        destination: `${BACKEND_URL}/chat`,
      },
    ];
  },
};

export default nextConfig;