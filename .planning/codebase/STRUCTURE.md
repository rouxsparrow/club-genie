# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
club-genie/
├── src/                        # Next.js application source
│   ├── app/                    # App Router pages and API routes
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   ├── globals.css         # Base styles
│   │   ├── globals-v2.css      # V2 design system styles
│   │   ├── admin/              # Admin pages
│   │   │   ├── page.tsx        # Admin dashboard (tabbed)
│   │   │   ├── login/          # Admin login page
│   │   │   └── gmail-config/   # Gmail configuration page
│   │   ├── sessions/           # Player-facing session views
│   │   │   ├── page.tsx        # Sessions list
│   │   │   ├── sessions-client.tsx  # Main sessions client component
│   │   │   └── [id]/           # Session detail view
│   │   ├── sessions-legacy/    # Legacy session view (dev only)
│   │   ├── sessions-v2/        # V2 session layout (alternate)
│   │   ├── api/                # Next.js API routes
│   │   │   ├── admin-session/  # Admin session check endpoint
│   │   │   └── admin/          # Admin API endpoints
│   │   ├── denied/             # Access denied page
│   │   └── access-denied/      # Alternate access denied page
│   ├── components/             # React components
│   │   ├── v2/                 # V2 design system components
│   │   ├── icons.tsx           # Phosphor icon re-exports
│   │   ├── admin-navbar.tsx    # Admin navigation bar
│   │   ├── admin-accounts-panel.tsx  # Admin accounts management
│   │   ├── player-avatar-circle.tsx  # Player avatar display
│   │   └── theme-toggle.tsx    # Theme toggle button
│   ├── lib/                    # Shared utilities and business logic
│   │   ├── edge.ts             # Client SDK for Edge Functions
│   │   ├── supabase/           # Supabase client setup
│   │   │   └── admin.ts        # Service-role Supabase client
│   │   ├── admin-session.ts    # Admin session (Node.js crypto)
│   │   ├── admin-session-edge.ts    # Admin session (Web Crypto API)
│   │   ├── admin-session-contract.ts # Session payload types/constants
│   │   ├── admin-identity.ts   # Admin identity resolution
│   │   ├── admin-breakglass.ts # Emergency admin access
│   │   ├── admin-account-safety.ts  # Account safety checks
│   │   ├── admin-email-preview-rerun.ts # Email preview rerun logic
│   │   ├── apps-script-bridge.ts    # Google Apps Script bridge
│   │   ├── crypto.ts           # Crypto utilities
│   │   ├── password-hash.ts    # Password hashing (bcrypt-like)
│   │   ├── club-token-compat.ts     # Club token compatibility
│   │   ├── ingestion-preview.ts     # Ingestion preview logic
│   │   ├── session-*.ts        # Session-related utilities
│   │   ├── sessions-v2-view.ts # V2 view model helpers
│   │   ├── join-dialog-morph.ts     # Join dialog animation
│   │   ├── open-badge-motion.ts     # Badge animation
│   │   └── player-avatar.ts    # Player avatar utilities
│   ├── types/                  # Shared type definitions (currently empty)
│   ├── middleware.ts           # Next.js middleware (admin auth)
│   └── index.ts                # Placeholder export
├── supabase/                   # Supabase project
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── _shared/            # Shared Edge Function utilities
│   │   │   ├── automation-auth.ts   # Automation secret validation
│   │   │   ├── gmail-config.ts      # Gmail OAuth config resolution
│   │   │   ├── ingestion-utils.ts   # Ingestion helpers
│   │   │   ├── run-history.ts       # Run history tracking
│   │   │   └── splitwise-utils.ts   # Splitwise API helpers
│   │   ├── list-sessions/      # List all sessions
│   │   ├── get-session/        # Get session detail
│   │   ├── join-session/       # Join a session
│   │   ├── withdraw-session/   # Withdraw from session
│   │   ├── set-session-guests/ # Set guest count
│   │   ├── update-session-participation/ # Atomic participation update
│   │   ├── close-session/      # Close a session
│   │   ├── list-players/       # List all players
│   │   ├── validate-token/     # Validate club token
│   │   ├── rotate-token/       # Rotate club token
│   │   ├── run-ingestion/      # Run Gmail ingestion pipeline
│   │   ├── ingest-receipts/    # Parse and ingest a single receipt
│   │   ├── fetch-gmail-receipts/ # Fetch Gmail receipts
│   │   ├── log-ingestion-run/  # Log ingestion run
│   │   ├── list-receipt-errors/ # List receipt parse errors
│   │   ├── run-splitwise-sync/ # Run Splitwise sync
│   │   ├── splitwise-ping/     # Test Splitwise connectivity
│   │   ├── splitwise-get-group/  # Get Splitwise group details
│   │   └── splitwise-get-groups/ # List Splitwise groups
│   └── migrations/             # PostgreSQL schema migrations
├── tests/                      # Vitest unit tests
├── scripts/                    # Development/testing scripts
│   ├── *.sh                    # Curl-based Edge Function test scripts
│   ├── *.js                    # Node.js utility scripts
│   ├── *.sql                   # Seed data scripts
│   └── *.md                    # Seed data documentation
├── docs/                       # Documentation
│   └── ingestion/              # Ingestion docs and fixtures
├── public/                     # Static assets
│   └── img/                    # Public images
├── template/                   # Template files
├── .github/                    # GitHub config
│   ├── workflows/              # CI/CD workflows
│   └── ISSUE_TEMPLATE/         # Issue templates
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind CSS config
├── postcss.config.cjs          # PostCSS config
├── next.config.mjs             # Next.js config
├── vitest.config.ts            # Vitest config
├── eslint.config.mjs           # ESLint config
├── .prettierrc                 # Prettier config
├── .editorconfig               # Editor config
├── SPEC.md                     # Project specification
├── TASKS.md                    # Task tracking
└── DECISIONS.md                # Decision log
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components (`page.tsx`), layouts (`layout.tsx`), client components (`*-client.tsx`), API route handlers (`route.ts`)
- Key files: `src/app/layout.tsx` (root layout), `src/app/page.tsx` (landing), `src/app/sessions/sessions-client.tsx` (main player UI)

