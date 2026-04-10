# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
club-genie/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── layout.tsx          # Root layout (fonts, theme, shell)
│   │   ├── page.tsx            # Home page (landing)
│   │   ├── globals.css         # Legacy global styles
│   │   ├── globals-v2.css      # V2 design system styles
│   │   ├── access-denied/      # Access denied page
│   │   ├── denied/             # Token denied page
│   │   ├── sessions/           # Public sessions pages (token-gated)
│   │   ├── sessions-legacy/    # Legacy sessions view
│   │   ├── sessions-v2/        # V2 sessions view (transitional)
│   │   ├── admin/              # Admin dashboard pages
│   │   │   ├── page.tsx        # Main admin dashboard (2329 lines)
│   │   │   ├── login/          # Admin login page
│   │   │   └── gmail-config/   # Gmail configuration page
│   │   └── api/                # Next.js API routes
│   │       ├── admin-session/  # Admin session check endpoint
│   │       └── admin/          # All admin API routes
│   ├── components/             # Shared React components
│   │   ├── admin-accounts-panel.tsx
│   │   ├── admin-navbar.tsx
│   │   ├── icons.tsx           # Phosphor icon re-exports
│   │   ├── player-avatar-circle.tsx
│   │   ├── theme-toggle.tsx
│   │   └── v2/                 # V2 design system components
│   │       ├── AnimatedBackground.tsx
│   │       ├── Confetti.tsx
│   │       ├── PlayerSelectionDialog.tsx
│   │       ├── SessionCard.tsx
│   │       └── SkeletonCard.tsx
│   ├── lib/                    # Shared utilities and business logic
│   │   ├── supabase/
│   │   │   └── admin.ts        # Supabase admin client singleton
│   │   ├── edge.ts             # Edge Function client (public API calls)
│   │   ├── admin-session.ts    # Admin session cookie creation/verification
│   │   ├── admin-session-contract.ts  # Session payload types and constants
│   │   ├── admin-identity.ts   # Admin identity resolution from request
│   │   ├── admin-breakglass.ts # Emergency admin access via env vars
│   │   ├── admin-account-safety.ts
│   │   ├── admin-email-preview-rerun.ts
│   │   ├── apps-script-bridge.ts  # Gmail Apps Script HTTP bridge
│   │   ├── club-token-compat.ts   # Token migration compatibility
│   │   ├── crypto.ts           # Crypto utilities
│   │   ├── password-hash.ts    # Password hashing (bcrypt-like)
│   │   ├── player-avatar.ts    # Avatar URL construction
│   │   ├── ingestion-preview.ts   # Email ingestion preview types
│   │   ├── session-court-display.ts  # Court label/time formatting
│   │   ├── session-guests.ts      # Guest count normalization
│   │   ├── session-location.ts    # Location display formatting
│   │   ├── session-participation-submit.ts  # Participation diff/submit logic
│   │   ├── session-time.ts        # Time formatting utilities
│   │   ├── sessions-v2-view.ts    # Session grouping/filtering/sorting
│   │   ├── join-dialog-morph.ts   # Join dialog animation logic
│   │   └── open-badge-motion.ts   # Badge animation logic
│   ├── img/                    # Source image assets
│   └── types/                  # Shared TypeScript types (currently empty)
├── supabase/
│   ├── config.toml             # Supabase local dev config
│   ├── migrations/             # 14 SQL migration files
│   │   ├── 20260209075408_init_schema.sql
│   │   ├── ...
│   │   └── 20260327090000_splitwise_shuttlecock_multi_expense.sql
│   └── functions/              # 19 Deno Edge Functions
│       ├── _shared/            # Shared Edge Function utilities
│       │   ├── automation-auth.ts
│       │   ├── gmail-config.ts
│       │   ├── ingestion-utils.ts
│       │   ├── run-history.ts
│       │   └── splitwise-utils.ts
│       ├── validate-token/     # Club token validation
│       ├── list-sessions/      # List sessions for members
│       ├── get-session/        # Get session detail
│       ├── join-session/       # Join a session
│       ├── withdraw-session/   # Withdraw from session
│       ├── update-session-participation/  # Atomic join+guests update
│       ├── set-session-guests/ # Set guest count
│       ├── list-players/       # List active players
│       ├── close-session/      # Close a session
│       ├── rotate-token/       # Rotate club token
│       ├── list-receipt-errors/  # List email parse errors
│       ├── fetch-gmail-receipts/ # Fetch Gmail receipts
│       ├── ingest-receipts/    # Parse and ingest receipts
│       ├── run-ingestion/      # Full ingestion pipeline
│       ├── log-ingestion-run/  # Log ingestion run history
│       ├── run-splitwise-sync/ # Splitwise expense sync
│       ├── splitwise-ping/     # Splitwise API test
│       ├── splitwise-get-groups/  # List Splitwise groups
│       └── splitwise-get-group/   # Get Splitwise group detail
├── tests/                      # Vitest test files (23 test files)
├── scripts/                    # Utility scripts (seed SQL, test shell scripts)
├── docs/                       # Documentation and fixtures
│   └── ingestion/fixtures/     # Test fixtures for ingestion
├── public/
│   └── img/                    # Public image assets
├── .github/
│   ├── workflows/              # CI workflows
│   └── ISSUE_TEMPLATE/         # Issue templates
├── template/                   # Template files
├── package.json                # Node.js manifest
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind CSS config
├── postcss.config.cjs          # PostCSS config
├── next.config.mjs             # Next.js config
├── vitest.config.ts            # Vitest config
├── eslint.config.mjs           # ESLint config
├── .prettierrc                 # Prettier config
├── .editorconfig               # Editor config
├── SPEC.md                     # Project specification
├── DECISIONS.md                # Architecture decisions
├── TASKS.md                    # Task tracking
└── Agents.md                   # Agent instructions
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components (`.tsx`), route handlers (`route.ts`), global CSS
- Key files: `page.tsx` (home), `layout.tsx` (root layout), `globals-v2.css` (V2 styles)

