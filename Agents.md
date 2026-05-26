# AGENTS.md

## Purpose

This repo uses a Markdown-based planning system for Codex agent execution.

The agent must plan and execute MVP work using the documentation structure inside `.docs/`.

The goal is to turn product requirements into well-scoped implementation tasks, grouped by phases and parallel waves, with enough context for each fresh executor to work safely without needing hidden chat history.

The agent must also choose the lightest safe workflow for each coding task. Not every change deserves a full ceremony, a planning saga, and a memorial plaque.

---

## Core Operating Principle

Use the lightest workflow that safely completes the task.

Classify every coding or implementation request as one of:

- Level 0: Tiny Fix
- Level 1: Small Scoped Change
- Level 2: Feature / Medium Change
- Level 3: High Risk / Architecture / DB Change

The agent must not use the full MVP planning process for every small change.

The agent must inspect before editing.

The agent must not claim verification was done unless the command actually ran.

The agent must prefer action over essays.

---

## Documentation Structure

The canonical documentation folder is:

    .docs/
      PROJECT.md
      REQUIREMENTS.md
      STATE.md
      .tasks/
        TASK-TEMPLATE.md
        .phase-1/
          TASK-001.md
          TASK-002.md
        .phase-2/
          TASK-003.md
          TASK-004.md

Use these files as the source of truth:

| File | Purpose |
|---|---|
| `.docs/PROJECT.md` | Product overview, core value, tech stack, constraints, key decisions |
| `.docs/REQUIREMENTS.md` | MVP/current requirements, future requirements, out-of-scope items, traceability |
| `.docs/STATE.md` | Current project state, current focus, progress, blockers, resume notes |
| `.docs/.tasks/TASK-TEMPLATE.md` | Required task format for implementation tasks |
| `.docs/.tasks/.phase-X/` | Phase-specific task folders |

Do not create a separate planning system unless explicitly requested.

Do not move or rename `.docs`, `.docs/.tasks`, or the core docs unless explicitly requested.

---

## Required Agent Workflow

Before planning or coding, inspect the relevant files for the task.

For MVP planning or task generation, inspect:

    .docs/PROJECT.md
    .docs/REQUIREMENTS.md
    .docs/STATE.md
    .docs/.tasks/TASK-TEMPLATE.md

Then classify the request as one of:

1. Planning only
2. Task generation
3. Implementation
4. Audit / verification
5. Documentation update

Then classify coding complexity as:

1. Level 0: Tiny Fix
2. Level 1: Small Scoped Change
3. Level 2: Feature / Medium Change
4. Level 3: High Risk / Architecture / DB Change

Use the lightest safe workflow.

Do not over-plan tiny changes.

Do not skip planning for MVP-building work.

---

## Workflow Levels

### Level 0: Tiny Fix

Use this for:

- Typo fixes
- Label or text changes
- Small UI class changes
- Copy, modal, or message changes
- Icon, color, or spacing tweaks
- A change with clear file and clear requirement
- A small single-file adjustment with low regression risk

Workflow:

1. Inspect the relevant file.
2. Edit only the required change.
3. Run a quick check if reasonable.
4. Report briefly.

Do not require:

- Long discussion
- Detailed planning
- Acceptance criteria expansion
- Architecture analysis
- Task file generation unless explicitly requested

Output:

    ## Tiny Fix Complete

    ### Changed

    - Short summary

    ### Files Touched

    - `path/to/file`

    ### Verification

    - `command`: Pass
    - Or: Not run, with reason

---

### Level 1: Small Scoped Change

Use this for:

- Adding one UI field
- Small behavior change
- Updating one component
- Simple validation change
- Simple filter or sort
- Task affects roughly 1-3 files
- Low-to-medium regression risk

Workflow:

1. Clarify only if blocking.
2. Inspect relevant files.
3. Make a short plan, maximum 3-5 bullets.
4. Implement.
5. Run lint, typecheck, or relevant test if available.
6. Report concisely.

Output:

    ## Small Change Complete

    ### Summary

    - What changed

    ### Files Changed

    - `path/to/file`

    ### Verification

    - `command`: Pass
    - Or: Not run, with reason

    ### Notes

    - Any limitation or follow-up, if needed

---

### Level 2: Feature / Medium Change

Use this for:

- New feature
- Flow with multiple states
- UI + API change
- Logic affecting multiple areas
- DB/model impact
- Possible regression risk
- Work that likely touches more than 3 files
- Work that should be represented in `.docs` or task files

Workflow:

1. Discuss requirement briefly.
2. Inspect codebase and relevant docs.
3. Plan implementation.
4. Identify data/model impact.
5. Implement.
6. Run verification.
7. Report clearly.
8. Update `.docs`, `AGENTS.md`, or task files if behavior/process/project knowledge changed.

Output:

    ## Feature Complete

    ### Requirement Summary

    - What was implemented

    ### Implementation Plan

    - What approach was used

    ### Files Changed

    - `path/to/file`

    ### Verification

    - `command`: Pass

    ### Required Setup / Migration

    - None
    - Or list commands required

    ### Known Limitations

    - None
    - Or list limitation

---

### Level 3: High Risk / Architecture / DB Change

Use this for:

- Prisma schema change
- Database migration
- Auth, security, or permission changes
- Payment or billing changes
- Scheduling algorithm changes
- Ranking or scoring logic changes
- Data import/export
- Large refactor
- Production bug with unclear root cause
- Any change where data loss or security regression is possible

Workflow:

1. Discuss the problem and expected behavior.
2. Inspect deeply.
3. Propose a plan before editing.
4. Confirm assumptions only if truly blocking.
5. Implement carefully.
6. Run full verification.
7. Document migration/setup requirements.
8. Update `AGENTS.md`, `.docs`, or task files if needed.
9. Final report with risks.

Output:

    ## High-Risk Change Complete

    ### Problem Understanding

    - What was wrong or needed

    ### Risk Areas

    - Data/security/regression risks considered

    ### Plan

    - What was done

    ### Files Changed

    - `path/to/file`

    ### Migration / Setup Commands

    - `command`
    - Or: None

    ### Verification

    - `command`: Pass

    ### Remaining Risks

    - None
    - Or list risks

---

## Workflow Selection Rules

Use Level 0 when the task is obvious, small, and safe.

Use Level 1 when the task is scoped but requires a tiny plan.

Use Level 2 when the task introduces a feature or touches a flow.

Use Level 3 when the task touches architecture, database, auth, security, scoring, scheduling, imports, payments, or unclear production bugs.

If unsure between two levels, choose the higher level only when the risk justifies it.

Do not escalate workflow level just to look professional. Token bonfires are not engineering.

---

## Token-Saving Rules

Do not over-explain.

Default to concise.

For most Level 0-1 tasks, use:

- 3 bullet plan max
- 3 bullet report max

No ceremony for obvious tasks.

If the task is obvious and low risk:

1. Inspect
2. Edit
3. Report

Do not write long theory unless asked.

Spend tokens reading and editing code, not performing a TED Talk about software craftsmanship.

---

## Clarification Rules

Ask fewer questions.

Only ask clarification if:

- The requirement is impossible to infer
- Multiple interpretations would cause the wrong implementation
- Data loss is possible
- Security impact is possible
- DB/schema impact is possible
- The requested behavior conflicts with existing requirements

Do not ask for confirmation when a reasonable safe assumption can be made.

If an assumption is made, state it briefly in the report.

---

## Inspection Rules

Never skip inspection before editing.

Before editing, inspect:

- The file directly affected
- Nearby related files
- Any relevant requirement or task file
- Any existing pattern that should be followed

For Level 0-1, inspect only what is needed.

For Level 2-3, inspect broader flows, dependencies, and docs.

---

## Verification Rules

Each implementation must run the lightest meaningful verification available.

Preferred verification examples:

    npm run lint
    npm run typecheck
    npm run build
    npm test
    npx tsc --noEmit

Use the actual project scripts.

Do not invent commands that do not exist.

If a command fails because the project lacks that script, report it clearly and use an appropriate available command.

If verification cannot be completed, state:

- What was attempted
- Why it failed
- Whether the implementation is still safe
- What follow-up is needed

No “looks good” based on vibes. Vibes are not CI.

---

## Documentation Update Rules

Update docs only when the task changes reusable project knowledge.

Update `.docs/PROJECT.md` for:

- Product direction changes
- Core value changes
- Tech stack changes
- Constraints
- Major decisions

Update `.docs/REQUIREMENTS.md` for:

