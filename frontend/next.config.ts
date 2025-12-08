import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/agent/:path*',
        // We use the environment variable here.
        // If it's missing (local dev), we fallback to localhost.
        destination: `${process.env.BACKEND_URL || 'http://localhost:8080'}/:path*`, 
      },
    ];
  },
};

export default nextConfig;