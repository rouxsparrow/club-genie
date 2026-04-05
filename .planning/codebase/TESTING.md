# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node` (not jsdom - no browser simulation)

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest API)

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npx vitest            # Watch mode (default vitest behavior)
npx vitest --coverage # Coverage (no coverage config defined yet)
```

## Test File Organization

**Location:**
- All tests in top-level `tests/` directory (separate from source, not co-located)

**Naming:**
- `{module-name}.test.ts` matching the source module name
- Example: `src/lib/admin-session.ts` -> `tests/admin-session.test.ts`
- Example: `src/lib/session-court-display.ts` -> `tests/session-court-display.test.ts`

**Structure:**
```
tests/
├── admin-account-safety.test.ts       # Tests src/lib/admin-account-safety.ts
├── admin-email-preview-rerun.test.ts  # Tests src/lib/admin-email-preview-rerun.ts
├── admin-ingestion-preview-route.test.ts  # Tests src/app/api/admin/ingestion/preview/route.ts
├── admin-ingestion-run-route.test.ts  # Tests src/app/api/admin/ingestion/run/route.ts
├── admin-session.test.ts             # Tests src/lib/admin-session.ts
├── club-token-compat.test.ts         # Tests src/lib/club-token-compat.ts
├── crypto.test.ts                    # Tests src/lib/crypto.ts
├── edge-update-session-participation.test.ts  # Tests src/lib/edge.ts
├── gmail-apps-script-bridge.test.ts  # Tests scripts/gmail-apps-script-bridge.js
├── ingestion-automation.test.ts      # Tests supabase/functions/_shared/ modules
├── ingestion-preview.test.ts         # Tests src/lib/ingestion-preview.ts
├── join-dialog-morph.test.ts         # Tests src/lib/join-dialog-morph.ts
├── open-badge-motion.test.ts         # Tests src/lib/open-badge-motion.ts
├── password-hash.test.ts             # Tests src/lib/password-hash.ts
├── player-avatar.test.ts             # Tests src/lib/player-avatar.ts
├── session-court-display.test.ts     # Tests src/lib/session-court-display.ts
├── session-guests.test.ts            # Tests src/lib/session-guests.ts
├── session-location.test.ts          # Tests src/lib/session-location.ts
├── session-participation-submit.test.ts  # Tests src/lib/session-participation-submit.ts
├── session-time.test.ts              # Tests src/lib/session-time.ts
├── sessions-v2-view.test.ts          # Tests src/lib/sessions-v2-view.ts
├── smoke.test.ts                     # Basic smoke test
└── splitwise-utils.test.ts           # Tests supabase/functions/_shared/splitwise-utils.ts
```

**Total:** 23 test files, ~1775 lines of test code

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";
import { functionUnderTest } from "../src/lib/module-name";

describe("module or feature name", () => {
  it("describes expected behavior in plain English", () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expected);
  });
});
```

**Key patterns:**
- Import `describe`, `expect`, `it` (and optionally `vi`, `beforeEach`, `afterEach`, `beforeAll`) from `vitest`
- One `describe` block per logical group, often one per file
- Nested `describe` blocks for sub-features (e.g., `tests/session-court-display.test.ts` has separate `describe` for `formatCourtLabelForDisplay` and `formatCourtTimeRangeForDisplay`)
- Test names use active voice: `"creates a signed session value and verifies it"`, `"blocks self deactivation"`

**Setup/Teardown (when needed):**
```typescript
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});
```

**Environment setup with beforeAll:**
```typescript
beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret";
});
```

## Mocking

**Framework:** Vitest built-in `vi` module

**Pattern 1 - Spy on globalThis.fetch (most common for API/edge tests):**
```typescript
const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
  new Response(
    JSON.stringify({ ok: true, sessionId: "session-1" }),
    { status: 200 }
  )
);

// After call, verify:
expect(fetchSpy).toHaveBeenCalledTimes(1);
const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
expect(url).toBe("https://demo.supabase.co/functions/v1/update-session-participation");
expect(init.method).toBe("POST");
```

**Pattern 2 - Environment variable manipulation:**
```typescript
// Save original env
const ORIGINAL_ENV = { ...process.env };

// Set test env
process.env = {
  ...ORIGINAL_ENV,
  APPS_SCRIPT_BRIDGE_URL: "https://bridge.example.com/webhook",
  APPS_SCRIPT_BRIDGE_SECRET: "bridge-secret"
};

// Restore in afterEach
process.env = { ...ORIGINAL_ENV };
```

**Pattern 3 - VM context for Google Apps Script testing:**
```typescript
// Load script into sandboxed VM context with mock globals
import vm from "node:vm";

const context = {
  Logger: { log: vi.fn() },
  UrlFetchApp: { fetch: vi.fn() },
  GmailApp: { search: vi.fn(() => []), ... },
  // ...
} as unknown as ScriptContext;

vm.createContext(context as unknown as vm.Context);
vm.runInContext(code, context as unknown as vm.Context, { filename: scriptPath });
```
See `tests/gmail-apps-script-bridge.test.ts` for this pattern.

