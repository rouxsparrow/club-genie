# Phase 1: Shared Foundation - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-08
**Phase:** 01-Shared Foundation
**Mode:** assumptions
**Areas analyzed:** Shared Types Scope, Utility Design, Accounts Panel, Shared Formatters

## Assumptions Presented

### Shared Types Scope
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Only cross-tab types in types.ts (TabKey, Player, RunHistory*, email types); tab-specific types stay in tab files | Likely | page.tsx lines 16-210, Player used by Players + Splitwise tabs, RunHistory* used by Automation + Splitwise |

### Utility Design
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Generic adminFetch utility function (not hook) wrapping fetch+parse+ok pattern | Likely | 31 fetch calls with same pattern, zero custom hooks in codebase, conventions.md |

### Accounts Panel
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Move admin-accounts-panel.tsx to src/components/admin/accounts-tab.tsx in Phase 1 | Unclear | Panel already self-contained, but COMP-05 mapped to Phase 2 |

### Shared Formatters
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Extract formatDuration and summary formatters as shared pure functions | Confident | formatDuration used by both Automation and Splitwise tabs, page.tsx lines 231-256 |

## Corrections Made

### Accounts Panel
- **Original assumption:** Move accounts panel to src/components/admin/ in Phase 1 as proof of concept
- **User correction:** Leave it until Phase 2
- **Reason:** COMP-05 is mapped to Phase 2. Phase 1 should stay focused on types and utilities only.

## External Research

No external research needed — codebase provides sufficient evidence.
