import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/db/schema";

type TestDb = BetterSQLite3Database<typeof schema>;

export const testDbState: { db: TestDb | null } = { db: null };