**`src/app/api/admin/`:**
- Purpose: Admin-only API endpoints, protected by middleware
- Contains: RESTful route handlers for sessions, players, accounts, ingestion, Splitwise, automation settings, club token management
- Key files: `src/app/api/admin/login/route.ts`, `src/app/api/admin/sessions/route.ts`, `src/app/api/admin/splitwise/run/route.ts`

**`src/components/`:**
- Purpose: Reusable React components
- Contains: UI components, icon definitions
- Key files: `src/components/icons.tsx` (Phosphor icon re-exports), `src/components/v2/SessionCard.tsx`, `src/components/v2/PlayerSelectionDialog.tsx`

**`src/components/v2/`:**
- Purpose: V2 design system components with animations
- Contains: `AnimatedBackground.tsx`, `Confetti.tsx`, `PlayerSelectionDialog.tsx`, `SessionCard.tsx`, `SkeletonCard.tsx`, `ThemeSwitcher.tsx`

**`src/lib/`:**
- Purpose: Business logic, utilities, and client SDKs
- Contains: Pure functions, fetch wrappers, auth helpers
- Key files: `src/lib/edge.ts` (Edge Function client), `src/lib/admin-session.ts` (session management), `src/lib/supabase/admin.ts` (DB client)

**`supabase/functions/`:**
- Purpose: Supabase Edge Functions (Deno runtime)
- Contains: One directory per function, each with `index.ts` using `Deno.serve()`
- Key files: `supabase/functions/list-sessions/index.ts`, `supabase/functions/run-ingestion/index.ts`, `supabase/functions/run-splitwise-sync/index.ts`

**`supabase/functions/_shared/`:**
- Purpose: Shared utilities imported by Edge Functions
- Contains: Auth, config, and business logic helpers
- Key files: `supabase/functions/_shared/splitwise-utils.ts`, `supabase/functions/_shared/ingestion-utils.ts`

**`supabase/migrations/`:**
- Purpose: PostgreSQL schema migrations (ordered by timestamp)
- Contains: SQL files defining tables, types, indexes, RLS policies
- Key files: `20260209075408_init_schema.sql` (base schema), `20260216132000_admin_accounts.sql`, `20260327090000_splitwise_shuttlecock_multi_expense.sql` (latest)

**`tests/`:**
- Purpose: Vitest unit tests for `src/lib/` modules
- Contains: Test files named `{module}.test.ts` matching `src/lib/{module}.ts`
- Key files: `tests/admin-session.test.ts`, `tests/splitwise-utils.test.ts`, `tests/session-participation-submit.test.ts`

