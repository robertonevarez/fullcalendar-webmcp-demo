import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // WebMCP requires origin-isolated documents (spec + Chrome docs).
          { key: 'Origin-Agent-Cluster', value: '?1' },
          { key: 'Permissions-Policy', value: 'tools=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
