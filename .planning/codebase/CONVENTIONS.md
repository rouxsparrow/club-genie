# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Library modules: `kebab-case.ts` (e.g., `src/lib/session-court-display.ts`, `src/lib/admin-account-safety.ts`)
- React components: `PascalCase.tsx` for v2 components (e.g., `src/components/v2/SessionCard.tsx`, `src/components/v2/AnimatedBackground.tsx`)
- React components (legacy): `kebab-case.tsx` (e.g., `src/components/player-avatar-circle.tsx`, `src/components/admin-navbar.tsx`)
- API routes: `route.ts` inside Next.js App Router directories (e.g., `src/app/api/admin/login/route.ts`)
- Page components: `page.tsx` for pages, `sessions-client.tsx` for client wrappers
- Test files: `kebab-case.test.ts` in `tests/` directory (e.g., `tests/admin-session.test.ts`)

**Functions:**
- Use `camelCase` for all functions: `createAdminSessionValue`, `readAdminSessionValue`, `formatCourtLabelForDisplay`
- Prefix getters with `get`: `getAdminSessionSecret()`, `getSupabaseAdmin()`, `getInitials()`
- Prefix validators with `validate`: `validateAvatarFile()`, `validateAdminPassword()`, `validateDeactivateAdminAccount()`
- Prefix builders with `build`: `buildParticipationUpdatePayload()`, `buildSplitwiseBySharesPayload()`
- Prefix formatters with `format`: `formatCourtLabelForDisplay()`, `formatSessionLocationForDisplay()`
- Prefix parsers with `parse`: `parseMoneyToCents()`, `parseSessionDate()`
- Internal/private helpers suffixed with underscore in Apps Script: `processIngestion_()`, `logIngestionRun_()`

**Variables:**
- Use `camelCase` for local variables and parameters
- Use `UPPER_SNAKE_CASE` for module-level constants: `ADMIN_COOKIE_NAME`, `MAX_AVATAR_FILE_SIZE_BYTES`, `PLAYER_AVATAR_BUCKET`

**Types:**
- Use `PascalCase` for type aliases and interfaces: `AdminIdentity`, `AdminSessionPayload`, `ParticipationDiff`
- Prefer `type` over `interface` for data shapes (all lib modules use `type`)
- Use `interface` only for component props in v2 components: `SessionCardProps`, `Session`
- Suffix row types with `Row`: `AdminUserRow`
- Suffix response types with `Response`: `ListSessionsResponse`, `RotateTokenResponse`
- Suffix input types with `Input` or `Payload`: `CourtInput`, `JoinWithdrawPayload`

## Code Style

**Formatting:**
- Prettier with config at `.prettierrc`
- Single quotes (`singleQuote: true`)
- Semicolons always (`semi: true`)
- Trailing commas everywhere (`trailingComma: "all"`)
- Print width 100 characters (`printWidth: 100`)
- Run with: `npm run format`

**Linting:**
- ESLint 9 flat config at `eslint.config.mjs`
- Uses `@eslint/js` recommended + `typescript-eslint` recommended
- `no-unused-vars` off for JS, `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"` (prefix unused params with `_`)
- Scripts directory and postcss config are ignored
- Run with: `npm run lint`

**TypeScript:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- Target ES2022
- Module resolution: Bundler
- No emit (`noEmit: true`) - Next.js handles compilation
- `forceConsistentCasingInFileNames: true`
- Run type check with: `npm run typecheck`

## Import Organization

**Order:**
1. Node.js built-ins (e.g., `import crypto from "crypto"`)
2. External packages (e.g., `import { NextResponse } from "next/server"`, `import { createClient } from "@supabase/supabase-js"`)
3. React hooks (e.g., `import { useState, useEffect } from "react"`)
4. Internal library modules with relative paths (e.g., `import { getSupabaseAdmin } from "../../../../lib/supabase/admin"`)
5. CSS imports last (e.g., `import "../globals-v2.css"`)

**Path Aliases:**
- No path aliases configured. All imports use relative paths with `../` navigation.
- Deep API routes use long relative paths like `../../../../lib/supabase/admin`

## Error Handling

**Result Objects Pattern (dominant pattern):**
- Functions return discriminated `{ ok: true, ... } | { ok: false, error: string }` objects
- Example from `src/lib/player-avatar.ts`:
  ```typescript
  export function validateAvatarFile(file: { type: string; size: number }) {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as ...)) {
      return { ok: false as const, error: "invalid_file_type" as AvatarValidationError };
    }
    return { ok: true as const };
  }
  ```

