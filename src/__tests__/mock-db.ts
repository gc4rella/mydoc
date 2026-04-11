// This file is used as a mock for @/db in tests
// It uses a shared module-level variable that both the mock and test can access
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/db/schema";

type TestDb = BetterSQLite3Database<typeof schema>;

let currentDb: TestDb | null = null;

export function __setTestDb(db: TestDb) {
  currentDb = db;
}

export function __clearTestDb() {
  currentDb = null;
}

export function getDb(): TestDb {
  if (!currentDb) {
    throw new Error("Test DB not initialized. Call __setTestDb() first.");
  }
  return currentDb;
}

// Export for direct access in tests
export { currentDb as __currentDb };