**`src/app/api/admin/`:**
- Purpose: Admin-only server API routes
- Contains: 29 route handler files organized by resource
- Key patterns: Each `route.ts` exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)

**`src/components/`:**
- Purpose: Shared React components used across pages
- Contains: UI components, icon wrappers, V2 design system components
- Key files: `src/components/v2/SessionCard.tsx`, `src/components/v2/PlayerSelectionDialog.tsx`

**`src/lib/`:**
- Purpose: All shared business logic, utilities, and service clients
- Contains: Auth primitives, API clients, display formatters, data transformers
- Key files: `src/lib/edge.ts` (public API client), `src/lib/admin-identity.ts` (auth), `src/lib/supabase/admin.ts` (DB client)

**`supabase/functions/`:**
- Purpose: Deno-based Supabase Edge Functions (public backend)
- Contains: 19 function directories, each with `index.ts`; shared code in `_shared/`
- Key files: `supabase/functions/validate-token/index.ts`, `supabase/functions/_shared/splitwise-utils.ts`

**`supabase/migrations/`:**
- Purpose: PostgreSQL schema migrations
- Contains: 14 SQL files with timestamped naming
- Pattern: `YYYYMMDDHHMMSS_description.sql`

**`tests/`:**
- Purpose: Vitest unit tests
- Contains: 23 `.test.ts` files, co-named with their corresponding `src/lib/` modules
- Key files: `tests/admin-session.test.ts`, `tests/session-time.test.ts`

**`scripts/`:**
- Purpose: Development utilities and manual testing scripts
- Contains: Shell scripts for API testing (`test-*.sh`), SQL seed files, Gmail token scripts
- Key files: `scripts/seed-players.sql`, `scripts/seed-session.sql`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (dark theme, fonts)
- `src/app/page.tsx`: Home/landing page
- `src/app/sessions/sessions-client.tsx`: Main member-facing sessions UI (1050 lines)
- `src/app/admin/page.tsx`: Monolithic admin dashboard (2329 lines)

