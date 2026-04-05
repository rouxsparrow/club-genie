# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5.7 - All application code (frontend, API routes, Edge Functions, tests)

**Secondary:**
- SQL (PostgreSQL) - Database migrations in `supabase/migrations/`
- JavaScript - Legacy scripts in `scripts/` (Gmail OAuth helper, Apps Script bridge)

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version` file)
- Deno - Supabase Edge Functions runtime (`Deno.serve`, `Deno.env.get`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^16.1.6 - Full-stack React framework, App Router (`src/app/`)
- React ^18.3.1 - UI library
- React DOM ^18.3.1

**Styling:**
- Tailwind CSS ^3.4.19 - Utility-first CSS (`tailwind.config.ts`)
- PostCSS ^8.4.47 + Autoprefixer ^10.4.19 (`postcss.config.cjs`)

**Animation:**
- Framer Motion ^12.34.3 - UI animations

**Icons:**
- @phosphor-icons/react ^2.1.10

**Testing:**
- Vitest ^4.0.18 - Test runner (`vitest.config.ts`)
- Vite ^7.3.1 - Build tool for test environment

**Build/Dev:**
- Next.js built-in (`next dev`, `next build`)
- ESLint ^9.17.0 + typescript-eslint ^8.18.2 (`eslint.config.mjs`)
- Prettier ^3.4.2 (`.prettierrc`)
- TypeScript ^5.7.2 (`tsconfig.json`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.45.4 - Database client and Edge Function invocation
- `next` ^16.1.6 - Application framework
- `react` ^18.3.1 - UI rendering

**Infrastructure:**
- `supabase` ^2.76.12 (devDep) - Supabase CLI for local dev, migrations, Edge Function deployment

**No ORM** - All database access uses the Supabase JS client directly.

## Configuration

**TypeScript:**
- Target: ES2022
- Module: ESNext with Bundler resolution
- Strict mode enabled
- JSX: react-jsx
- Config: `tsconfig.json`

**ESLint:**
- Flat config format (`eslint.config.mjs`)
- `@eslint/js` recommended + `typescript-eslint` recommended
- Ignores: `.next/`, `node_modules/`, `postcss.config.cjs`, `scripts/`
- Key rule: `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`

**Prettier:**
- Single quotes, semicolons, trailing commas (all)
- Print width: 100
- Config: `.prettierrc`
- Ignore: `.prettierignore`

**Tailwind:**
- Dark mode: class-based
- Custom color palette: `ink` (blue-gray scale), `neon` (green accent)
- Custom fonts: Space Grotesk (sans), Space Mono (mono) via CSS variables
- Content paths: `src/app/**`, `src/components/**`
- Config: `tailwind.config.ts`

**Next.js:**
- React strict mode enabled
- Minimal config (`next.config.mjs`)
- ESM modules (`"type": "module"` in `package.json`)

**Environment:**
- `.env.example` documents required variables
- `.env.local` present (gitignored)
- Public vars prefixed with `NEXT_PUBLIC_`

**Build Scripts (from `package.json`):**
```bash
npm run dev          # next dev
npm run build        # next build
npm test             # vitest run
npm run lint         # eslint .
npm run format       # prettier --write .
npm run typecheck    # tsc -p tsconfig.json --noEmit
```

## Platform Requirements

**Development:**
- Node.js (ES2022 target)
- Supabase CLI (for Edge Functions and migrations)
- Deno (for local Edge Function testing)

**Production:**
- Next.js hosting (deployment target not specified in config; likely Vercel or similar)
- Supabase hosted instance (Edge Functions + PostgreSQL)

**CI/CD:**
- GitHub Actions (`.github/workflows/`)
- Two workflow files: `run-ingestion.yml`, `run-splitwise-sync.yml`
- Splitwise sync runs on cron: daily at 14:00 UTC
- Ingestion triggered manually (workflow_dispatch) or via Apps Script bridge

---

*Stack analysis: 2026-04-05*
