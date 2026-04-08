# Requirements: Club Genie Admin Refactor

**Defined:** 2026-04-08
**Core Value:** Every admin tab is an independent component with its own state, API calls, and logic — so changing one tab never risks breaking another.

## v1 Requirements

### Component Extraction

- [ ] **COMP-01**: Players tab extracted into `src/components/admin/players-tab.tsx` with own state and API calls
- [ ] **COMP-02**: Club Access tab extracted into `src/components/admin/club-access-tab.tsx` with own state and API calls
- [ ] **COMP-03**: Automation tab extracted into `src/components/admin/automation-tab.tsx` with own state and API calls
- [ ] **COMP-04**: Splitwise tab extracted into `src/components/admin/splitwise-tab.tsx` with own state and API calls
- [ ] **COMP-05**: Accounts tab migrated to `src/components/admin/accounts-tab.tsx` (building on existing `admin-accounts-panel.tsx`)
- [ ] **COMP-06**: Emails tab extracted into `src/components/admin/emails-tab.tsx` with own state and API calls

### Shell Reduction

- [ ] **SHELL-01**: Admin page.tsx reduced to a thin composition shell (tab routing + component mounting)
- [x] **SHELL-02**: Shared types extracted into `src/components/admin/types.ts`
- [x] **SHELL-03**: Shared admin utilities (common fetch patterns, error handling) extracted into reusable hooks

### Behavior Parity

- [ ] **PARITY-01**: All Players tab operations work identically after extraction
- [ ] **PARITY-02**: All Club Access tab operations work identically after extraction
- [ ] **PARITY-03**: All Automation tab operations work identically after extraction
- [ ] **PARITY-04**: All Splitwise tab operations work identically after extraction
- [ ] **PARITY-05**: All Accounts tab operations work identically after extraction
- [ ] **PARITY-06**: All Emails tab operations work identically after extraction
- [ ] **PARITY-07**: Tab navigation and URL state preserved

## v2 Requirements

### UX Improvements

- **UX-01**: Toast notification system for action feedback
- **UX-02**: Error boundaries per tab so one crash doesn't kill the page
- **UX-03**: Dashboard/overview tab with summary stats

### Code Quality

- **QUAL-01**: Shared validation utilities (replace inline `as` casts)
- **QUAL-02**: Centralized admin API client with consistent error handling

## Out of Scope

| Feature | Reason |
|---------|--------|
| New admin features | Scope containment — refactor first, features after |
| Visual redesign | Separate project — keep current design |
| API route refactoring | Server-side code works fine, only client changes |
| State management library | Over-engineering for per-tab state |
| Component library (shadcn, etc.) | Adds dependency without clear benefit for refactor |
| Member sessions page | Not part of admin |
| Edge function changes | Only client-side refactor |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-02 | Phase 1 | Complete |
| SHELL-03 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 2 | Pending |
| PARITY-01 | Phase 2 | Pending |
| PARITY-02 | Phase 2 | Pending |
| PARITY-03 | Phase 2 | Pending |
| PARITY-04 | Phase 2 | Pending |
| PARITY-05 | Phase 2 | Pending |
| PARITY-06 | Phase 2 | Pending |
| SHELL-01 | Phase 3 | Pending |
| PARITY-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-07 after roadmap creation*