- Requirement status changes
- New requirements
- Deferred requirements
- Traceability changes

Update `.docs/STATE.md` for:

- Current progress
- Resume context
- Blockers
- Last completed task
- Next task

Update task files for:

- Status
- Completion notes
- Commit hash
- Verification result
- Known follow-up

Update `AGENTS.md` when:

- Agent workflow changes
- Planning process changes
- Execution rules change
- Verification rules change
- Documentation rules change
- The user explicitly asks to update agent behavior

Do not update docs for tiny implementation details unless they affect future work.

Do not document tiny UI tweaks unless they affect reusable project knowledge.

---

## MVP Planning Workflow

When asked to create a plan to build the MVP, the agent must:

1. Read `.docs/PROJECT.md`
2. Read `.docs/REQUIREMENTS.md`
3. Read `.docs/STATE.md`
4. Read `.docs/.tasks/TASK-TEMPLATE.md`
5. Identify MVP scope
6. Separate requirements into implementation phases
7. Create one folder per phase under `.docs/.tasks/`
8. Create small executable task files inside each phase folder
9. Assign tasks to safe parallel waves
10. Ensure each task can be completed by a fresh executor with a 200k-token context
11. Ensure each task maps to one atomic commit
12. Update `.docs/STATE.md` with planning status
13. Update requirement traceability in `.docs/REQUIREMENTS.md` if needed

The plan must be implementation-oriented, not abstract strategy fluff.

---

## Phase Folder Rules

Each phase must have its own folder under `.docs/.tasks/`.

Use this naming pattern:

    .docs/.tasks/.phase-N/

Examples:

    .docs/.tasks/.phase-1/
    .docs/.tasks/.phase-2/
    .docs/.tasks/.phase-3/

Optional descriptive names are allowed if used consistently:

    .docs/.tasks/.phase-1-foundation/
    .docs/.tasks/.phase-2-core-workflow/
    .docs/.tasks/.phase-3-analytics/

Each phase folder should contain small task files:

    TASK-001.md
    TASK-002.md
    TASK-003.md

Task filenames may include a short slug:

    TASK-001-project-setup.md
    TASK-002-auth-shell.md
    TASK-003-database-schema.md

Keep filenames stable after creation.

---

## Phase Planning Rules

Each phase must represent a meaningful delivery slice.

Good phases:

- Foundation / setup
- Auth / access control
- Core data model
- Main user workflow
- Admin management
- Analytics / reporting
- Hardening / QA / polish

Bad phases:

- Random files grouped together
- One giant “build everything” phase
- One task per requirement with no execution order
- A phase that cannot be tested or committed meaningfully

Each phase may include a short phase overview:

    # Phase N: [Name]

    ## Goal

    ## Requirements Covered

    ## Parallel Waves

    ## Dependencies

    ## Verification Focus

---

## Parallel Wave Rules

Phases can run in parallel waves when dependencies allow.

A wave is a group of tasks that can be executed independently.

Example:

    ## Parallel Waves

    ### Wave 1

    Can run immediately:

    - TASK-001: Project setup
    - TASK-002: UI shell
    - TASK-003: Database schema draft

    ### Wave 2

    Can run after Wave 1:

    - TASK-004: Auth integration
    - TASK-005: CRUD screens

    ### Wave 3

    Can run after Wave 2:

    - TASK-006: End-to-end workflow
    - TASK-007: Verification and polish

Rules:

- Tasks in the same wave must not modify the same files unless explicitly justified.
- Tasks in the same wave must not depend on each other’s uncommitted changes.
- If two tasks may conflict, place them in different waves.
- Shared foundation work must happen in an earlier wave.
- Integration work must happen after parallel implementation tasks.
- Each task must clearly state its dependencies.
- Each task must clearly state its wave number.

Do not pretend tasks are parallel just because parallelism sounds productive. That is how merge conflicts become a lifestyle choice.

---

## Task Generation Rules

Every implementation task must be created using:

    .docs/.tasks/TASK-TEMPLATE.md

The agent must inspect the template before creating tasks.

Do not invent a new task format when the template exists.

Each task must be:

- Small
- Executable
- Independently understandable
- Assigned to one phase
- Assigned to one wave
- Linked to requirement IDs
- Clear about files likely to change
- Clear about files to read first
- Clear about acceptance criteria
- Clear about verification commands
- Suitable for one atomic commit

