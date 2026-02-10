# Agent Rules

## Read First
- `SPEC.md` is the single source of truth for requirements.
- `TASKS.md` tracks work and sequencing.
- `DECISIONS.md` records architecture and product decisions.

## Minimal-Diff Rule
- Prefer small, focused edits over sweeping refactors.
- Avoid reformatting unrelated files.

## Spec/Decision Update Rule
- If behavior or scope changes, update `SPEC.md`.
- If architecture or integration choices change, add an ADR in `DECISIONS.md`.

## Test-On-Change Rule
- Any functional change requires a test or explicit test rationale in `TASKS.md`.

## Folder Ownership
- `src/`: application code and shared utilities.
- `docs/`: architecture, security, and release process.
- `.github/`: contribution templates and workflow conventions.
- `tests/`: automated tests and fixtures.

## Execution Guidelines
- Milestone-first execution; small slices with proof.
- No runtime tokens in env files; only config in `.env.local`.
- For Edge Functions: keep Supabase Authorization/JWT separate from app-level tokens.
- Use inline variables for local testing (e.g. `CLUB_TOKEN=...` command) instead of telling user to edit env.
- If you change env contract (`.env.example`), explain why in the PR-style summary.

## Approval & Permissions
- When a terminal command may require permission, run it and rely on the editor approval prompt.
- Do not ask the user in chat to confirm terminal execution.
- Only ask in chat for missing information (tokens, credentials, external account actions).
- After running commands, paste the command and resulting output in the slice summary.
-------------------------
## Codex Response template
-------------------------
# Codex Change Report

## 1) Outcome (1–3 lines)
- Goal:
- Result:
- Risk level: Low / Medium / High (why in 1 line)

## 2) What Changed (structured)
### A) Behavior / Logic Changes
- [Change] → [Why] → [Impact]
- …

### B) Non-behavior Changes (refactor / formatting / comments)
- [Change] → [Why]
- …

### C) Breaking / Compatibility Notes (if any)
- [What breaks] → [Who impacted] → [Mitigation]
- If none: None

## 3) Files Touched (always complete list)
> One line per file. No duplicates. No bare filenames.
- `path/to/file.ext` — reason (what changed + why)
- …

## 4) Data / Schema / Config Impact
### Database migrations
- Migration(s): [name(s)]
- Command(s): `npx prisma migrate ...` / `supabase db ...`
- If none: **No migrations required**

### Secrets / Env vars
- Added:
- Changed:
- Required locally:
- Required in prod:
- If none: None

### External setup required (mandatory callout)
- Supabase dashboard steps / Vercel env updates / new buckets / RLS policies
- If none: None

## 5) Validation Evidence (must be reproducible)
### Automated
- Tests run:
  - `npm test` → PASS/FAIL (+ counts if available)
  - `npm run lint` → PASS/FAIL
- If not run: Explicit reason + what to run

### Manual
- Steps executed:
  1.
  2.
- Observed results (paste key outputs / status codes):
  - …
- If not done: Explicit reason + steps to validate

## 6) Acceptance Criteria (pass/fail)
- AC1: [observable condition] — PASS/FAIL — evidence: [link/log/output]
- AC2: …
- If any FAIL: list follow-ups

## 7) Edge Cases Checked
- Case:
- Result:
- If none: Explicitly state “Not checked” + why

## 8) Next Actions / Follow-ups
- [Owner: Codex/User] [Priority: P0/P1/P2] [Due: optional] — action
- …

---

# Mandatory Summary (always at the end)
## Files changed (with brief reasons)
- …

## Database migrations
- **No migrations required** / [list + commands]

## Documentation updates
- `Agents.md` updated: Yes/No — reason
- `[OtherDoc].md` updated: Yes/No — reason
- If none: “No documentation updates (behavior unchanged)”

