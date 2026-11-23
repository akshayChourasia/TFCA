import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium is launched from the server for PDF export.
  serverExternalPackages: ["playwright-core"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
