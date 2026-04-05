# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node` (not jsdom; no browser/DOM testing)

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest API)

**Run Commands:**
```bash
npm test                # Run all tests (vitest run)
npx vitest             # Watch mode
npx vitest --coverage  # Coverage (no coverage config set up)
```

## Test File Organization

**Location:**
- All tests in a separate top-level `tests/` directory (not co-located with source)

**Naming:**
- `tests/{module-name}.test.ts` matching the source module name
- Example: `src/lib/session-time.ts` -> `tests/session-time.test.ts`
- Example: `src/lib/admin-account-safety.ts` -> `tests/admin-account-safety.test.ts`

**Structure:**
```
tests/
├── admin-account-safety.test.ts
├── admin-email-preview-rerun.test.ts
├── admin-ingestion-preview-route.test.ts
├── admin-ingestion-run-route.test.ts
├── admin-session.test.ts
├── club-token-compat.test.ts
├── crypto.test.ts
├── edge-update-session-participation.test.ts
├── gmail-apps-script-bridge.test.ts
├── ingestion-automation.test.ts
├── ingestion-preview.test.ts
├── join-dialog-morph.test.ts
├── open-badge-motion.test.ts
├── password-hash.test.ts
├── player-avatar.test.ts
├── session-court-display.test.ts
├── session-guests.test.ts
├── session-location.test.ts
├── session-participation-submit.test.ts
├── session-time.test.ts
├── sessions-v2-view.test.ts
├── smoke.test.ts
└── splitwise-utils.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";
import { functionUnderTest } from "../src/lib/module-name";

describe("module or feature name", () => {
  it("describes expected behavior in plain English", () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expectedValue);
  });
});
```

**Key patterns:**
- Import `describe`, `expect`, `it` (and `vi`, `beforeEach`, `afterEach` when needed) from `vitest`
- Use `describe` for grouping related tests, one level deep typically
- Use `it` (not `test`) for individual test cases
- Descriptive `it` strings: `"blocks self deactivation"`, `"validates quarter-hour increments"`
- No nested `describe` blocks observed

**Setup/Teardown Pattern (when mocking):**
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

**Simple Setup Pattern (env only):**
```typescript
beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret";
});
```

## Mocking

**Framework:** Vitest built-in `vi` module

**Fetch Mocking Pattern:**
```typescript
const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
  new Response(
    JSON.stringify({ ok: true, data: "value" }),
    { status: 200 }
  )
);

// After calling function under test:
expect(fetchSpy).toHaveBeenCalledTimes(1);
const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
expect(url).toBe("https://expected-url.com/endpoint");
expect(init.method).toBe("POST");
```

**Environment Variable Mocking:**
- Save original env: `const ORIGINAL_ENV = { ...process.env };`
- Override in `beforeEach`: `process.env = { ...ORIGINAL_ENV, VAR: "value" };`
- Restore in `afterEach`: `process.env = { ...ORIGINAL_ENV };`

**Apps Script Testing (advanced pattern):**
- Uses Node.js `vm` module to load and execute plain JavaScript in a sandboxed context
- Mocks Google Apps Script globals (`GmailApp`, `UrlFetchApp`, `Logger`, `PropertiesService`)
- See `tests/gmail-apps-script-bridge.test.ts` for the `loadScript()` helper pattern

**What to Mock:**
- `globalThis.fetch` for HTTP calls to external services
- `process.env` for environment-dependent behavior
- Google Apps Script globals when testing Apps Script bridge code

**What NOT to Mock:**
- Pure utility functions (test them directly with real inputs)
- Internal module dependencies (no module mocking observed)

## Fixtures and Factories

**Test Data:**
- Inline test data in each test case (no shared fixture files)
- Use literal objects and strings as inputs
- Example pattern:
```typescript
it("parses date with DD/MM primary and MM/DD fallback", () => {
  expect(parseSessionDate("Date 1/2/26")).toBe("2026-02-01");
  expect(parseSessionDate("Date 8/31/25")).toBe("2025-08-31");
});
```

