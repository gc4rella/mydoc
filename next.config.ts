import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Allow overriding local persistence for E2E or other isolated dev environments.
// When unset, wrangler will use its default local persistence directory.
const persistTo = process.env.WRANGLER_PERSIST_TO;
initOpenNextCloudflareForDev(persistTo ? { persistTo } : undefined);

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for Cloudflare Pages
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
