# Phase 02: Tab Extraction - Research

**Researched:** 2026-04-09 [VERIFIED: local system date]
**Domain:** Next.js admin client-component refactor for per-tab extraction with behavior parity [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]
**Confidence:** MEDIUM [VERIFIED: local codebase analysis]

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this section: `.planning/phases/02-tab-extraction/02-CONTEXT.md` [VERIFIED: local codebase]

### Locked Decisions
- **D-01:** Create one component per Phase 2 requirement in `src/components/admin/`: `players-tab.tsx`, `club-access-tab.tsx`, `automation-tab.tsx`, `splitwise-tab.tsx`, `accounts-tab.tsx`, and `emails-tab.tsx`.
- **D-02:** Each extracted tab owns its own `useState`/`useEffect` state, fetch/mutation calls, refresh helpers, and tab-local types. `src/app/admin/page.tsx` should only keep tab navigation, `activeTab`, and conditional component mounting.
- **D-03:** Tab components should preserve the current rendered copy, Tailwind classes, table/card structure, empty states, and button flows by moving the existing JSX with minimal cosmetic change rather than redesigning layouts during extraction.
- **D-04:** Reuse Phase 1 shared assets where they already fit: `src/components/admin/types.ts`, `src/components/admin/admin-fetch.ts`, and `src/components/admin/formatters.ts`.
- **D-05:** Keep tab-specific response/settings types colocated inside their tab components unless the same type is used by more than one tab; do not expand `types.ts` into a catch-all dump.
- **D-06:** Do not introduce new global state, context providers, or external state libraries. Cross-tab coordination stays in the shell only through `activeTab`; data loading remains tab-local.
- **D-07:** Use `src/components/admin-accounts-panel.tsx` as the migration source for `accounts-tab.tsx`, preserving its self-contained behavior but moving it into the `src/components/admin/` directory and naming scheme used by the other extracted tabs.
- **D-08:** Phase 2 should end with all six tabs following the same extraction style, so the old top-level `admin-accounts-panel.tsx` pattern no longer remains a one-off exception.
- **D-09:** Keep all existing admin API route paths and request/response contracts unchanged; extraction is client-side only.
- **D-10:** Preserve the current fetch/error-handling pattern (`credentials: "include"`, JSON parse fallback, `data?.ok` checks, inline status messages) unless Phase 1 utilities already provide an equivalent wrapper.
- **D-11:** Prefer tab-by-tab extraction slices that can be verified independently, but each slice must leave the overall admin page working for untouched tabs.

### Claude's Discretion
- Exact extraction order across the six tabs
- Whether a small tab-local helper stays inline or moves to a sibling helper file
- Whether `accounts-tab.tsx` wraps the existing panel temporarily or replaces it directly during migration

### Deferred Ideas (OUT OF SCOPE)
- Toast notifications, per-tab error boundaries, and dashboard overview work remain later-phase or v2 improvements
- Reducing `src/app/admin/page.tsx` to a sub-150-line shell remains Phase 3 scope
- Shared validation cleanup or a broader admin API client redesign remains out of scope for this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

