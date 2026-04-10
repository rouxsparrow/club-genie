# Retrospective: Club Genie

## Milestone: v1.0 — Admin Refactor

**Shipped:** 2026-04-10
**Phases:** 3 | **Plans:** 6

### What Was Built

- Shared admin type definitions, `adminFetch`, and formatter helpers.
- Standalone admin tab components for Accounts, Players, Club Access, Automation, Email Preview, and Splitwise.
- A 64-line `/admin` route shell with local active-tab state and keep-mounted panel persistence.
- Verification and UAT artifacts for the final shell reduction and milestone audit.

### What Worked

- Source-level Vitest assertions were effective for locking shell semantics in a repo without a DOM component harness.
- Keep-mounted tab extraction kept user-visible draft and preload behavior stable while moving code out of the route.
- Small phase slices made it possible to catch and fix the Automation preview-message bridge before archiving.

### What Was Inefficient

- Some Phase 2 verification artifacts had to be reconstructed late because they were not created during the original execution.
- The milestone audit was generated before final Phase 03 bookkeeping, so it contained stale planning gaps that needed cleanup.
- GSD tool progress counts treated Phase 2 summary-only plans awkwardly because their plan filenames do not match the later canonical pattern.

### Patterns Established

- Admin tab code lives under `src/components/admin/<tab>-tab.tsx`.
- The admin route owns only mounted state, local active-tab state, visited-tab persistence, and shell composition.
- Cross-tab bridge state should be explicit in the shell helper when a real workflow crosses tab boundaries.

### Key Lessons

- Historical summaries should not claim a cross-tab dependency is intentionally absent if a downstream flow still expects it.
- Browser parity checkpoints need matching verification artifacts before milestone audit, otherwise the audit reads as incomplete even when code works.
- Before archiving, rerun focused tests around any audit-reported flow gap rather than dismissing it as stale planning noise.

## Cross-Milestone Trends

No prior milestones.