**Configuration:**
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `next.config.mjs`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `vitest.config.ts`: Test runner configuration
- `.prettierrc`: Code formatting rules
- `eslint.config.mjs`: Linting rules
- `supabase/config.toml`: Supabase local dev configuration

**Core Logic:**
- `src/lib/edge.ts`: All public-facing API calls (363 lines)
- `src/lib/admin-session.ts`: Session cookie management (101 lines)
- `src/lib/admin-identity.ts`: Admin auth resolution (79 lines)
- `src/lib/apps-script-bridge.ts`: Gmail ingestion bridge (48 lines)
- `src/lib/sessions-v2-view.ts`: Session data transformation and filtering

**Testing:**
- `tests/`: All test files (23 files)
- `vitest.config.ts`: Test configuration
- `docs/ingestion/fixtures/`: Test fixtures for email ingestion

## Naming Conventions

**Files:**
- `kebab-case.ts` for all TypeScript files in `src/lib/`: e.g., `admin-session.ts`, `session-time.ts`
- `kebab-case.tsx` for page components: e.g., `sessions-client.tsx`
- `PascalCase.tsx` for reusable components in `src/components/v2/`: e.g., `SessionCard.tsx`, `PlayerSelectionDialog.tsx`
- `kebab-case.tsx` for components in `src/components/`: e.g., `admin-navbar.tsx`, `player-avatar-circle.tsx`
- `route.ts` for all API route handlers (Next.js convention)
- `index.ts` for all Supabase Edge Functions

**Directories:**
- `kebab-case` for all directories: e.g., `admin-session`, `club-token`, `gmail-config`
- `[param]` for dynamic route segments: e.g., `[id]`, `[sessionId]`
- `_shared` for shared Edge Function utilities (underscore prefix = not deployed as function)
- `v2` for design system version 2 components

**Tests:**
- `{module-name}.test.ts` in `tests/` directory, mirroring `src/lib/` file names

## Where to Add New Code

**New API Route (Admin):**
- Create directory: `src/app/api/admin/{resource}/`
- Add `route.ts` with exported HTTP method handlers
- Use `resolveAdminIdentityFromRequest()` for auth (import from `src/lib/admin-identity.ts`)
- Use `getSupabaseAdmin()` for DB access (import from `src/lib/supabase/admin.ts`)

**New Edge Function (Public):**
- Create directory: `supabase/functions/{function-name}/`
- Add `index.ts` using `Deno.serve()` pattern
- Include club token validation (copy pattern from `supabase/functions/validate-token/index.ts`)
- Add client function to `src/lib/edge.ts`

**New Shared UI Component:**
- V2 design system: `src/components/v2/{PascalCase}.tsx`
- General: `src/components/{kebab-case}.tsx`

**New Library/Utility:**
- Add to `src/lib/{kebab-case}.ts`
- Add corresponding test: `tests/{kebab-case}.test.ts`

**New Database Migration:**
- Add to `supabase/migrations/{YYYYMMDDHHMMSS}_{description}.sql`
- Consider progressive column fallback in API routes if migration may not be applied immediately

**New Admin UI Tab/Section:**
- Add to `src/app/admin/page.tsx` (current monolith) or extract to a new component
- Add tab key to `TabKey` type union

## Special Directories

**`supabase/functions/_shared/`:**
- Purpose: Shared utilities imported by Edge Functions
- Generated: No
- Committed: Yes
- Note: Underscore prefix prevents Supabase from deploying it as a standalone function

**`.tmp_verify/` and `.tmp_verify2/`:**
- Purpose: Temporary verification directories (appear to be test scaffolding)
- Generated: Yes
- Committed: Yes (but should likely be gitignored)

**`docs/ingestion/fixtures/`:**
- Purpose: Test fixture data for email ingestion testing
- Generated: No
- Committed: Yes

**`public/img/`:**
- Purpose: Static image assets served by Next.js
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-05*
