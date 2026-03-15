import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: resolve(currentDirectory, "../.."),
  },
};

export default nextConfig;
