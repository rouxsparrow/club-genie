# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript ^5.7.2 - All application code (Next.js app, Supabase Edge Functions, tests)

**Secondary:**
- SQL (PostgreSQL) - Database migrations in `supabase/migrations/`
- JavaScript - Scripts in `scripts/`, config files (`postcss.config.cjs`, `eslint.config.mjs`)
- Shell (Bash) - Test scripts in `scripts/test-*.sh`

## Runtime

**Environment:**
- Node.js (no `.nvmrc` pinning detected)
- Deno - Supabase Edge Functions runtime (uses `Deno.serve()`, `Deno.env`, `https://esm.sh/` imports)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js ^16.1.6 - Full-stack React framework (App Router)
- React ^18.3.1 / React DOM ^18.3.1 - UI library
- Tailwind CSS ^3.4.19 - Utility-first CSS framework

**Testing:**
- Vitest ^4.0.18 - Test runner, config at `vitest.config.ts`
- Vite ^7.3.1 - Build tool for tests

**Build/Dev:**
- PostCSS ^8.4.47 with Autoprefixer ^10.4.19 - CSS processing (`postcss.config.cjs`)
- ESLint ^9.17.0 with typescript-eslint ^8.18.2 - Linting (`eslint.config.mjs`)
- Prettier ^3.4.2 - Code formatting

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.45.4 - Database client, auth, Edge Function invocation. Used in both Next.js (`src/lib/supabase/admin.ts`) and Edge Functions (`https://esm.sh/@supabase/supabase-js@2.45.4`)
- `next` ^16.1.6 - Application framework, API routes, server-side rendering

**UI:**
- `@phosphor-icons/react` ^2.1.10 - Icon library (replaced lucide-react)
- `framer-motion` ^12.34.3 - Animation library

**Infrastructure:**
- `supabase` ^2.76.12 (devDependency) - Supabase CLI for local development, migrations, Edge Function deployment

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2022, Module: ESNext, ModuleResolution: Bundler
- Strict mode enabled
- JSX: react-jsx
- Includes: `src/`, `tests/`, `vitest.config.ts`, `.next/types/`

**Tailwind:**
- Config: `tailwind.config.ts`
- Dark mode: class-based (`darkMode: ["class"]`)
- Content paths: `src/app/**/*.{ts,tsx}`, `src/components/**/*.{ts,tsx}`
- Custom fonts: Space Grotesk (sans), Space Mono (mono) via CSS variables
- Custom color palette: `ink` (blue-gray scale), `neon` (green accent)

**ESLint:**
- Config: `eslint.config.mjs`
- Flat config format (ESLint 9)
- Uses `@eslint/js` recommended + `typescript-eslint` recommended
- Custom rule: `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`
- Ignores: `.next/`, `node_modules/`, `postcss.config.cjs`, `scripts/`

**Next.js:**
- Config: `next.config.mjs`
- `reactStrictMode: true`
- Minimal experimental config (empty object)

**Vitest:**
- Config: `vitest.config.ts`
- Environment: `node`

**PostCSS:**
- Config: `postcss.config.cjs` (CommonJS)
- Plugins: tailwindcss, autoprefixer

**Environment:**
- `.env.example` present with all required variables documented
- Key env var groups: Gmail OAuth, Supabase, Splitwise, Admin, Automation

## Platform Requirements

**Development:**
- Node.js runtime for Next.js
- Deno runtime for Supabase Edge Functions (managed by Supabase CLI)
- Supabase CLI (`supabase` package) for local Supabase stack
- PostgreSQL (provided by local Supabase)

**Production:**
- Supabase hosted platform (PostgreSQL database + Edge Functions)
- Next.js hosting (Vercel or similar)
- Gmail API access (OAuth credentials)
- Splitwise API access (API key)
- Google Apps Script bridge endpoint

## NPM Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm test             # vitest run
npm run lint         # eslint .
npm run format       # prettier --write .
npm run typecheck    # tsc -p tsconfig.json --noEmit
```

---

*Stack analysis: 2026-04-05*