**Pattern 4 - Replace internal functions with vi.fn():**
```typescript
context.processIngestion_ = vi.fn(() => ({
  ok: true,
  total: 0,
  ingested: 0,
  // ...
}));
context.logIngestionRun_ = vi.fn(() => ({
  ok: false,
  statusCode: 403,
  error: "http_403: unauthorized"
}));
```

**What to Mock:**
- `globalThis.fetch` for any HTTP calls (edge functions, external APIs)
- `process.env` for environment-dependent behavior
- Google Apps Script globals (`GmailApp`, `UrlFetchApp`, `Logger`) via VM sandbox

**What NOT to Mock:**
- Pure logic functions (validators, formatters, parsers) - test directly
- Crypto operations (`hashPassword`, `verifyPassword`) - test with real implementations
- Data transformation functions - test with real inputs/outputs

## Fixtures and Factories

**Test Data:**
- Inline test data, no shared fixture files
- Helper functions defined within test files for repetitive data:
```typescript
function makeMessage(id: string) {
  const thread = { addLabel: vi.fn() };
  return {
    getId: () => id,
    getBody: () => "<p>receipt</p>",
    getPlainBody: () => "receipt",
    getThread: () => thread
  };
}
```

**Location:**
- No dedicated fixtures directory
- All test data is co-located within each test file

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests (majority):**
- Test pure functions from `src/lib/` modules
- No DOM rendering tests
- Test input/output transformations directly
- Examples: `tests/session-court-display.test.ts`, `tests/player-avatar.test.ts`, `tests/password-hash.test.ts`

**Integration-style Tests:**
- Test Next.js API route handlers by importing and calling `POST()` directly
- Construct `Request` objects manually and assert on `Response`:
```typescript
const response = await POST(
  new Request("http://localhost/api/admin/ingestion/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  })
);
const body = (await response.json()) as Record<string, unknown>;
expect(response.status).toBe(200);
expect(body.ok).toBe(true);
```
- Examples: `tests/admin-ingestion-run-route.test.ts`, `tests/admin-ingestion-preview-route.test.ts`

**Smoke Test:**
- Basic sanity check at `tests/smoke.test.ts`
- Imports and verifies the placeholder export from `src/index.ts`

**E2E Tests:**
- Not used. No Playwright/Cypress configured.

**Component Tests:**
- Not used. Vitest environment is `node` (no jsdom), so React component testing is not set up.

## Common Patterns

**Async Testing:**
```typescript
it("hashes and verifies a valid password", async () => {
  const password = "adminpass123";
  const hash = await hashPassword(password);
  expect(hash.startsWith("scrypt$")).toBe(true);
  await expect(verifyPassword(password, hash)).resolves.toBe(true);
});
```

**Error Testing (Result Object Pattern):**
```typescript
it("blocks self deactivation", () => {
  const result = validateDeactivateAdminAccount({
    isSelf: true,
    targetCurrentlyActive: true,
    activeAdminCount: 2
  });
  expect(result).toEqual({ ok: false, error: "cannot_deactivate_self" });
});
```

**Null Return Testing:**
```typescript
it("rejects an expired signed session value", () => {
  const now = Date.now();
  const value = createAdminSessionValue({
    uid: "00000000-0000-0000-0000-000000000001",
    username: "admin-one",
    sessionVersion: 1,
    isBreakglass: false,
    nowMs: now - 8 * 24 * 60 * 60 * 1000
  });
  expect(verifyAdminSessionValue(value)).toBe(false);
  expect(readAdminSessionValue(value)).toBeNull();
});
```

**Discriminated Union Guard in Tests:**
```typescript
const built = buildSplitwiseBySharesPayload({ ... });
expect(built.ok).toBe(true);
if (!built.ok) return;  // TypeScript narrowing guard

const payload = built.payload as Record<string, unknown>;
expect(payload.cost).toBe("88.00");
```

**Edge Case / Boundary Testing:**
```typescript
it("keeps fallback when label is empty", () => {
  expect(formatCourtLabelForDisplay("Court")).toBe("Court");
  expect(formatCourtLabelForDisplay("")).toBe("Court");
  expect(formatCourtLabelForDisplay(null)).toBe("Court");
});
```

## Adding New Tests

**For a new `src/lib/` module:**
1. Create `tests/{module-name}.test.ts`
2. Import functions directly from `../src/lib/{module-name}`
3. Use `describe` + `it` blocks with descriptive names
4. Test happy path, edge cases, and error cases
5. No mocks needed for pure functions

**For a new API route:**
1. Create `tests/{feature-name}-route.test.ts`
2. Import the route handler: `import { POST } from "../src/app/api/..."`
3. Mock `globalThis.fetch` if the route calls external services
4. Set up env vars in `beforeEach`, restore in `afterEach`
5. Construct `Request` objects and assert on `Response`

**For Supabase edge function shared modules:**
1. Create `tests/{feature-name}.test.ts`
2. Import from `../supabase/functions/_shared/{module}`
3. Test pure logic directly without Supabase client mocking

---

*Testing analysis: 2026-04-05*