**`scripts/`:**
- Purpose: Development scripts for testing Edge Functions and seeding data
- Contains: Shell scripts (`test-*.sh`) for curl-based testing, SQL seeds, JS utilities
- Key files: `scripts/seed-players.sql`, `scripts/seed-session.sql`, `scripts/get-gmail-refresh-token.js`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML layout, font loading, theme script
- `src/app/page.tsx`: Landing page with links to sessions and admin
- `src/middleware.ts`: Admin route protection (cookie validation)

**Configuration:**
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Tailwind CSS with custom theme
- `next.config.mjs`: Next.js configuration (minimal)
- `vitest.config.ts`: Test runner configuration
- `.env.example`: Required environment variables template

**Core Logic:**
- `src/lib/edge.ts`: Client-side Edge Function SDK (all player-facing API calls)
- `src/lib/admin-session.ts`: Admin session creation/validation (Node.js)
- `src/lib/admin-session-edge.ts`: Admin session validation (Edge/middleware)
- `src/lib/admin-identity.ts`: Admin identity resolution from request
- `src/lib/apps-script-bridge.ts`: Google Apps Script integration
- `supabase/functions/_shared/splitwise-utils.ts`: Splitwise expense calculation

**Testing:**
- `tests/*.test.ts`: Unit tests for lib modules
- `scripts/test-*.sh`: Manual integration test scripts

## Naming Conventions

**Files:**
- `kebab-case.ts` / `kebab-case.tsx`: All source files in `src/lib/` and `src/app/`
- `PascalCase.tsx`: V2 components in `src/components/v2/`
- `route.ts`: Next.js API route handlers
- `page.tsx`: Next.js page components
- `layout.tsx`: Next.js layout components
- `*-client.tsx`: Client components (marked with `"use client"`)
- `index.ts`: Edge Function entry points

**Directories:**
- `kebab-case/`: All directories
- `[param]/`: Dynamic route segments in Next.js

## Where to Add New Code

**New Page:**
- Create `src/app/{route-name}/page.tsx` for server component
- Create `src/app/{route-name}/{route-name}-client.tsx` for client interactivity
- Import `../globals-v2.css` for V2 styling

**New Admin API Endpoint:**
- Create `src/app/api/admin/{resource}/route.ts`
- Middleware auto-protects routes under `/api/admin/` (no manual auth needed in handler)
- Use `getSupabaseAdmin()` from `src/lib/supabase/admin.ts` for DB access
- Use `resolveAdminIdentityFromRequest()` from `src/lib/admin-identity.ts` if you need the admin user info

**New Edge Function:**
- Create `supabase/functions/{function-name}/index.ts`
- Use `Deno.serve()` pattern with CORS headers
- Import shared utils from `../_shared/` using `.ts` extension
- Import Supabase client from `https://esm.sh/@supabase/supabase-js@2.45.4`
- Validate club token or automation secret at the top of the handler
- Add corresponding client wrapper in `src/lib/edge.ts`

**New Component:**
- V2 components: `src/components/v2/PascalCase.tsx`
- General components: `src/components/kebab-case.tsx`
- Mark as `"use client"` if using hooks, event handlers, or browser APIs

**New Lib Module:**
- Create `src/lib/{feature-name}.ts`
- Export pure functions; avoid side effects at module level
- Add corresponding test as `tests/{feature-name}.test.ts`

**New Database Migration:**
- Create `supabase/migrations/{YYYYMMDDHHMMSS}_{description}.sql`
- Follow existing naming pattern (e.g., `20260327090000_splitwise_shuttlecock_multi_expense.sql`)

**Utilities:**
- Shared helpers go in `src/lib/`
- Edge Function shared helpers go in `supabase/functions/_shared/`

## Special Directories

**`supabase/functions/_shared/`:**
- Purpose: Shared code imported by Edge Functions via relative path with `.ts` extension
- Generated: No
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Database schema evolution (14 migrations)
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`dist/`:**
- Purpose: Build output directory
- Generated: Yes
- Committed: No (should be in .gitignore)

**`.tmp_verify/` and `.tmp_verify2/`:**
- Purpose: Temporary verification directories (appear to be leftovers)
- Generated: Yes
- Committed: Should not be

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes (by tooling)
- Committed: Yes

---

*Structure analysis: 2026-04-05*