**API Route Error Handling:**
- Return `NextResponse.json({ ok: false, error: "message" }, { status: 4xx/5xx })`
- Use specific error codes as strings: `"cannot_deactivate_self"`, `"missing_default_payer"`, `"invalid_players"`
- Catch errors via `error instanceof Error ? error.message : "fallback_message"` pattern
- String-match Supabase errors to detect missing columns/migrations: `error.message.includes("column_name")`

**Null Returns:**
- Functions like `readAdminSessionValue()` return `null` for invalid input rather than throwing
- Helper functions return `null` for "not found" cases (e.g., `loadAdminUser`)

**Thrown Errors (rare):**
- Only throw for missing required environment variables: `throw new Error("Missing ADMIN_SESSION_SECRET")`
- Internal helpers throw coded errors caught by callers: `throw new Error("missing_default_payer")`

## Logging

**Framework:** No logging framework. Console is used sparingly.

**Patterns:**
- Apps Script bridge uses `Logger.log()` for Google Apps Script context
- No structured logging library in the Next.js app

## Comments

**When to Comment:**
- Comments are sparse - code is self-documenting through descriptive function names
- Inline comments used only for non-obvious logic (e.g., `// 1.00 split among 3 => 0.34, 0.33, 0.33`)
- No JSDoc/TSDoc used anywhere in the codebase

## Function Design

**Size:** Functions are small and focused. Most library functions are 5-30 lines.

**Parameters:** Use object parameters for functions with 3+ arguments:
```typescript
export function createAdminSessionValue(input: {
  uid: string | null;
  username: string;
  sessionVersion: number;
  isBreakglass: boolean;
  nowMs?: number;
}) { ... }
```

**Return Values:**
- Use `as const` assertions on return object literals for discriminated unions
- Use `satisfies TypeName` for type-safe returns in identity resolution: `return { ... } satisfies AdminIdentity`
- Always return typed response objects, never raw primitives for complex operations

## Module Design

**Exports:**
- Named exports only. No default exports for library modules.
- Default exports used only for React page/component files (`export default function SessionsPage`)
- Each lib module exports a focused set of related functions

**Barrel Files:**
- No barrel files (`index.ts`) used in the project
- Each module is imported directly by path

## React Component Patterns

**Client Components:**
- Marked with `"use client"` directive at top of file
- Page components are thin wrappers that delegate to client components (e.g., `src/app/sessions/page.tsx` renders `<SessionsClient />`)

**Props:**
- Use `type` for simple props objects, `interface` for complex v2 component props
- Optional props use `?` syntax with nullish coalescing in usage: `className ?? ""`

**State:**
- React `useState` for local state
- No global state management library

**Icons:**
- Phosphor Icons via `@phosphor-icons/react/dist/ssr`
- Wrapped through `src/components/icons.tsx` with a `withRegularIcon()` HOC that defaults weight to `"regular"`
- Re-exported with semantic names that may differ from Phosphor names (e.g., `ArrowUpDown` maps to `ArrowsDownUpIcon`)

## CSS / Styling

**Approach:** Tailwind CSS utility classes exclusively
- Dark mode via `class` strategy
- Custom color palette: `ink-50` through `ink-900` and `neon-400`/`neon-500`
- Custom fonts: Space Grotesk (sans) and Space Mono (mono) via CSS variables
- Framer Motion for animations in v2 components
- Global CSS in `src/app/globals-v2.css`

## API Route Conventions

**Pattern:** Next.js App Router with exported async functions (`POST`, `GET`)
- All admin API routes live under `src/app/api/admin/`
- Use `NextResponse.json()` for all responses
- Cast `request.json()` with `as` for typing: `const payload = (await request.json()) as { ... }`
- Admin routes resolve identity but do not use middleware (identity check is per-route)

## Supabase Client Pattern

**Admin Client:**
- Singleton pattern in `src/lib/supabase/admin.ts`
- Created with `createClient(url, serviceRoleKey, { auth: { persistSession: false } })`
- Accessed via `getSupabaseAdmin()` which caches the client

**Edge Functions:**
- Client-side calls go through `src/lib/edge.ts` which builds edge function URLs
- Uses `x-club-token` custom header for club-level auth
- Supabase anon key passed as both `Authorization: Bearer` and `apikey` headers

---

*Convention analysis: 2026-04-05*
