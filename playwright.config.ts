import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function readEnvValueFromFile(filePath: string, key: string): string | undefined {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      if (k !== key) continue;
      const v = line.slice(idx + 1).trim();
      // Basic support for quoted values.
      if (
        (v.startsWith("\"") && v.endsWith("\"")) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        return v.slice(1, -1);
      }
      return v;
    }
  } catch {
    // Ignore missing files.
  }
  return undefined;
}

function resolveEnvValue(key: string, fallback: string): string {
  if (process.env[key]) return process.env[key] as string;

  // Prefer Next.js local env for Node runtime, fall back to wrangler dev vars.
  const candidates = [".env.local", ".dev.vars"];
  for (const file of candidates) {
    const val = readEnvValueFromFile(path.join(process.cwd(), file), key);
    if (val) return val;
  }

  return fallback;
}

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Keep the server and the tests aligned on credentials, even in CI where .env files are absent.
const ADMIN_PASSWORD = resolveEnvValue("ADMIN_PASSWORD", "changeme");
const SESSION_SECRET = resolveEnvValue(
  "SESSION_SECRET",
  "complex_password_at_least_32_characters_long"
);

const RUN_ID =
  process.env.E2E_RUN_ID ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const WRANGLER_PERSIST_TO =
  process.env.WRANGLER_PERSIST_TO ??
  path.join(process.cwd(), ".wrangler", "e2e-state", RUN_ID);

process.env.E2E_ADMIN_PASSWORD = ADMIN_PASSWORD;
process.env.WRANGLER_PERSIST_TO = WRANGLER_PERSIST_TO;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run e2e:server",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Ensure server actions/middleware can read credentials via process.env.
      ADMIN_PASSWORD,
      SESSION_SECRET,
      NEXT_TELEMETRY_DISABLED: "1",
      WRANGLER_PERSIST_TO,
      // Keep wrangler logs in-repo (handy locally, and avoids writing into OS-specific prefs dirs).
      WRANGLER_LOG_PATH: path.join(process.cwd(), ".wrangler", "logs"),
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