A task is too large if:

- It touches too many unrelated areas
- It mixes schema, UI, API, and polish without need
- It cannot be described in one clear objective
- It requires multiple unrelated commits
- It would be risky for a fresh executor to complete in one pass

Split oversized tasks.

---

## Task File Requirements

If `.docs/.tasks/TASK-TEMPLATE.md` defines a structure, follow it exactly.

The template wins over this fallback structure.

If the template is incomplete, each task file must include at minimum:

    # TASK-XXX: [Task Name]

    ## Status

    planned

    ## Phase

    Phase N: [Name]

    ## Wave

    Wave N

    ## Type

    planning | implementation | verification | documentation | refactor | bugfix

    ## Depends On

    - TASK-XXX

    ## Requirements

    - REQ-XXX

    ## Objective

    ## Read First

    - `.docs/PROJECT.md`
    - `.docs/REQUIREMENTS.md`
    - `.docs/STATE.md`
    - `path/to/relevant-file`

    ## Files Expected to Change

    - `path/to/file`

    ## Scope

    ## Out of Scope

    ## Implementation Notes

    ## Acceptance Criteria

    - [ ]

    ## Verification

    - `npm run lint`
    - `npm run typecheck`

    ## Commit Instructions

    Suggested commit message:

    feat(scope): short description

    ## Completion Summary

    To be filled after execution.

---

## Fresh Executor Context Rule

Each task executor starts with a fresh 200k-token context.

Every task file must include enough information for the executor to work without relying on hidden prior chat context.

Each task must explicitly include:

- Relevant requirement IDs
- Phase name
- Wave number
- Dependencies
- Required docs to read first
- Relevant source files to inspect
- Expected behavior
- Acceptance criteria
- Verification commands
- Commit expectation
- Summary/update expectation if applicable

Do not write tasks that say “continue previous work” without linking the exact files and expected state.

The executor is fresh, not psychic.

---

## Atomic Commit Rule

Each task must result in one atomic commit.

The commit should contain only the changes required for that task.

Do not mix unrelated work into the same commit.

Do not sneak in refactors, formatting sweeps, dependency upgrades, or opportunistic rewrites.

Each task file must include a suggested commit message:

    type(scope): short description

Examples:

    feat(auth): add email password login shell
    feat(import): add statement upload flow
    fix(rules): prevent invalid regex save
    docs(planning): add MVP phase task breakdown

After completing a task, the executor must report:

- Commit hash
- Files changed
- Verification commands run
- Verification result
- Any follow-up tasks or blockers

Do not claim an atomic commit exists unless the commit was actually created.

---

## Requirement Traceability Rules

Every task must map back to one or more requirement IDs from:

    .docs/REQUIREMENTS.md

If a requirement is too large, split it across multiple tasks and note that clearly.

If a task supports infrastructure or setup and has no direct user-facing requirement, use an internal requirement ID such as:

    INFR-XX

Do not create orphan tasks without requirement linkage unless explicitly justified.

When planning is complete, update the traceability section in `.docs/REQUIREMENTS.md` if it exists.

Traceability should show:

| Requirement | Phase | Task | Status |
|---|---|---|---|
| REQ-001 | Phase 1 | TASK-001 | Planned |

---

## State Update Rules

Update `.docs/STATE.md` after:

- MVP planning is created
- A phase starts
- A phase completes
- A task completes
- A blocker is discovered
- A meaningful pause happens

`.docs/STATE.md` should remain concise.

It should answer:

1. Where are we now?
2. What was completed?
3. What is next?
4. What is blocked?
5. Which files should the next executor read first?

Do not dump full task history into `STATE.md`.

Use task files, task summaries, and commits for detailed history.

For Level 0 tiny fixes, update `.docs/STATE.md` only if the change affects project state or future executor context.

---

## Planning Output Rules

When generating MVP planning, the agent must create or update:

    .docs/STATE.md
    .docs/REQUIREMENTS.md
    .docs/.tasks/.phase-N/
    .docs/.tasks/.phase-N/TASK-XXX.md

The agent may update:

    .docs/PROJECT.md

Only update `.docs/PROJECT.md` when the product overview, core value, constraints, milestone, or key decisions change.

Do not update `.docs/PROJECT.md` for small task-level details.

---

## Implementation Rules

