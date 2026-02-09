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
