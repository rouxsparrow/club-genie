# Join / Withdraw Rules (Draft)

## Join
- Only OPEN sessions are joinable.
- A join request can include 1+ players.
- Reject duplicate player registrations for the same session.
- Reject unknown or inactive players.

## Withdraw
- Only OPEN sessions can be withdrawn from.
- Withdraw removes the player(s) from `session_participants`.
- If a player is not registered, treat as no-op.

## Validation
- Require `sessionId` and `playerIds` array.
- Enforce max players per session (TBD).
- Enforce cutoff time (TBD).