Source for requirement IDs/descriptions: `.planning/REQUIREMENTS.md` [VERIFIED: local codebase]

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Players tab extracted into `src/components/admin/players-tab.tsx` with own state and API calls [VERIFIED: .planning/REQUIREMENTS.md] | Use the Players state/handler cluster in [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L72) and the Players render block starting at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1119) as the extraction source of truth [VERIFIED: local codebase]. |
| COMP-02 | Club Access tab extracted into `src/components/admin/club-access-tab.tsx` with own state and API calls [VERIFIED: .planning/REQUIREMENTS.md] | Use the club token state/handlers in [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L79) and the Club Access render block at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1398) [VERIFIED: local codebase]. |
| COMP-03 | Automation tab extracted into `src/components/admin/automation-tab.tsx` with own state and API calls [VERIFIED: .planning/REQUIREMENTS.md] | Move the automation settings, ingestion run history, and receipt error state/handlers from [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L82) plus the UI block at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1490) [VERIFIED: local codebase]. |
| COMP-04 | Splitwise tab extracted into `src/components/admin/splitwise-tab.tsx` with own state and API calls [VERIFIED: .planning/REQUIREMENTS.md] | Move the Splitwise settings, run history, groups, records, and summary cluster from [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L117) and the UI block at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1668) [VERIFIED: local codebase]. |
| COMP-05 | Accounts tab migrated to `src/components/admin/accounts-tab.tsx` (building on existing `admin-accounts-panel.tsx`) [VERIFIED: .planning/REQUIREMENTS.md] | Promote [`src/components/admin-accounts-panel.tsx`](/Users/rouxsparrow/Code/club-genie/src/components/admin-accounts-panel.tsx#L32) into the new directory and naming convention with minimal internal change [VERIFIED: local codebase]. |
| COMP-06 | Emails tab extracted into `src/components/admin/emails-tab.tsx` with own state and API calls [VERIFIED: .planning/REQUIREMENTS.md] | Move preview query, preview result, rerun chip/log state, and rerun handlers from [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L103) plus the UI block at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L2085) [VERIFIED: local codebase]. |
| PARITY-01 | All Players tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve every Players action path: add, rename, deactivate/reactivate, Splitwise user id blur-save, default payer, shuttlecock paid, avatar upload/remove, and advanced section toggle [VERIFIED: local codebase]. |
| PARITY-02 | All Club Access tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve rotate token, copy invite link, current token fetch, and copy current link flows with the same inline messages [VERIFIED: local codebase]. |
| PARITY-03 | All Automation tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve settings save, manual ingestion run, run summary, run history filters/load, and parse failure rendering [VERIFIED: local codebase]. |
| PARITY-04 | All Splitwise tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve settings save, connection test, manual sync, run errors/history, group tools, expense record filtering, and delete confirmation [VERIFIED: local codebase]. |
| PARITY-05 | All Accounts tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve `refreshAll`, create account, save account, reset password, and change-my-password flows from [`src/components/admin-accounts-panel.tsx`](/Users/rouxsparrow/Code/club-genie/src/components/admin-accounts-panel.tsx#L76) [VERIFIED: local codebase]. |
| PARITY-06 | All Emails tab operations work identically after extraction [VERIFIED: .planning/REQUIREMENTS.md] | Preserve preview load, status filter, rerun action, rerun chip/log behavior, and text/html body details rendering [VERIFIED: local codebase]. |
</phase_requirements>

## Summary

Phase 02 is a structural client refactor, not a feature phase: the planner should treat [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx) as six mostly self-contained tab implementations already living side-by-side inside one `"use client"` page, then move each implementation into its own file under `src/components/admin/` with minimal JSX change and unchanged API routes [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase]. The page is currently 2,247 lines, with the tab render blocks starting at lines 1117, 1119, 1398, 1490, 1668, and 2085, which gives clean extraction anchors for Accounts, Players, Club Access, Automation, Splitwise, and Emails respectively [VERIFIED: local codebase `wc -l`] [VERIFIED: local codebase].

The implementation shape should be: keep the admin page as the shell with `activeTab`, nav buttons, header/background, and imports of six client tab components; move each tab’s `useState`, `useEffect`, tab-local types, fetch helpers, mutation handlers, and JSX into one tab file; keep shared cross-tab primitives in `src/components/admin/types.ts`, `src/components/admin/admin-fetch.ts`, and `src/components/admin/formatters.ts` only where reuse already exists [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: src/components/admin/types.ts] [VERIFIED: src/components/admin/admin-fetch.ts] [VERIFIED: src/components/admin/formatters.ts].

**Primary recommendation:** Plan the phase as three low-risk slices: `accounts + players`, `club + automation`, `splitwise + emails`, with each slice ending in `typecheck + lint + focused manual admin-tab walkthrough`, because the highest risk is behavior drift from moving state ownership and from losing state persistence on tab switch when components start unmounting [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase] [CITED: https://react.dev/reference/react/useEffect].

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | Repo uses `^16.1.6`; npm latest is `16.2.3` modified `2026-04-08` [VERIFIED: package.json] [VERIFIED: npm registry] | App Router page shell and client/server boundary [CITED: https://nextjs.org/docs/app/api-reference/directives/use-client] | The admin page is already an App Router page and the extracted tabs remain client entry points inside that architecture [VERIFIED: local codebase]. |
| React | Repo uses `^18.3.1`; npm latest is `19.2.5` modified `2026-04-08` [VERIFIED: package.json] [VERIFIED: npm registry] | Tab-local state, effects, and derived lists [VERIFIED: local codebase] | The current admin implementation already uses `useState`, `useEffect`, and `useMemo`; extraction should preserve that model instead of introducing new state infrastructure [VERIFIED: local codebase] [CITED: https://react.dev/reference/react/useEffect] [CITED: https://react.dev/reference/react/useMemo]. |
| TypeScript | Repo uses `^5.7.2`; local CLI is `5.9.3`; npm latest is `6.0.2` modified `2026-04-01` [VERIFIED: package.json] [VERIFIED: local CLI] [VERIFIED: npm registry] | Keep tab-local response types strict and preserve existing compile-time safety [VERIFIED: local codebase] | The repo is strict-mode TypeScript and Phase 1 already extracted shared types, so Phase 2 should lean on typed response shapes instead of widening to `any` [VERIFIED: .planning/codebase/CONVENTIONS.md] [VERIFIED: src/components/admin/types.ts]. |
| Tailwind CSS | Repo uses `^3.4.19`; npm latest is `4.2.2` modified `2026-04-07` [VERIFIED: package.json] [VERIFIED: npm registry] | Preserve existing admin card/table/button styling without redesign [VERIFIED: local codebase] | Locked decision D-03 requires moving existing JSX and classes with minimal cosmetic change [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/components/admin/admin-fetch.ts` | Local module, 19 lines [VERIFIED: local codebase] | Shared admin fetch wrapper for `credentials: 'include'` and JSON parse fallback [VERIFIED: src/components/admin/admin-fetch.ts] | Use for new tab fetches where it preserves current behavior; do not build a new API client in this phase [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |
| `src/components/admin/formatters.ts` | Local module, 30 lines [VERIFIED: local codebase] | Shared run-history formatting for Automation and Splitwise [VERIFIED: src/components/admin/formatters.ts] | Reuse in extracted Automation and Splitwise tabs exactly as page.tsx does today [VERIFIED: local codebase]. |
| `src/components/admin/types.ts` | Local module, 68 lines [VERIFIED: local codebase] | Shared cross-tab admin types and `TabKey` union [VERIFIED: src/components/admin/types.ts] | Import shared types only when already shared across tabs; keep tab-specific response/settings types inline per D-05 [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |
| Vitest | Repo uses `^4.0.18`; local CLI is `4.0.18`; npm latest is `4.1.3` modified `2026-04-07` [VERIFIED: package.json] [VERIFIED: local CLI] [VERIFIED: npm registry] | Existing unit test runner [VERIFIED: package.json] | Use for non-DOM helpers touched during extraction; the current test environment is `node`, so component rendering tests are not ready without adding a browser-like environment [VERIFIED: vitest.config.ts] [CITED: https://vitest.dev/config/environment]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-tab local `useState`/`useEffect` components [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | Context or external state library [VERIFIED: .planning/REQUIREMENTS.md] | Rejected because Phase scope explicitly forbids new global state and state libraries [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: .planning/REQUIREMENTS.md]. |
| Reusing `adminFetch` [VERIFIED: src/components/admin/admin-fetch.ts] | New centralized admin API client [VERIFIED: .planning/REQUIREMENTS.md] | Rejected for Phase 02 because centralized client cleanup is explicitly v2 quality scope, not this parity refactor [VERIFIED: .planning/REQUIREMENTS.md]. |
| Moving JSX largely as-is [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | UI redesign while extracting [VERIFIED: .planning/REQUIREMENTS.md] | Rejected because visual redesign is out of scope and increases parity risk [VERIFIED: .planning/REQUIREMENTS.md]. |

**Installation:**
```bash
npm install
```
The planner should not schedule framework upgrades as part of this phase; use the repo’s declared stack and only add test deps if a later plan explicitly opts into DOM component testing [VERIFIED: package.json] [VERIFIED: .planning/REQUIREMENTS.md].

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── app/admin/page.tsx                  # Thin shell: mounted gate, header/nav, activeTab, tab imports
├── components/admin/
│   ├── accounts-tab.tsx                # Migrated from admin-accounts-panel.tsx
│   ├── players-tab.tsx                 # Players-only state, handlers, JSX
│   ├── club-access-tab.tsx             # Club token-only state, handlers, JSX
│   ├── automation-tab.tsx              # Automation settings/history/errors
│   ├── splitwise-tab.tsx               # Splitwise settings/history/groups/records
│   ├── emails-tab.tsx                  # Email preview + rerun flows
│   ├── admin-fetch.ts                  # Shared fetch wrapper from Phase 1
│   ├── formatters.ts                   # Shared history formatters from Phase 1
│   └── types.ts                        # Shared cross-tab types only
└── components/player-avatar-circle.tsx # Existing Players-tab dependency
```
This structure follows the locked `src/components/admin/` extraction target and keeps the existing shared Phase 1 foundation in place [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: .planning/ROADMAP.md].

### Pattern 1: Extract Each Tab as a Self-Contained Client Entry Point
**What:** Each new tab file should start with `"use client"` and own the same local state/effects/handlers currently grouped in `page.tsx` [VERIFIED: local codebase] [CITED: https://nextjs.org/docs/app/api-reference/directives/use-client].  
**When to use:** For all six admin tabs in this phase [VERIFIED: .planning/REQUIREMENTS.md].  
**Example:**
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Player, PlayersResponse } from './types';
import { adminFetch } from './admin-fetch';

export default function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playersError, setPlayersError] = useState<string | null>(null);

  useEffect(() => {
    void refreshPlayers();
  }, []);

  async function refreshPlayers() {
    setLoadingPlayers(true);
    setPlayersError(null);
    const data = await adminFetch<PlayersResponse>('/api/admin/players');
    if (!data.ok) {
      setPlayersError(data.error ?? 'Failed to load players.');
      setLoadingPlayers(false);
      return;
    }
    setPlayers(data.players ?? []);
    setLoadingPlayers(false);
  }

  const activePlayers = useMemo(() => players.filter((player) => player.active), [players]);
  return <section>{activePlayers.length}</section>;
}
```
Source pattern: current `page.tsx` Players state/refresh/useMemo cluster [VERIFIED: local codebase] plus Next/React client-component docs [CITED: https://nextjs.org/docs/app/api-reference/directives/use-client] [CITED: https://react.dev/reference/react/useEffect] [CITED: https://react.dev/reference/react/useMemo].

### Pattern 2: Keep the Page as the Composition Shell
**What:** `src/app/admin/page.tsx` should keep the mounted gate, header, tab nav, `activeTab`, and the six conditional render sites only [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].  
**When to use:** Throughout Phase 02; shell reduction stays Phase 03 [VERIFIED: .planning/ROADMAP.md].  
**Example:**
```tsx
{activeTab === 'players' ? <PlayersTab /> : null}
{activeTab === 'club' ? <ClubAccessTab /> : null}
{activeTab === 'automation' ? <AutomationTab /> : null}
```
Anchor points: current tab switch/render block at [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1043) through [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L2085) [VERIFIED: local codebase].

### Pattern 3: Move Handler + JSX + Tab-Local Types Together
**What:** Extract by ownership slice, not by helper type; if a handler only serves one tab, it should move with that tab even if it is large [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].  
**When to use:** For Players advanced controls, Email rerun helpers, Splitwise settings normalization, and Club token messages [VERIFIED: local codebase].  
**Example:**
```tsx
type ClubTokenCurrentResponse = {
  ok: boolean;
  token?: string | null;
  warningMessage?: string;
  error?: string;
};

async function refreshCurrentClubToken() {
  // stays inside club-access-tab.tsx because only that tab uses it
}
```
Source pattern: current tab-specific types left inline in `page.tsx` per Phase 1 D-02 and Phase 2 D-05 [VERIFIED: .planning/phases/01-shared-foundation/01-CONTEXT.md] [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].

### Anti-Patterns to Avoid
- **Rebuilding a shared admin API client in Phase 02:** Existing `adminFetch` already covers the repeated fetch pattern, and centralized client redesign is explicitly deferred to later quality work [VERIFIED: src/components/admin/admin-fetch.ts] [VERIFIED: .planning/REQUIREMENTS.md].
- **Dumping every tab-specific type into `types.ts`:** Locked decision D-05 says keep tab-local types inline unless they are reused across tabs [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].
- **Mixing multiple tabs into one extraction commit/plan without intermediate verification:** D-11 prefers independently verifiable tab-by-tab slices, and the monolith currently spans many unrelated handlers [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].
- **Assuming tab state persistence survives unmount:** React effects and state are scoped to the mounted component; if a tab component unmounts on tab switch, its local draft state resets unless explicitly preserved elsewhere [CITED: https://react.dev/reference/react/useEffect] [VERIFIED: local codebase].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Repeated admin fetch boilerplate [VERIFIED: local codebase] | Another bespoke fetch wrapper per tab [VERIFIED: local codebase] | `adminFetch` where behavior matches current flow [VERIFIED: src/components/admin/admin-fetch.ts] | It already centralizes `credentials: 'include'` and JSON parse fallback without introducing new abstractions [VERIFIED: src/components/admin/admin-fetch.ts]. |
| Run history summary formatting [VERIFIED: local codebase] | New inline string builders in Automation/Splitwise tabs [VERIFIED: local codebase] | `formatDuration`, `formatIngestionHistorySummary`, `formatSplitwiseHistorySummary` [VERIFIED: src/components/admin/formatters.ts] | Reusing these reduces parity drift in table output [VERIFIED: local codebase]. |
| Email rerun payload/chip logic [VERIFIED: local codebase] | New preview rerun utilities inside `emails-tab.tsx` [VERIFIED: local codebase] | Existing `buildSingleEmailRerunPayload`, `collectNotIngestedMessageIds`, `isEmailPreviewRerunnable` from `src/lib/admin-email-preview-rerun` [VERIFIED: local codebase] | The monolith already depends on them; duplicating them would create logic drift [VERIFIED: local codebase]. |
| Accounts tab baseline [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | Rewriting Accounts from scratch [VERIFIED: local codebase] | Migrate `src/components/admin-accounts-panel.tsx` into `src/components/admin/accounts-tab.tsx` [VERIFIED: local codebase] | The existing panel is already the project’s proven self-contained tab pattern [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase]. |

**Key insight:** The safest Phase 02 move is extraction-by-relocation, not abstraction-by-redesign; the codebase already has enough local patterns and shared helpers to avoid inventing new infrastructure [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].

## Runtime State Inventory

This phase is a client-side component extraction, not a rename or storage-schema migration [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. The audit below is explicit so the planner can distinguish “checked and none found” from “not researched” [VERIFIED: local research process].

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None; Phase 02 does not change database keys, collection names, IDs, or payload contracts, and D-09 locks API contracts unchanged [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | None. |
| Live service config | None; no dashboard-side service config is being renamed or repointed because this phase only moves client component code [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | None. |
| OS-registered state | None; no task names, service registrations, or local package names are changing in this phase [VERIFIED: local codebase scope] | None. |
| Secrets/env vars | None; AGENTS.md also forbids putting runtime tokens in env files, and this phase does not change env contract or token names [VERIFIED: AGENTS.md] [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | None. |
| Build artifacts | None expected; component file extraction changes source imports only and does not rename package names or generated artifact identifiers [VERIFIED: local codebase scope] | None beyond normal rebuild/typecheck. |

## Common Pitfalls

### Pitfall 1: Losing Tab State on Tab Switch
**What goes wrong:** Players drafts, Email rerun chips/logs, loaded histories, and other tab-local state will reset if the new components are conditionally mounted and unmounted on tab change [VERIFIED: local codebase].  
**Why it happens:** Today those state variables live in the parent page, so they survive tab switches even though the JSX sections are conditional; after extraction they move into child components where unmount destroys state [VERIFIED: local codebase] [CITED: https://react.dev/reference/react/useEffect].  
**How to avoid:** Make an explicit planning decision about whether reset-on-switch is acceptable; if not, preserve mounted tab instances or introduce a tiny keep-alive shell before implementation starts [VERIFIED: local codebase].  
**Warning signs:** Switching away from Emails clears rerun results, or switching away from Players clears in-progress rename/avatar drafts [VERIFIED: local codebase].

### Pitfall 2: Accidentally Changing Data-Load Timing
**What goes wrong:** Later tabs may stop being preloaded on page mount once their state/effects move into tab-local components [VERIFIED: local codebase].  
**Why it happens:** The monolith currently runs one top-level `Promise.all` for players, automation settings, receipt errors, club token, and splitwise settings in a page-level mount effect [VERIFIED: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L195)].  
**How to avoid:** Document which tabs should load on first activation versus eagerly, and treat any load-timing change as a parity review item during manual verification [VERIFIED: local codebase].  
**Warning signs:** Club Access or Splitwise looks blank or slower on first open compared with the current page [VERIFIED: local codebase].

### Pitfall 3: Expanding Shared Files Into Catch-All Dumps
**What goes wrong:** `types.ts` or `admin-fetch.ts` becomes a dumping ground for tab-specific state and helper logic [VERIFIED: local codebase].  
**Why it happens:** Extraction work often pulls helpers “up” too early instead of preserving ownership boundaries [ASSUMED].  
**How to avoid:** Only promote code when two or more tabs actually share it, which matches locked decision D-05 and Phase 1’s scope [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: .planning/phases/01-shared-foundation/01-CONTEXT.md].  
**Warning signs:** A new shared file appears containing Splitwise-only or Email-only types/helpers [VERIFIED: local codebase].

### Pitfall 4: Leaving Accounts as a One-Off Pattern
**What goes wrong:** The planner extracts five new tabs but leaves `src/components/admin-accounts-panel.tsx` in place, so the admin area still has two location/naming conventions [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].  
**Why it happens:** Accounts already “works,” so it is easy to defer the migration and accidentally miss COMP-05/D-08 [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].  
**How to avoid:** Make `accounts-tab.tsx` part of the first extraction slice and delete or stop importing the old top-level component before the phase closes [VERIFIED: local codebase].  
**Warning signs:** `page.tsx` still imports `../../components/admin-accounts-panel` after Phase 02 work [VERIFIED: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L5)].

### Pitfall 5: Planning DOM Component Tests Without DOM Test Infra
**What goes wrong:** A plan assumes React render tests can be added quickly, but the repo currently runs Vitest in `node` mode and has no Testing Library, `jsdom`, or `happy-dom` dependency [VERIFIED: vitest.config.ts] [VERIFIED: local codebase grep] [CITED: https://vitest.dev/config/environment].  
**Why it happens:** The repo has healthy unit tests, but they target libraries/routes rather than component rendering [VERIFIED: tests directory listing].  
**How to avoid:** Treat browser/manual admin walkthroughs as the main parity check for this phase unless a dedicated test-infra subtask is added up front [VERIFIED: .planning/phases/01-shared-foundation/01-VERIFICATION.md] [VERIFIED: local codebase].  
**Warning signs:** A plan says “add component tests” without also adding a browser-like environment dependency and config change [VERIFIED: package.json] [VERIFIED: vitest.config.ts].

## Code Examples

Verified patterns from official sources and current code:

### Client Tab Entry Point
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ClubAccessTab() {
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    void refreshCurrentClubToken();
  }, []);

  async function refreshCurrentClubToken() {
    // fetch current token here
  }

  return <section>{currentToken}</section>;
}
```
Pattern basis: Next client component boundary docs and current admin page/client tabs [CITED: https://nextjs.org/docs/app/api-reference/directives/use-client] [VERIFIED: local codebase].

### Shared Fetch Wrapper Usage
```ts
const data = await adminFetch<PlayersResponse>('/api/admin/players');
if (!data.ok) {
  setPlayersError(data.error ?? 'Failed to load players.');
  return;
}
setPlayers(data.players ?? []);
```
Source: `src/components/admin/admin-fetch.ts` response contract plus current Players refresh behavior in `page.tsx` [VERIFIED: src/components/admin/admin-fetch.ts] [VERIFIED: local codebase].

### Derived Lists Stay Local to the Owning Tab
```tsx
const activePlayers = useMemo(() => players.filter((player) => player.active), [players]);
const inactivePlayers = useMemo(() => players.filter((player) => !player.active), [players]);
```
Source: current Players tab code and React `useMemo` guidance for caching derived calculations [VERIFIED: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L168)] [CITED: https://react.dev/reference/react/useMemo].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One monolithic admin page owns nearly all tab state and handlers [VERIFIED: local codebase] | Per-tab client components under `src/components/admin/` are the roadmap target [VERIFIED: .planning/ROADMAP.md] | Planned for Phase 02 on 2026-04-09 [VERIFIED: .planning/STATE.md] | Reduces edit blast radius and aligns with the project core value [VERIFIED: .planning/STATE.md] [VERIFIED: .planning/REQUIREMENTS.md]. |
| One existing extracted Accounts exception at top-level `src/components/` [VERIFIED: local codebase] | All six tabs in one admin component directory [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | Locked by Phase 02 decisions [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] | Gives the planner one consistent extraction/migration pattern [VERIFIED: local codebase]. |
| Parent-owned tab state survives tab switches today [VERIFIED: local codebase] | Child-owned state after extraction may reset on unmount unless preserved [VERIFIED: local codebase] | This changes at implementation time, not yet in repo [VERIFIED: local codebase] | This is the main parity hotspot the plan must decide around before execution [VERIFIED: local codebase]. |

**Deprecated/outdated:**
- Keeping `src/components/admin-accounts-panel.tsx` as the lone extracted admin tab is outdated relative to Phase 02’s locked end state [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extraction work often pulls helpers “up” too early instead of preserving ownership boundaries [ASSUMED] | Common Pitfalls / Pitfall 3 | Low; it affects plan emphasis, not implementation feasibility. |

## Open Questions

1. **Must tab-local state survive tab switches exactly as it does today?** [VERIFIED: local codebase]
   - What we know: Parent-owned state currently persists while conditional tab JSX mounts/unmounts [VERIFIED: local codebase].
   - What's unclear: Whether losing draft/history state after extraction would be accepted as “behavior parity” for Phase 02 [VERIFIED: .planning/REQUIREMENTS.md].
   - Recommendation: Resolve this before planning tasks; if persistence is required, add an explicit keep-alive strategy to the plan instead of discovering the issue mid-implementation [VERIFIED: local codebase].

2. **Should eager preload behavior be preserved or can tabs fetch on first activation?** [VERIFIED: local codebase]
   - What we know: The current page eagerly loads players, automation settings, receipt errors, club token, and splitwise settings on mount [VERIFIED: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L195)].
   - What's unclear: Whether later-tab first-open latency is considered a parity regression for this refactor [VERIFIED: .planning/REQUIREMENTS.md].
   - Recommendation: Default to tab-local first-load behavior unless the planner explicitly chooses to preserve preload semantics for UX parity [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next/Vitest/TypeScript commands during implementation and verification [VERIFIED: package.json] | ✓ [VERIFIED: local CLI] | `v24.13.0` [VERIFIED: local CLI] | — |
| npm | Package scripts and dependency inspection [VERIFIED: package.json] | ✓ [VERIFIED: local CLI] | `11.6.2` [VERIFIED: local CLI] | — |
| Vitest CLI | Existing automated tests [VERIFIED: package.json] | ✓ [VERIFIED: local CLI] | `4.0.18` [VERIFIED: local CLI] | Use `npm test -- --run <file>` through package script if direct CLI usage varies [VERIFIED: package.json]. |
| TypeScript CLI | Typecheck gate [VERIFIED: package.json] | ✓ [VERIFIED: local CLI] | `5.9.3` [VERIFIED: local CLI] | `npm run typecheck` [VERIFIED: package.json]. |
| ESLint CLI | Lint gate [VERIFIED: package.json] | ✓ [VERIFIED: local CLI] | `9.39.2` [VERIFIED: local CLI] | `npm run lint` [VERIFIED: package.json]. |

**Missing dependencies with no fallback:**
- None for the planned refactor path [VERIFIED: local environment audit].

**Missing dependencies with fallback:**
- DOM/browser component-test infrastructure is missing from the current repo, but manual browser verification remains viable for parity checks in this phase [VERIFIED: local codebase grep] [VERIFIED: .planning/phases/01-shared-foundation/01-VERIFICATION.md].

## Security Domain

This phase is client-only and keeps existing admin API routes/contracts unchanged, so the primary security requirement is “do not weaken existing request paths or auth assumptions while moving code” [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes [VERIFIED: local codebase] | Continue using the existing admin session/auth routes unchanged; client extraction must not alter auth flow [VERIFIED: local codebase]. |
| V3 Session Management | yes [VERIFIED: local codebase] | Preserve `credentials: "include"` on admin requests, matching current fetch behavior and Phase 2 D-10 [VERIFIED: local codebase] [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |
| V4 Access Control | yes [VERIFIED: local codebase] | Keep current `/api/admin/*` and `/api/admin-session` request targets unchanged; access control stays server-side [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase]. |
| V5 Input Validation | yes [VERIFIED: local codebase] | Preserve existing client validation and server response handling; do not widen request payloads during extraction [VERIFIED: local codebase]. |
| V6 Cryptography | no direct new work [VERIFIED: phase scope] | No crypto changes belong to this phase [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Dropping `credentials: "include"` on extracted admin fetches [VERIFIED: local codebase] | Spoofing / Elevation | Use `adminFetch` or preserve the existing fetch options exactly in each tab [VERIFIED: src/components/admin/admin-fetch.ts] [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |
| Client-side contract drift after extraction [VERIFIED: local codebase] | Tampering | Keep API paths, HTTP verbs, and body shapes identical to the monolith [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md]. |
| Rendering stale success/error messages in the wrong tab after a bad move [VERIFIED: local codebase] | Repudiation / Integrity | Keep message state local to the owning tab and verify every action flow manually after each slice [VERIFIED: local codebase]. |

## Sources

### Primary (HIGH confidence)
- Local codebase: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx), [`src/components/admin-accounts-panel.tsx`](/Users/rouxsparrow/Code/club-genie/src/components/admin-accounts-panel.tsx), [`src/components/admin/types.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/types.ts), [`src/components/admin/admin-fetch.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/admin-fetch.ts), [`src/components/admin/formatters.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/formatters.ts) [VERIFIED: local codebase]
- Phase planning docs: `.planning/phases/02-tab-extraction/02-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/phases/01-shared-foundation/01-CONTEXT.md`, `.planning/phases/01-shared-foundation/01-VERIFICATION.md` [VERIFIED: local codebase]
- npm registry lookups via `npm view` for `next`, `react`, `vitest`, `tailwindcss`, `typescript` [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Next.js docs: `https://nextjs.org/docs/app/api-reference/directives/use-client` [CITED: https://nextjs.org/docs/app/api-reference/directives/use-client]
- React docs: `https://react.dev/reference/react/useEffect`, `https://react.dev/reference/react/useMemo` [CITED: https://react.dev/reference/react/useEffect] [CITED: https://react.dev/reference/react/useMemo]
- Vitest docs: `https://vitest.dev/config/environment` [CITED: https://vitest.dev/config/environment]

### Tertiary (LOW confidence)
- None; one minor planning heuristic remains in the assumptions log [VERIFIED: local research].

## Metadata

**Implementation shape:** Keep `page.tsx` as shell-only UI chrome plus tab switch; extract six `"use client"` tab components; move handlers/state/JSX by ownership; reuse `types.ts`, `admin-fetch.ts`, `formatters.ts`, `PlayerAvatarCircle`, and email-rerun helpers instead of inventing new abstractions [VERIFIED: .planning/phases/02-tab-extraction/02-CONTEXT.md] [VERIFIED: local codebase].

**Risk hotspots:** Tab-state persistence on unmount, preload timing changes, Accounts migration consistency, and limited automated UI-test coverage in the current `node` Vitest setup [VERIFIED: local codebase] [VERIFIED: vitest.config.ts].

**Recommended plan split:**  
1. `accounts + players` because Accounts is already extracted and Players is the cleanest large state cluster [VERIFIED: local codebase].  
2. `club + automation` because both are smaller than Splitwise/Emails and have straightforward fetch/mutation flows [VERIFIED: local codebase].  
3. `splitwise + emails` because they hold the densest helper/state/render combinations and need the most careful parity review [VERIFIED: local codebase].

**Concrete anchor files/patterns for the planner:**  
- Accounts baseline: [`src/components/admin-accounts-panel.tsx`](/Users/rouxsparrow/Code/club-genie/src/components/admin-accounts-panel.tsx#L32) [VERIFIED: local codebase]  
- Shared fetch contract: [`src/components/admin/admin-fetch.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/admin-fetch.ts#L1) [VERIFIED: local codebase]  
- Shared type boundary: [`src/components/admin/types.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/types.ts#L1) [VERIFIED: local codebase]  
- Shared formatters: [`src/components/admin/formatters.ts`](/Users/rouxsparrow/Code/club-genie/src/components/admin/formatters.ts#L1) [VERIFIED: local codebase]  
- Tab render boundaries in monolith: [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1117), [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1119), [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1398), [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1490), [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L1668), [`src/app/admin/page.tsx`](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx#L2085) [VERIFIED: local codebase]

**Confidence breakdown:**
- Standard stack: HIGH - repo stack, local toolchain, and npm registry versions were directly verified [VERIFIED: package.json] [VERIFIED: local CLI] [VERIFIED: npm registry].
- Architecture: MEDIUM - extraction seams are clear, but parity implications of tab unmount/state reset need a planning decision [VERIFIED: local codebase].
- Pitfalls: HIGH - they come directly from current state ownership, mount behavior, and missing DOM test infra in this repo [VERIFIED: local codebase] [VERIFIED: vitest.config.ts].

**Research date:** 2026-04-09 [VERIFIED: local system date]
**Valid until:** 2026-05-09 for repo-local architecture findings; 2026-04-16 for npm/doc currency-sensitive version references [VERIFIED: local research judgment]
