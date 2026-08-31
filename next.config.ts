import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this repo (avoids picking up a parent lockfile).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
