# Improvement Plan: Quick Wins + Testing Coverage

## Phase 1: Quick Wins (DRY, Security, Indexes)

### 1.1 Consolidate `generateId()` to shared utility
- **Files**: `src/actions/pazienti.ts`, `src/actions/richieste.ts`, `src/actions/slots.ts`, `src/actions/appointments.ts`
- **Action**: Create `src/lib/id.ts` with a single `generateId()` function using `crypto.randomUUID()`
- **Impact**: Eliminates 4 duplicate function definitions

### 1.2 Fix session secret fallback — security hardening
- **Files**: `src/lib/session.ts`, `src/middleware.ts`
- **Action**: Remove the fallback `"complex_password_at_least_32_characters_long"`. Throw if `SESSION_SECRET` is not set in production.

### 1.3 Deduplicate session config between lib and middleware
- **Files**: `src/lib/session.ts`, `src/middleware.ts`
- **Action**: Export `sessionOptions` from `src/lib/session.ts` and import it in middleware. Single source of truth.

### 1.4 Add Zod validation schemas for server actions
- **Files**: New `src/lib/validations.ts`, then update all 5 action files
- **Action**: Create Zod schemas for patient creation/update, request creation, slot creation, and appointment scheduling. Use them in server actions before DB operations.

### 1.5 Add DB indexes on foreign keys
- **File**: `src/db/schema.ts`
- **Action**: Add indexes to:
  - `requests.patientId`
  - `appointments.requestId`
  - `appointments.slotId`

### 1.6 Add `updatedAt` columns to all tables
- **File**: `src/db/schema.ts`
- **Action**: Add `updatedAt` to `patients`, `requests`, `doctorSlots`, `appointments` tables

### 1.7 Fix `deleteRequest` to use Drizzle ORM instead of raw SQL
- **File**: `src/actions/richieste.ts`
- **Action**: Replace raw `db.$client.prepare()` batch with Drizzle's `db.batch()` API for consistency

### 1.8 Remove dead `/slots` route
- **File**: `src/app/(dashboard)/slots/page.tsx`
- **Action**: Delete the file (sidebar already links to `/agenda`)

---

## Phase 2: Testing Coverage

### 2.1 Add test setup utilities
- **Files**: New `src/__tests__/setup.ts`, `src/__tests__/helpers.ts`
- **Action**: Create mock DB helpers, shared mocks for `next/navigation`, date-fixing utilities

### 2.2 Test `src/actions/auth.ts`
- **File**: New `src/__tests__/auth.test.ts`
- **Tests**: login correct/wrong password, logout, missing ADMIN_PASSWORD

### 2.3 Test `src/actions/pazienti.ts`
- **File**: New `src/__tests__/pazienti.test.ts`
- **Tests**: CRUD operations, phone duplicate detection, delete guard

### 2.4 Test `src/actions/richieste.ts`
- **File**: New `src/__tests__/richieste.test.ts`
- **Tests**: CRUD, status transitions, cascade delete, filtering

### 2.5 Test `src/actions/slots.ts`
- **File**: New `src/__tests__/slots.test.ts`
- **Tests**: CRUD, overlap detection, block creation, availability toggle

### 2.6 Test `src/actions/appointments.ts`
- **File**: New `src/__tests__/appointments.test.ts`
- **Tests**: schedule, reschedule, cancel, auto-assign, retry logic

### 2.7 Add vitest coverage config
- **File**: `vitest.config.ts`
- **Action**: Add `@vitest/coverage-v8` and configure coverage thresholds

---

## Execution Order

```
Phase 1 (Quick Wins):
  1.1  Consolidate generateId()
  1.2  Fix session secret fallback
  1.3  Deduplicate session config
  1.4  Add Zod validation schemas
  1.5  Add DB indexes
  1.6  Add updatedAt columns
  1.7  Fix deleteRequest raw SQL
  1.8  Remove dead /slots route

Phase 2 (Testing):
  2.1  Add test setup utilities
  2.2  Test auth actions
  2.3  Test pazienti actions
  2.4  Test richieste actions
  2.5  Test slots actions
  2.6  Test appointments actions
  2.7  Add vitest coverage config
```

## Notes & Tradeoffs

- **DB migration needed**: Adding indexes and `updatedAt` columns requires a new Drizzle migration. Safe since additive.
- **Zod v4**: Project uses Zod v4 (`zod@4.3.6`), which has a different API than v3.
- **Iron Session in middleware**: CF Workers middleware has limitations — need to verify consolidated approach works in CF edge runtime.
- **Test mocking**: Server actions call `getDb()` which requires Cloudflare context. Tests will need to mock `getCloudflareContext` or use in-memory SQLite.
