# Phase 1: Shared Foundation - Context

**Gathered:** 2026-04-08 (assumptions mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract shared types and utility hooks from page.tsx so tab components have a clean API surface to build against. No tab extraction in this phase — only the foundation that all tabs will import.

</domain>

<decisions>
## Implementation Decisions

### Shared Types Scope
- **D-01:** Create `src/components/admin/types.ts` containing only cross-tab types: `TabKey`, `Player`, `RunHistoryEntry`, `RunHistoryStatusFilter`, `RunHistorySourceFilter`, and email preview types (`EmailPreviewMessage`, `EmailRerunOutcome`, `EmailRerunChip`, `EmailRerunLog`)
- **D-02:** Tab-specific types (`SplitwiseSettings`, `AutomationSettings`, `ClubTokenCurrentResponse`, etc.) remain inline in their respective tab files when extracted in Phase 2

### Utility Design
- **D-03:** Create a generic `adminFetch` utility function (not a React hook) that wraps the repeated fetch pattern: `fetch` with `credentials: "include"`, JSON parse with `.catch(() => null)`, and `{ ok: boolean; error?: string }` response checking
- **D-04:** No domain-specific hooks (e.g., `usePlayers()`, `useAdminApi()`) — keep it as a plain function to match existing codebase conventions (zero custom hooks currently exist)

### Shared Formatters
- **D-05:** Extract `formatDuration` into shared utilities — used by both Automation and Splitwise run history tables
- **D-06:** Extract `formatIngestionHistorySummary` and `formatSplitwiseHistorySummary` as shared formatters — both follow the same pure-function pattern

### Accounts Panel
- **D-07:** Leave `admin-accounts-panel.tsx` in its current location until Phase 2 (COMP-05 is mapped to Phase 2). Phase 1 only creates types.ts and utility files.

### Claude's Discretion
- Exact file names for utility files (e.g., `admin-fetch.ts`, `admin-utils.ts`, `formatters.ts`)
- Whether to use a single utilities file or split by concern
- Internal structure of the adminFetch helper (overloads, generic typing)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin page (source of extraction)
- `src/app/admin/page.tsx` — All types, fetch patterns, and utility functions to extract (2,329 lines)
  - Lines 16-210: Type definitions and interfaces
  - Lines 231-256: Formatter utility functions (formatDuration, formatIngestionHistorySummary, formatSplitwiseHistorySummary)

### Existing extracted components (pattern reference)
- `src/components/admin-accounts-panel.tsx` — Shows how the existing extraction was done: inline types, self-contained state, fetch with credentials
- `src/components/admin-navbar.tsx` — Existing admin component in components directory

### Conventions
- `.planning/codebase/CONVENTIONS.md` — Project conventions including fetch patterns, function style

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/admin-accounts-panel.tsx`: Already extracted, serves as pattern reference for how tabs self-contain their types and state
- `src/components/admin-navbar.tsx`: Existing admin shared component

### Established Patterns
- All 31 fetch calls use `credentials: "include"` and JSON parse with `.catch(() => null)`
- Every mutation follows: fetch -> parse JSON -> check `data?.ok` -> show error or success
- Types defined inline at top of page.tsx (no external type files)
- Zero custom hooks in codebase — utility functions preferred over hook abstractions
- `"use client"` directive on page.tsx

### Integration Points
- New `src/components/admin/types.ts` will be imported by page.tsx immediately (replacing inline types)
- New `adminFetch` utility will be imported by page.tsx to replace raw fetch calls
- Phase 2 tab components will import from both files

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the extraction mechanics.

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope.

</deferred>

---

*Phase: 01-shared-foundation*
*Context gathered: 2026-04-08*
