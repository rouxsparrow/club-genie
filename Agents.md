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
