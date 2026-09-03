import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Served at protocoltooling.com/integrations/fullcalendar/demo via the main
  // site's external rewrite.
  basePath: "/integrations/fullcalendar/demo",
  // Keep Turbopack scoped to this repo (avoids picking up a parent lockfile).
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // WebMCP requires origin-isolated documents.
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "Permissions-Policy", value: "tools=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
