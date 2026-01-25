import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/5d11f53e08ff5d7ca09f1ebf7f52b83a0dbd4a26a2f8a9e3d2b0c5f7e8a1b3c4d.sqlite",
  },
});
