# [Project Name]

## What This Is

Briefly describe the product in 2-4 sentences.

Include:
- Who it is for
- What problem it solves
- Main workflow
- Important domain/context constraints

Example:
A private household finance analyzer that imports bank statement PDFs, categorizes transactions, and shows spending analytics for household members.

---

## Core Value

Describe the main value in one sentence.

Example:
Users can understand where their money goes by importing statements, auto-categorizing transactions, and viewing spending breakdowns over time.

---

## Current Milestone

**Milestone:** [vX.X Milestone Name]  
**Goal:** Briefly describe what this milestone is trying to improve or deliver.

### Target Features

- 
- 
- 
- 

---

## Requirements Summary

### Validated

Keep only major validated capabilities, not every tiny requirement.

- ✓ **AUTH**: Users can log in and access the app based on role.
- ✓ **IMPORT**: Admin can import supported statement files.
- ✓ **CATEGORIZATION**: Transactions can be categorized using editable rules.
- ✓ **ANALYTICS**: Users can view spending summaries and breakdowns.
- ✓ **INFRA**: Core platform, database, auth, and UI foundation are in place.

### Active

Current milestone requirements only.

- [ ] 
- [ ] 
- [ ] 
- [ ] 

### Future

Important but not in the current milestone.

- 
- 
- 

---

## Out of Scope

| Feature | Reason |
|---|---|
|  |  |
|  |  |
|  |  |

---

## Context

### Product Context

- **Users:** 
- **Primary workflow:** 
- **Region / domain:** 
- **Currency / locale:** 
- **Known data sources:** 

### Current State

- **Shipped version:** 
- **Current milestone:** 
- **Known gaps entering this milestone:** 
- **Main risk areas:** 

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend |  |
| Backend |  |
| Database |  |
| Auth |  |
| Hosting |  |
| UI |  |
| Charts |  |
| State / URL State |  |
| Other |  |

---

## Constraints

Project constraints the Agent must respect.

- 
- 
- 
- 

Example:
- Currency is SGD only for v1.
- Manual PDF import is the current workflow.
- Do not introduce bank sync unless explicitly requested.
- Keep current role model unless milestone scope changes.

---

## Key Decisions

Only keep decisions that still affect future work.  
Put detailed historical notes elsewhere, because apparently documents are not supposed to become archaeological sites.

| Decision | Rationale | Current Status |
|---|---|---|
|  |  | Active |
|  |  | Active |
|  |  | Revisit Later |

---

## Important Rules

Reusable business or technical rules that future Agent sessions must not accidentally break.

- 
- 
- 
- 

Example:
- Rules are evaluated top-to-bottom.
- First matching rule wins.
- Card payments are excluded from spending analytics.
- Viewers can read analytics but cannot perform admin actions.

---

## Linked Docs

| Topic | File |
|---|---|
| Requirements | `.planning/REQUIREMENTS.md` |
| Current state | `.planning/state.md` |
| Feature docs | `docs/features/` |
| Data model | `docs/data-model.md` |
| Setup / deployment | `docs/runbooks/` |
| Agent rules | `AGENTS.md` |

---

## Evolution Rules

Update this document only at major transition points:

- Milestone kickoff
- Milestone completion
- Major scope change
- Major technical decision
- Core product direction change

Do not update this file for:
- Tiny UI changes
- Copy changes
- Small bug fixes
- Internal refactors that do not change product behavior

When updating this document:

1. Check whether `What This Is` is still accurate.
2. Check whether `Core Value` still reflects the product.
3. Move completed milestone capabilities into `Validated`.
4. Move deferred items into `Future` or `Out of Scope`.
5. Add only important decisions to `Key Decisions`.
6. Keep details in feature docs, requirements docs, or phase summaries instead of dumping everything here like a landfill with headings.

---

*Last updated: YYYY-MM-DD*