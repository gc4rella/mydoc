import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";

// Allow overriding local persistence for E2E or other isolated dev environments.
// When unset, wrangler will use its default local persistence directory.
const persistTo = process.env.WRANGLER_PERSIST_TO;
initOpenNextCloudflareForDev(
  persistTo
    ? {
        // `wrangler d1 ... --persist-to <dir>` persists D1 at `<dir>/v3/d1`.
        // `getPlatformProxy({ persist: { path } })` expects the Miniflare root (`.../v3`).
        persist: { path: path.join(persistTo, "v3") },
      }
    : undefined
);

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