Before implementation, the executor must:

1. Classify the task as Level 0, 1, 2, or 3.
2. Read the assigned task file if one exists.
3. Read `.docs/PROJECT.md`, `.docs/REQUIREMENTS.md`, and `.docs/STATE.md` when the task is Level 2 or Level 3, or when task context requires it.
4. Read all files listed under `Read First` if working from a task file.
5. Confirm dependencies are complete if working from a task file.
6. Implement only the task scope.
7. Run appropriate verification commands.
8. Create one atomic commit when the task is part of the task system or explicitly requires a commit.
9. Update task completion summary when working from a task file.
10. Update `.docs/STATE.md` when project state meaningfully changes.
11. Report commit hash, files changed, and verification results when a commit is created.

The executor must not:

- Implement future requirements
- Change unrelated files
- Refactor unrelated code
- Rename requirement IDs
- Modify phase structure without reason
- Skip verification silently
- Claim tests passed if they were not run
- Create multiple commits for one task unless the task explicitly allows it
- Use Level 2 or Level 3 workflow for tiny changes unless risk requires it

---

## Status Values

Use consistent lowercase status values:

    planned
    in_progress
    blocked
    complete
    skipped
    deferred

Use the same lowercase format across task files and `.docs/STATE.md`.

---

## Task Status Lifecycle

Each task should move through:

    planned -> in_progress -> complete

Or:

    planned -> blocked
    planned -> deferred
    planned -> skipped

When blocking a task, include:

- Blocker
- Impact
- Required decision or dependency
- Suggested next step

---

## Parallel Execution Safety

For parallel task waves:

- Avoid overlapping file ownership.
- Put shared foundation work in earlier waves.
- Put integration work after parallel implementation tasks.
- Use atomic commits to reduce merge complexity.
- Rebase or merge latest main before starting a task if needed.
- Re-run verification after resolving conflicts.

If two tasks need the same file, the phase planner should either:

1. Put them in separate waves, or
2. Split out the shared change into an earlier foundation task.

Do not create parallel tasks that fight over the same component.

---

## Commit Message Rules

Use conventional commit style where possible:

    feat(scope): description
    fix(scope): description
    docs(scope): description
    refactor(scope): description
    test(scope): description
    chore(scope): description

Examples:

    docs(planning): add MVP task breakdown
    feat(auth): implement login page
    feat(import): parse statement transactions
    fix(categories): exclude card payments from dashboard stats

Each task must include its expected commit message.

For Level 0-1 tasks outside the task system, create a commit only if explicitly asked or if the workflow requires it.

---

## Summary Rules

After each task completes, create or update a completion summary in the task file.

Minimum summary:

    ## Completion Summary

    **Status:** complete
    **Commit:** abc1234
    **Completed At:** YYYY-MM-DD

    ### What Changed

    -

    ### Files Changed

    -

    ### Verification

    | Command | Result |
    |---|---|
    | `npm run lint` | Pass |

    ### Follow-ups

    - None

If the task template defines a different summary format, use the template.

For Level 0-1 tasks that are not formal task files, keep the final report short.

---

## Agent Planning Checklist

When asked to plan the MVP, complete this checklist:

- [ ] Read `.docs/PROJECT.md`
- [ ] Read `.docs/REQUIREMENTS.md`
- [ ] Read `.docs/STATE.md`
- [ ] Read `.docs/.tasks/TASK-TEMPLATE.md`
- [ ] Identify MVP requirements
- [ ] Group requirements into phases
- [ ] Assign phase dependencies
- [ ] Assign parallel waves
- [ ] Create phase folders
- [ ] Create task files from the template
- [ ] Ensure every task has requirement traceability
- [ ] Ensure every task has read-first context
- [ ] Ensure every task has acceptance criteria
- [ ] Ensure every task has verification commands
- [ ] Ensure every task maps to one atomic commit
- [ ] Update `.docs/STATE.md`
- [ ] Update `.docs/REQUIREMENTS.md` traceability if needed

---

## Agent Execution Checklist

When executing a formal task, complete this checklist:

- [ ] Classify task level
- [ ] Read assigned task file
- [ ] Read `.docs/PROJECT.md`
- [ ] Read `.docs/REQUIREMENTS.md`
- [ ] Read `.docs/STATE.md`
- [ ] Read all `Read First` files
- [ ] Confirm dependencies are complete
- [ ] Implement only the scoped change
- [ ] Run verification commands
- [ ] Fix issues caused by the task
- [ ] Create one atomic commit
- [ ] Update task completion summary
- [ ] Update `.docs/STATE.md`
- [ ] Report commit hash, files changed, and verification results

---

## Non-Negotiables

- Use `.docs` as the planning root.
- Use `.docs/.tasks/TASK-TEMPLATE.md` for all formal task files.
- Divide MVP requirements into phases.
- Put each phase in its own folder.
- Break phases into small executable tasks.
- Assign tasks to parallel waves where safe.
- Each executor gets fresh context, so each task must be self-contained.
- Each formal task maps to one atomic commit.
- Use the lightest workflow that safely completes the task.
- Classify coding tasks as Level 0, 1, 2, or 3.
- Never skip inspection before editing.
- Do not skip verification silently.
- Do not claim success without evidence.
- Do not claim verification was done unless commands actually ran.
- Do not expand scope without updating requirements.
- Do not create unnecessary docs.
- Prefer updating existing docs over scattering new files.
- Ask clarification only when needed to avoid wrong implementation, data loss, security issues, or DB/schema mistakes.

---

## Suggested MVP Planning Behavior

When the user says something like:

    Create MVP planning
    Plan the MVP
    Generate tasks from requirements
    Break this into phases

The agent should:

1. Inspect the `.docs` files.
2. Generate a phase plan.
3. Create phase folders under `.docs/.tasks/`.
4. Create task files using `.docs/.tasks/TASK-TEMPLATE.md`.
5. Update `.docs/STATE.md`.
6. Update `.docs/REQUIREMENTS.md` traceability.
7. Report what was created and what the first executable task is.

Do not ask for confirmation unless a blocking ambiguity would cause the wrong MVP to be planned.

---

## Recommended Phase Structure

Use this only as a default. Adjust based on `.docs/REQUIREMENTS.md`.

    Phase 1: Foundation
    Phase 2: Core Data Model
    Phase 3: Primary User Workflow
    Phase 4: Management / Admin UX
    Phase 5: Analytics / Reporting
    Phase 6: Hardening / QA / Polish

Example:

    .docs/.tasks/.phase-1-foundation/
      TASK-001-project-setup.md
      TASK-002-layout-and-navigation.md
      TASK-003-auth-foundation.md

    .docs/.tasks/.phase-2-core-data-model/
      TASK-004-database-schema.md
      TASK-005-seed-data.md
      TASK-006-data-access-layer.md

---

## Minimal Final Report Format

After planning:

    ## MVP Planning Created

    ### Phase Folders

    - `.docs/.tasks/.phase-1-foundation/`
    - `.docs/.tasks/.phase-2-core-workflow/`

    ### Tasks Created

    - `TASK-001: ...`
    - `TASK-002: ...`

    ### Requirements Covered

    - `REQ-001`
    - `REQ-002`

    ### Updated Docs

    - `.docs/STATE.md`
    - `.docs/REQUIREMENTS.md`

    ### First Task

    Start with:
    `TASK-001: [name]`

After formal task execution:

    ## Task Complete

    **Task:** TASK-XXX
    **Level:** Level N
    **Commit:** abc1234

    ### Changed

    -

    ### Verification

    - `npm run lint`: Pass
    - `npm run typecheck`: Pass

    ### Follow-up

    - None

After Level 0 tiny fix:

    ## Tiny Fix Complete

    ### Changed

    -

    ### Files Touched

    -

    ### Verification

    -

After Level 1 small scoped change:

    ## Small Change Complete

    ### Summary

    -

    ### Files Changed

    -

    ### Verification

    -

    ### Notes

    -After Level 2 feature / medium change:

    ## Feature Complete

    ### Requirement Summary

    -

    ### Implementation Plan

    -

    ### Files Changed

    -

    ### Verification

    -

    ### Required Setup / Migration

    - None

    ### Known Limitations

    - None

After Level 3 high-risk / architecture / DB change:

    ## High-Risk Change Complete

    ### Problem Understanding

    -

    ### Risk Areas

    -

    ### Plan

    -

    ### Files Changed

    -

    ### Migration / Setup Commands

    - None

    ### Verification

    -

    ### Remaining Risks

    - None