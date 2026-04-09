# Phase 03: Shell Reduction - Research

**Researched:** 2026-04-09 [VERIFIED: system date]  
**Domain:** Next.js App Router admin-shell composition cleanup [VERIFIED: ROADMAP.md, src/app/admin/page.tsx]  
**Confidence:** HIGH [VERIFIED: codebase grep, planning docs, npm registry]

<user_constraints>
## User Constraints

- No phase-specific `03-CONTEXT.md` exists yet, so there are no locked discuss-phase decisions to copy verbatim. [VERIFIED: phase directory listing]
- This phase is a parity-preserving shell cleanup, not an admin redesign phase. [VERIFIED: user prompt]
- Phase 4 is reserved for admin redesign work, so Phase 3 should not change visual direction, information architecture, or tab behavior beyond shell reduction. [VERIFIED: user prompt, ROADMAP.md]
- The phase must address `SHELL-01` and `PARITY-07`. [VERIFIED: user prompt, REQUIREMENTS.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Admin `page.tsx` reduced to a thin composition shell (tab routing + component mounting). [VERIFIED: REQUIREMENTS.md] | Use a data-driven tab registry plus shared tab-button/panel rendering helpers so `page.tsx` stops repeating per-tab JSX blocks. [VERIFIED: src/app/admin/page.tsx, ROADMAP.md] |
| PARITY-07 | Tab navigation and URL state preserved. [VERIFIED: REQUIREMENTS.md] | Preserve the current `activeTab` local state model and do not introduce new URL/search-param sync in Phase 3 because the current admin shell has no tab URL state to preserve. [VERIFIED: src/app/admin/page.tsx, codebase grep] |
</phase_requirements>

## Summary

Phase 2 already finished the hard part: every admin tab lives in its own component, and the parent page now owns only shell concerns (`activeTab`, `mounted`, eager mount rules, and visited-tab persistence). [VERIFIED: 02-VERIFICATION.md, src/app/admin/page.tsx] The remaining Phase 3 problem is mostly duplication: six nearly identical tab buttons and six nearly identical keep-mounted panel wrappers keep the file at 171 lines, which misses the roadmap target of under 150 lines. [VERIFIED: src/app/admin/page.tsx, `wc -l`, ROADMAP.md]

The safest plan is to keep the existing behavior model exactly as-is and extract only the repeated shell structure. [VERIFIED: src/app/admin/page.tsx, 02-tab-extraction summaries] In practice that means: keep `activeTab` and `visitedTabs`, keep the current eager-mounted set (`players`, `club`, `automation`, `splitwise`), keep the hidden keep-mounted panel strategy, and replace handwritten button/panel duplication with a single tab-definition array plus a shared renderer. [VERIFIED: src/app/admin/page.tsx] This is enough to satisfy `SHELL-01` while minimizing parity risk for `PARITY-07`. [VERIFIED: REQUIREMENTS.md, ROADMAP.md]

**Primary recommendation:** Keep the current shell semantics, but move tab metadata and repeated button/panel rendering into `src/components/admin/` helpers so [`page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx) becomes a thin route wrapper under 150 lines. [VERIFIED: src/app/admin/page.tsx, ROADMAP.md]

## Project Constraints (from AGENTS.md)

- Prefer small, focused edits over sweeping refactors. [VERIFIED: AGENTS.md]
- Avoid reformatting unrelated files. [VERIFIED: AGENTS.md]
- Any functional change requires a test or an explicit test rationale in `TASKS.md`. [VERIFIED: AGENTS.md]
- Keep admin work in `src/` and automated proof in `tests/`. [VERIFIED: AGENTS.md]
- If behavior or scope changes, update `SPEC.md`; if architecture changes, add an ADR in `DECISIONS.md`. [VERIFIED: AGENTS.md]
- Use inline variables for local testing rather than editing env files. [VERIFIED: AGENTS.md]

## Standard Stack

### Core

| Library | Project Version | Latest Version | Purpose | Why Standard |
|---------|-----------------|----------------|---------|--------------|
| Next.js | `16.1.6` in this repo. [VERIFIED: package.json] | `16.2.3` published 2026-04-08. [VERIFIED: npm registry] | App Router page entry for `/admin`. [VERIFIED: src/app/admin/page.tsx] | The route already ships as a client page under `src/app/admin/page.tsx`; Phase 3 should stay inside that stack and avoid framework churn. [VERIFIED: src/app/admin/page.tsx, DECISIONS.md] |
| React | `18.3.1` in this repo. [VERIFIED: package.json] | `19.2.5` published 2026-04-08. [VERIFIED: npm registry] | Local shell state with `useState` and lifecycle sync with `useEffect`. [VERIFIED: src/app/admin/page.tsx] | The current admin shell already depends only on basic React primitives, so no extra state library is justified for this phase. [VERIFIED: src/app/admin/page.tsx, REQUIREMENTS.md] |
| TypeScript | `5.7.2` in this repo. [VERIFIED: package.json] | `6.0.2` published 2026-03-23. [VERIFIED: npm registry] | Typed tab keys and config safety. [VERIFIED: src/components/admin/types.ts] | The `TabKey` union is already the correct guardrail for shell refactors because it keeps config arrays and state maps aligned. [VERIFIED: src/components/admin/types.ts] |

### Supporting

| Library | Project Version | Latest Version | Purpose | When to Use |
|---------|-----------------|----------------|---------|-------------|
| Vitest | `4.0.18` in this repo. [VERIFIED: package.json] | `4.1.4` published 2026-04-09. [VERIFIED: npm registry] | Source-level regression tests for shell structure. [VERIFIED: tests/admin-tab-extraction.test.ts] | Use it for file-level and string-level assertions because the repo test environment is `node`, not a browser DOM harness. [VERIFIED: vitest.config.ts] |
| ESLint | `9.17.0` in this repo. [VERIFIED: package.json] | `10.2.0` published 2026-04-03. [VERIFIED: npm registry] | Guard against unused shell helpers and stale imports. [VERIFIED: eslint.config.mjs] | Run after extraction because Phase 2 already hit an unused-import issue during shell cleanup work. [VERIFIED: 02-tab-extraction-03-SUMMARY.md, eslint.config.mjs] |
| Tailwind CSS | `3.4.19` in this repo. [VERIFIED: package.json] | `4.2.2` published 2026-03-18. [VERIFIED: npm registry] | Existing admin styling classes. [VERIFIED: src/app/admin/page.tsx, tailwind.config.ts] | Reuse current classes only; this phase should not introduce styling changes beyond moving repeated button markup behind helpers. [VERIFIED: user prompt, ROADMAP.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Keep the shell in one file but make it data-driven. [VERIFIED: src/app/admin/page.tsx] | Introduce a new router/search-param tab state model. [ASSUMED] | New URL sync would add behavior that does not exist today, increasing `PARITY-07` risk for no Phase 3 benefit. [VERIFIED: src/app/admin/page.tsx, REQUIREMENTS.md] |
| Local `useState` shell state. [VERIFIED: src/app/admin/page.tsx] | Zustand/Redux/context-based tab state. [ASSUMED] | A state library conflicts with the project’s “no state management library” scope and would be disproportionate for six tab keys. [VERIFIED: STATE.md, REQUIREMENTS.md] |
| Shared config + mapped render loop. [VERIFIED: src/app/admin/page.tsx, src/components/admin/types.ts] | Handwritten per-tab button and panel blocks. [VERIFIED: src/app/admin/page.tsx] | Handwritten duplication is the direct reason the file is still 171 lines. [VERIFIED: `wc -l`, src/app/admin/page.tsx] |

**Installation:** No new packages are recommended for Phase 3. [VERIFIED: package.json, REQUIREMENTS.md]

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── app/admin/page.tsx                  # Thin route entry only
├── components/admin/admin-tab-config.tsx   # Tab metadata + component references
├── components/admin/admin-tab-nav.tsx      # Shared tab button renderer
└── components/admin/admin-tab-panels.tsx   # Shared keep-mounted panel renderer
```

The exact filenames can vary, but the pattern should move repeated shell-only code out of the route file and keep business logic inside the existing tab components. [VERIFIED: src/app/admin/page.tsx, src/components/admin/*.tsx]

### Pattern 1: Data-Driven Tab Registry

**What:** Represent each tab once as metadata: `key`, `label`, `component`, and whether it is eagerly mounted. [VERIFIED: src/app/admin/page.tsx, src/components/admin/types.ts]  
**When to use:** Use it here because every current tab button and panel block differs only by key, label, and component. [VERIFIED: src/app/admin/page.tsx]  
**Example:**

```tsx
// Source: current admin shell shape in src/app/admin/page.tsx + TabKey in src/components/admin/types.ts
import type { ComponentType } from "react";
import type { TabKey } from "./types";
import AccountsTab from "./accounts-tab";
import AutomationTab from "./automation-tab";
import ClubAccessTab from "./club-access-tab";
import EmailsTab from "./emails-tab";
import PlayersTab from "./players-tab";
import SplitwiseTab from "./splitwise-tab";

type AdminTabDefinition = {
  key: TabKey;
  label: string;
  eager: boolean;
  Component: ComponentType;
};

export const ADMIN_TABS: AdminTabDefinition[] = [
  { key: "accounts", label: "Accounts", eager: false, Component: AccountsTab },
  { key: "players", label: "Players", eager: true, Component: PlayersTab },
  { key: "club", label: "Club Access", eager: true, Component: ClubAccessTab },
  { key: "automation", label: "Automation", eager: true, Component: AutomationTab },
  { key: "emails", label: "Email Preview", eager: false, Component: EmailsTab },
  { key: "splitwise", label: "Splitwise", eager: true, Component: SplitwiseTab }
];
```

### Pattern 2: Shared Keep-Mounted Panel Renderer

**What:** Compute `isMounted` once per tab and render panels from the same definition array. [VERIFIED: src/app/admin/page.tsx]  
**When to use:** Use it because Phase 2 explicitly established the “visited tabs stay mounted while hidden” pattern to preserve drafts and local state. [VERIFIED: 02-tab-extraction-01-SUMMARY.md, 02-tab-extraction-02-SUMMARY.md, 02-tab-extraction-03-SUMMARY.md]  
**Example:**

```tsx
// Source: current keep-mounted shell pattern in src/app/admin/page.tsx
{ADMIN_TABS.map(({ key, Component }) => {
  const isMounted = eagerTabs.has(key) || visitedTabs[key];
  if (!isMounted) return null;

  return (
    <div key={key} hidden={activeTab !== key} aria-hidden={activeTab !== key}>
      <Component />
    </div>
  );
})}
```

### Anti-Patterns to Avoid

- **Replacing keep-mounted panels with `activeTab === key ? <Component /> : null`:** That would remount tabs on every switch and risks losing Accounts drafts, Email rerun state, and other tab-local UI state that Phase 2 intentionally preserved. [VERIFIED: 02-tab-extraction summaries, src/app/admin/page.tsx]
- **Adding tab URL/search-param sync in Phase 3:** The current admin page has no tab query-string behavior, so introducing it would be a new feature, not parity work. [VERIFIED: src/app/admin/page.tsx, codebase grep]
- **Bundling visual cleanup with shell cleanup:** The roadmap and user prompt reserve redesign work for Phase 4. [VERIFIED: ROADMAP.md, user prompt]
- **Pulling tab state back into the parent page:** Phase 2’s core value is tab independence, and the verification report explicitly checks that page-level state is limited to shell concerns. [VERIFIED: STATE.md, 02-VERIFICATION.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab registry | Six separate button blocks and six separate panel blocks. [VERIFIED: src/app/admin/page.tsx] | A typed `ADMIN_TABS` definition array. [VERIFIED: src/components/admin/types.ts, src/app/admin/page.tsx] | The config array removes duplication while preserving the current shell semantics. [VERIFIED: src/app/admin/page.tsx] |
| Tab-state persistence | A new global store or localStorage persistence layer. [ASSUMED] | The current `visitedTabs` record plus eager-mounted set. [VERIFIED: src/app/admin/page.tsx] | The existing approach already preserves hidden-tab state without expanding scope. [VERIFIED: 02-tab-extraction summaries] |
| URL parity | Custom query-param routing for tab state. [ASSUMED] | Preserve the current no-URL local-state model. [VERIFIED: src/app/admin/page.tsx, codebase grep] | `PARITY-07` is about preservation, and there is no current admin tab URL state to migrate. [VERIFIED: REQUIREMENTS.md, src/app/admin/page.tsx] |

**Key insight:** Phase 3 is not blocked by missing infrastructure; it is blocked by repeated shell markup. [VERIFIED: src/app/admin/page.tsx, `wc -l`] The correct move is to compress duplication, not to invent new shell behavior. [VERIFIED: ROADMAP.md, user prompt]

## Runtime State Inventory

This phase is a refactor, but it does not rename persisted identifiers or move runtime ownership outside the client shell. [VERIFIED: ROADMAP.md, src/app/admin/page.tsx]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None found; Phase 3 only changes client shell composition and the current admin tab key model is local TypeScript state, not a database key. [VERIFIED: src/app/admin/page.tsx, src/components/admin/types.ts] | None. [VERIFIED: codebase audit] |
| Live service config | None found; there is no external service or dashboard config tied to the admin shell structure in the phase scope. [VERIFIED: ROADMAP.md, codebase grep] | None. [VERIFIED: codebase audit] |
| OS-registered state | None found; the admin shell is delivered through the Next.js app and this phase does not touch OS-level registrations. [VERIFIED: DECISIONS.md, codebase scope] | None. [VERIFIED: codebase audit] |
| Secrets/env vars | None found; the shell cleanup does not change env contracts or admin auth secrets. [VERIFIED: AGENTS.md, src/middleware.ts, package.json] | None. [VERIFIED: codebase audit] |
| Build artifacts | No special artifact migration is required; normal Next.js rebuild output is sufficient after code changes. [VERIFIED: package.json scripts, codebase scope] | Re-run normal validation commands only. [VERIFIED: package.json] |

## Common Pitfalls

### Pitfall 1: Dropping Keep-Mounted Parity

**What goes wrong:** Hidden tabs remount after every click, and local drafts or transient UI state disappear. [VERIFIED: 02-tab-extraction summaries]  
**Why it happens:** A cleanup replaces `visitedTabs`/eager rules with plain active-tab conditional rendering. [VERIFIED: src/app/admin/page.tsx]  
**How to avoid:** Preserve the current eager set and visited-tab record even if the rendering code becomes config-driven. [VERIFIED: src/app/admin/page.tsx]  
**Warning signs:** Accounts form drafts reset, Email Preview rerun chips disappear, or Splitwise/Automation tabs reload more often than before. [VERIFIED: 02-tab-extraction summaries]

### Pitfall 2: Changing Initial Preload Behavior

**What goes wrong:** Tabs that currently mount on first load stop preloading, which can alter perceived latency and side effects. [VERIFIED: 02-tab-extraction-02-SUMMARY.md, 02-tab-extraction-03-SUMMARY.md]  
**Why it happens:** The eager-mounted set is converted incorrectly during abstraction. [VERIFIED: src/app/admin/page.tsx]  
**How to avoid:** Encode eager mount as metadata in the tab registry and test the exact current set: `players`, `club`, `automation`, `splitwise`. [VERIFIED: src/app/admin/page.tsx]  
**Warning signs:** New shell helpers omit one of the currently eager tabs or initialize `visitedTabs` differently. [VERIFIED: src/app/admin/page.tsx]

### Pitfall 3: Over-Solving URL State

**What goes wrong:** The shell gains query-string or router behavior that did not exist before, creating unplanned parity questions. [VERIFIED: src/app/admin/page.tsx, codebase grep]  
**Why it happens:** `PARITY-07` is read as “add URL state” instead of “preserve existing navigation semantics.” [VERIFIED: REQUIREMENTS.md, src/app/admin/page.tsx]  
**How to avoid:** Treat current local `activeTab` state as the behavior baseline unless a future discuss phase explicitly locks URL-based tabs. [VERIFIED: src/app/admin/page.tsx]  
**Warning signs:** New uses of `useSearchParams`, `router.replace`, or custom query parsing appear in `/admin`. [VERIFIED: codebase grep]

## Code Examples

Verified patterns from the current repo:

### Current Shell State Boundary

```tsx
// Source: /Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx
const [activeTab, setActiveTab] = useState<TabKey>("players");
const [mounted, setMounted] = useState(false);
const eagerMountedTabs: TabKey[] = ["players", "club", "automation", "splitwise"];
const [visitedTabs, setVisitedTabs] = useState<Record<TabKey, boolean>>({
  accounts: false,
  players: true,
  club: false,
  automation: false,
  emails: false,
  splitwise: true,
});
```

### Recommended Button Mapping

```tsx
// Source: recommended compression of current repeated button blocks in src/app/admin/page.tsx
{ADMIN_TABS.map(({ key, label }) => (
  <button
    key={key}
    type="button"
    onClick={() => setActiveTab(key)}
    className={`rounded-full px-4 py-2 text-sm font-semibold ${
      activeTab === key
        ? "bg-emerald-500 text-slate-900"
        : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
    }`}
  >
    {label}
  </button>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic admin page with parent-owned business logic. [VERIFIED: 88b9099 pre-extraction history, 02-VERIFICATION.md] | Independent tab components with page-level shell state only. [VERIFIED: 02-VERIFICATION.md, src/components/admin/*.tsx, src/app/admin/page.tsx] | Phase 02 on 2026-04-09. [VERIFIED: STATE.md, 02-tab-extraction summaries] | Phase 3 can now focus purely on shell duplication instead of business-logic extraction. [VERIFIED: 02-VERIFICATION.md] |
| Handwritten per-tab shell blocks. [VERIFIED: src/app/admin/page.tsx] | Data-driven tab registry plus mapped buttons/panels. [ASSUMED] | Recommended for Phase 03. [VERIFIED: ROADMAP.md, src/app/admin/page.tsx] | Lowest-risk path to the `<150` line target. [VERIFIED: ROADMAP.md, `wc -l`] |

**Deprecated/outdated:**

- Keeping large repeated shell JSX in the route file is now outdated for this phase because it leaves the page at 171 lines and makes future shell-only tweaks error-prone. [VERIFIED: src/app/admin/page.tsx, `wc -l`, ROADMAP.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A new URL/search-param tab model is unnecessary for Phase 3. [ASSUMED] | Standard Stack / Pitfalls | Low; if the team actually wants URL-addressable admin tabs, that should be discussed and locked before planning because it expands scope beyond parity cleanup. |
| A2 | A global state library would not be accepted for this phase. [ASSUMED] | Alternatives / Don't Hand-Roll | Low; current docs strongly point away from it, but explicit user confirmation would remove any ambiguity. |

## Open Questions

1. **Should `page.tsx` stay as the only client component, or should it become a thin route wrapper around an extracted `AdminShell` component?**
   - What we know: Either approach can preserve behavior, as long as the current shell state model remains unchanged. [VERIFIED: src/app/admin/page.tsx]
   - What's unclear: The roadmap constrains line count on `page.tsx`, but it does not mandate whether the extracted shell helpers live in one file or several. [VERIFIED: ROADMAP.md]
   - Recommendation: Let the plan choose the smallest diff that gets [`page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx) under 150 lines without moving business logic back into the route. [VERIFIED: ROADMAP.md, src/app/admin/page.tsx]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes. [VERIFIED: src/middleware.ts] | `/admin` and `/api/admin/*` are protected by `admin_session` cookie checks and redirect to `/admin/login` when missing/invalid. [VERIFIED: src/middleware.ts] |
| V3 Session Management | yes. [VERIFIED: src/middleware.ts] | Middleware validates cookie payload plus `session_version` and active status before allowing admin routes. [VERIFIED: src/middleware.ts] |
| V4 Access Control | yes. [VERIFIED: src/middleware.ts] | Keep Phase 3 changes inside the authenticated admin shell and avoid bypass paths or client-side auth assumptions. [VERIFIED: src/middleware.ts, src/app/admin/page.tsx] |
| V5 Input Validation | yes, but minimal. [VERIFIED: src/components/admin/types.ts] | Keep tab selection constrained to `TabKey` and fixed config definitions rather than free-form strings. [VERIFIED: src/components/admin/types.ts] |
| V6 Cryptography | no new crypto surface in this phase. [VERIFIED: src/app/admin/page.tsx, src/middleware.ts] | Reuse existing auth/session code unchanged. [VERIFIED: src/middleware.ts] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized admin route exposure if shell cleanup bypasses protected route structure. [VERIFIED: src/middleware.ts] | Elevation of Privilege | Do not move admin shell behavior outside `/admin` or `/api/admin` protection boundaries. [VERIFIED: src/middleware.ts] |
| Client-side state drift if tab keys become untyped strings. [VERIFIED: src/components/admin/types.ts, src/app/admin/page.tsx] | Tampering | Keep `TabKey` as the single source of valid tab IDs and derive config/state maps from it. [VERIFIED: src/components/admin/types.ts] |

## Sources

### Primary (HIGH confidence)

- `ROADMAP.md` - phase goal, success criteria, and Phase 4 scope guard. [VERIFIED: /Users/rouxsparrow/Code/club-genie/.planning/ROADMAP.md]
- `REQUIREMENTS.md` - `SHELL-01` and `PARITY-07`. [VERIFIED: /Users/rouxsparrow/Code/club-genie/.planning/REQUIREMENTS.md]
- Phase 02 summaries and verification - established keep-mounted/eager-mount parity rules. [VERIFIED: /Users/rouxsparrow/Code/club-genie/.planning/phases/02-tab-extraction/02-VERIFICATION.md, /Users/rouxsparrow/Code/club-genie/.planning/phases/02-tab-extraction/02-tab-extraction-01-SUMMARY.md, /Users/rouxsparrow/Code/club-genie/.planning/phases/02-tab-extraction/02-tab-extraction-02-SUMMARY.md, /Users/rouxsparrow/Code/club-genie/.planning/phases/02-tab-extraction/02-tab-extraction-03-SUMMARY.md]
- Current admin shell implementation. [VERIFIED: /Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx]
- Admin route protection middleware. [VERIFIED: /Users/rouxsparrow/Code/club-genie/src/middleware.ts]
- Vitest configuration and current extraction test. [VERIFIED: /Users/rouxsparrow/Code/club-genie/vitest.config.ts, /Users/rouxsparrow/Code/club-genie/tests/admin-tab-extraction.test.ts]
- npm registry package metadata for `next`, `react`, `typescript`, `vitest`, `eslint`, and `tailwindcss`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- `DECISIONS.md` and `STATE.md` for project-wide architecture boundaries and current phase position. [VERIFIED: /Users/rouxsparrow/Code/club-genie/DECISIONS.md, /Users/rouxsparrow/Code/club-genie/.planning/STATE.md]
- `AGENTS.md` for repo-specific execution constraints. [VERIFIED: /Users/rouxsparrow/Code/club-genie/AGENTS.md]

### Tertiary (LOW confidence)

- None. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - grounded in `package.json`, npm registry checks, and the current route/test configuration. [VERIFIED: package.json, npm registry, vitest.config.ts]
- Architecture: HIGH - based directly on the current shell implementation and Phase 2 verification artifacts. [VERIFIED: src/app/admin/page.tsx, 02-VERIFICATION.md]
- Pitfalls: HIGH - each risk is tied to already-documented Phase 2 parity behavior or the current shell’s exact structure. [VERIFIED: 02-tab-extraction summaries, src/app/admin/page.tsx]

**Research date:** 2026-04-09 [VERIFIED: system date]  
**Valid until:** 2026-05-09 for repo-local planning assumptions, or sooner if `/admin` shell behavior changes before planning starts. [ASSUMED]