**Complex test data built inline:**
```typescript
const parsed = parseReceipt(
  "",
  [
    "Booking confirmation / Receipt Match registration data",
    "Name Nhien Mai",
    "Date 1/2/26",
    "Time 5:00 pm-7:00 pm",
    "Club Sbh East Coast @ Expo , B20",
    "Payment data",
    "Paid $26.00 (which $2.15 TAX)"
  ].join("\n"),
  "Asia/Singapore"
);
```

**Location:**
- No separate fixtures directory. All test data is inline.

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Primary test type. All 23 test files are unit tests.
- Test pure functions from `src/lib/*.ts` and `supabase/functions/_shared/*.ts`
- Test individual API route handlers by calling exported `POST`/`GET` functions directly

**Integration Tests:**
- Not present as a separate category. Route handler tests approximate integration tests by calling the full handler with mocked fetch.

**E2E Tests:**
- Not used. No Playwright, Cypress, or similar framework.

**Component Tests:**
- Not present. No React component testing (no jsdom environment, no Testing Library).

## Common Patterns

**Pure Function Testing:**
```typescript
it("validates quarter-hour increments", () => {
  expect(isQuarterHourTime("10:00")).toBe(true);
  expect(isQuarterHourTime("10:15")).toBe(true);
  expect(isQuarterHourTime("10:10")).toBe(false);
  expect(isQuarterHourTime("25:00")).toBe(false);
});
```

**Discriminated Union Result Testing:**
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

**Async / Fetch Testing:**
```typescript
it("returns success payload when edge function succeeds", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true, sessionId: "s1" }), { status: 200 })
  );

  const result = await updateSessionParticipation("token", {
    sessionId: "s1", playerIds: ["p1"], guestCount: 2
  });

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ ok: true, status: 200, sessionId: "s1", ... });
});
```

**Route Handler Testing:**
```typescript
it("calls Apps Script bridge manual ingest action", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true, total: 3 }), { status: 200 })
  );

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
});
```

**Error Case Testing:**
```typescript
it("returns typed errors for non-404 failures", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: false, error: "invalid_players" }), { status: 400 })
  );

  const result = await updateSessionParticipation("token", { ... });

  expect(result).toEqual({
    ok: false,
    status: 400,
    error: "invalid_players",
    detail: undefined,
    unsupportedEndpoint: false
  });
});
```

**Determinism Testing:**
```typescript
it("returns deterministic CSS variables for same session id", () => {
  const first = getOpenBadgeMotionVars("session-1");
  const second = getOpenBadgeMotionVars("session-1");
  expect(first).toEqual(second);
});
```

**Boundary/Range Testing:**
```typescript
it("keeps generated values inside configured bounds", () => {
  const vars = getOpenBadgeMotionVars("session-range-check");
  const durationSeconds = readSeconds(vars["--open-flicker-duration"]);
  expect(durationSeconds).toBeGreaterThanOrEqual(MIN_DURATION);
  expect(durationSeconds).toBeLessThanOrEqual(MAX_DURATION);
});
```

## Adding New Tests

When adding a new library module at `src/lib/{name}.ts`:
1. Create `tests/{name}.test.ts`
2. Import from `"../src/lib/{name}"`
3. Use `describe("{name} description", () => { ... })` wrapper
4. Test all exported functions with representative inputs
5. Include edge cases (null, empty string, boundary values)
6. For async functions that call fetch, mock `globalThis.fetch` with `vi.spyOn`

When adding a new API route at `src/app/api/{path}/route.ts`:
1. Create `tests/{descriptive-name}-route.test.ts`
2. Import the route handler: `import { POST } from "../src/app/api/{path}/route"`
3. Call handler directly with `new Request(...)` objects
4. Mock external calls (`fetch`, env vars) in `beforeEach`/`afterEach`
5. Assert both `response.status` and parsed JSON body

---

*Testing analysis: 2026-04-05*
