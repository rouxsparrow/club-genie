# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Library modules: `kebab-case.ts` (e.g., `src/lib/session-time.ts`, `src/lib/admin-account-safety.ts`)
- React components: `PascalCase.tsx` (e.g., `src/components/v2/SessionCard.tsx`, `src/components/v2/PlayerSelectionDialog.tsx`)
- Next.js routes: `route.ts` inside directory-based routing (e.g., `src/app/api/admin/sessions/route.ts`)
- Next.js pages: `page.tsx` (e.g., `src/app/sessions-v2/page.tsx`)
- Test files: `kebab-case.test.ts` in `tests/` directory (e.g., `tests/session-time.test.ts`)
- Supabase shared modules: `kebab-case.ts` in `supabase/functions/_shared/` (e.g., `supabase/functions/_shared/splitwise-utils.ts`)

**Functions:**
- Use `camelCase` for all functions: `toLocalTime`, `combineDateAndTimeToIso`, `validateClubTokenDetailed`
- Private/internal helpers use trailing underscore in Apps Script context: `processIngestion_`, `logIngestionRun_`
- Prefix boolean-returning functions with `is`/`should`: `isQuarterHourTime`, `shouldIncludeSessionInFilter`, `isBreakglassActive`
- Prefix data-fetching functions with `get`/`list`/`resolve`: `getSupabaseAdmin`, `listSessions`, `resolveAdminIdentityFromRequest`
- Prefix validation functions with `validate`: `validateDeactivateAdminAccount`, `validateAvatarFile`
- Prefix builder functions with `build`/`compute`: `buildEdgeHeaders`, `computeParticipationDiff`, `buildSplitwiseBySharesPayload`

**Variables:**
- Use `camelCase` for all variables and parameters
- Constants use `UPPER_SNAKE_CASE`: `MAX_AVATAR_FILE_SIZE_BYTES`, `MAX_EMAIL_PREVIEW_CHARS`, `ADMIN_COOKIE_NAME`

**Types:**
- Use `PascalCase` for type aliases and interfaces: `AdminIdentity`, `SessionViewStatus`, `ClubTokenValidationResult`
- Suffix response types with `Response`: `ListSessionsResponse`, `RotateTokenResponse`, `SetSessionGuestsResponse`
- Suffix input types with `Input` or `Payload`: `DeactivateGuardInput`, `JoinWithdrawPayload`, `UpdateSessionParticipationPayload`
- Suffix result types with `Result`: `DeactivateGuardResult`, `ClubTokenValidationResult`

## Code Style

**Formatting:**
- Prettier with config at `.prettierrc`
- `printWidth`: 100
- `singleQuote`: true (use single quotes for strings)
- `semi`: true (always use semicolons)
- `trailingComma`: "all" (trailing commas everywhere)

**Linting:**
- ESLint flat config at `eslint.config.mjs`
- Uses `@eslint/js` recommended + `typescript-eslint` recommended
- `no-unused-vars` disabled in favor of `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"` (prefix unused params with `_`)
- ECMAScript 2022, ESM source type

**TypeScript:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target ES2022, module ESNext, bundler resolution
- `forceConsistentCasingInFileNames`: true
- `isolatedModules`: true
- Project is ESM (`"type": "module"` in `package.json`)

## Import Organization

**Order:**
1. Node.js built-ins (e.g., `import crypto from "crypto"`, `import fs from "node:fs"`)
2. External packages (e.g., `import { NextResponse } from "next/server"`, `import { createClient } from "@supabase/supabase-js"`)
3. Internal absolute imports with relative paths (e.g., `import { getSupabaseAdmin } from "../../../../lib/supabase/admin"`)

**Path Aliases:**
- No path aliases configured. All imports use relative paths.
- Components imported via relative `../../components/` paths
- Library code imported via relative `../../lib/` paths

## Error Handling

**API Route Pattern:**
- Return `NextResponse.json({ ok: false, error: "message" }, { status: N })` for errors
- Return `NextResponse.json({ ok: true, ...data })` for success
- Use typed error strings (snake_case) for programmatic errors: `"cannot_deactivate_self"`, `"missing_default_payer"`, `"request_failed"`
- Wrap Supabase calls with error checking on `.error` property

**Library Function Pattern:**
- Return discriminated union results: `{ ok: true } | { ok: false; error: string }`
- Example from `src/lib/admin-account-safety.ts`:
```typescript
export type DeactivateGuardResult =
  | { ok: true }
  | { ok: false; error: "cannot_deactivate_self" | "cannot_deactivate_last_active_admin" };
```

**Edge Function Client Pattern:**
- Functions in `src/lib/edge.ts` return typed response objects with `ok` boolean
- Non-OK HTTP responses mapped to typed error objects with `status` and `error` fields
- JSON parse failures handled with `.catch(() => null)` fallback
- Example from `src/lib/edge.ts`:
```typescript
const data = (await response.json().catch(() => null)) as SomeResponse | null;
if (!response.ok) {
  return { ok: false, error: data?.error ?? "request_failed" };
}
```

**Throw Pattern:**
- Use `throw new Error("snake_case_code")` for internal errors caught by callers
- Callers check `error instanceof Error ? error.message : "fallback"` pattern
- See `resolveDefaultPayerId` in `src/app/api/admin/sessions/route.ts`

**Null Handling:**
- Use `?? ""` for default empty strings, `?? null` for nullable fields
- Use `maybeSingle()` for Supabase queries that may return zero rows
- Guard with `Boolean(data?.field)` pattern

## Logging

**Framework:** No logging framework. Uses `console` implicitly in browser code and `Logger.log` in Apps Script context.

**Patterns:**
- API routes do not log explicitly; errors returned in response body
- Apps Script bridge uses `Logger.log` for debug output

## Comments

**When to Comment:**
- Comments are sparse. Code is self-documenting via descriptive function/type names.
- No JSDoc or TSDoc usage observed.
- Comments used only for inline clarifications in complex logic (e.g., remainder distribution in splitwise utils)

## Function Design

**Size:** Functions are kept small, typically under 30 lines. Complex operations broken into helper functions.

**Parameters:** Use object parameters for functions with 3+ arguments. Example:
```typescript
export function buildSplitwiseBySharesPayload(params: {
  groupId: number;
  currencyCode: string;
  description: string;
  costCents: number;
  // ...
}): BuildResult { ... }
```

**Return Values:** Always use typed return values. Prefer discriminated unions (`{ ok: true; ... } | { ok: false; error: string }`) over throwing.

## Module Design

**Exports:** Named exports only. No default exports except for Next.js page components.

**Barrel Files:** Not used. Each module imported directly by path.

**Single Responsibility:** Each `src/lib/*.ts` file contains closely related functions for one domain concept (e.g., `session-time.ts` for time utilities, `player-avatar.ts` for avatar logic).

## Component Patterns

**Client Components:** All React components and pages use `"use client"` directive at the top.

**Icon System:** Phosphor Icons wrapped through `src/components/icons.tsx` with a `withRegularIcon` HOC that defaults `weight="regular"`. Import icons from `../../components/icons` not directly from `@phosphor-icons/react`.

**State Management:** React `useState`/`useEffect`/`useCallback`/`useRef` hooks. No external state management library.

**Types in Components:** Define types inline within the component file. Use `interface` for component props, `type` for data shapes.

**CSS:** Tailwind CSS for styling. Global V2 styles imported via `../../app/globals-v2.css`. Framer Motion for animations.

---

*Convention analysis: 2026-04-05*
