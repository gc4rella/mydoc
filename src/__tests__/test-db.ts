import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import path from "path";
import fs from "fs";

export type TestDb = BetterSQLite3Database<typeof schema>;

export function createTestDb(): TestDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  const migrationsPath = path.join(process.cwd(), "src/db/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(migrationsPath, filename), "utf-8");
      return { sql, filename };
    });

  for (const migration of migrationFiles) {
    sqlite.exec(migration.sql);
  }

  return db;
}

// Global registry so the mock factory can access the DB
// This works because vi.mock factories can access globalThis
declare global {
  // eslint-disable-next-line no-var
  var __testDb: TestDb | undefined;
}

globalThis.__testDb = undefined;

export function setTestDb(db: TestDb) {
  globalThis.__testDb = db;
}

export function getTestDb(): TestDb {
  if (!globalThis.__testDb) {
    throw new Error("Test DB not initialized. Call setTestDb() first.");
  }
  return globalThis.__testDb;
}
