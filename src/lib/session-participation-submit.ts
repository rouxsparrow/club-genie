type PlayerRecord = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

type SessionParticipant = {
  session_id: string;
  player: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
};

export type ParticipationDiff = {
  toJoin: string[];
  toWithdraw: string[];
  guestChanged: boolean;
  hasChanges: boolean;
};

function normalizePlayerIds(playerIds: string[]) {
  const unique = new Set<string>();
  for (const rawId of playerIds) {
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id) continue;
    unique.add(id);
  }
  return Array.from(unique);
}

export function computeParticipationDiff(
  selectedPlayerIds: string[],
  joinedPlayerIds: string[],
  guestCount: number,
  initialGuestCount: number
): ParticipationDiff {
  const normalizedSelected = normalizePlayerIds(selectedPlayerIds);
  const normalizedJoined = normalizePlayerIds(joinedPlayerIds);
  const selectedSet = new Set(normalizedSelected);
  const joinedSet = new Set(normalizedJoined);

  const toJoin = normalizedSelected.filter((id) => !joinedSet.has(id));
  const toWithdraw = normalizedJoined.filter((id) => !selectedSet.has(id));
  const guestChanged = guestCount !== initialGuestCount;

  return {
    toJoin,
    toWithdraw,
    guestChanged,
    hasChanges: toJoin.length > 0 || toWithdraw.length > 0 || guestChanged
  };
}

export function buildParticipationUpdatePayload(sessionId: string, selectedPlayerIds: string[], guestCount: number) {
  return {
    sessionId,
    playerIds: normalizePlayerIds(selectedPlayerIds),
    guestCount
  };
}

export function buildSelectedParticipantRows(
  sessionId: string,
  players: PlayerRecord[],
  selectedPlayerIds: string[]
): SessionParticipant[] {
  const selectedSet = new Set(normalizePlayerIds(selectedPlayerIds));
  return players
    .filter((player) => selectedSet.has(player.id))
    .map((player) => ({
      session_id: sessionId,
      player: { id: player.id, name: player.name, avatar_url: player.avatar_url ?? null }
    }));
}

export function replaceParticipantsForSession(
  participants: SessionParticipant[],
  sessionId: string,
  nextParticipants: SessionParticipant[]
) {
  return [...participants.filter((entry) => entry.session_id !== sessionId), ...nextParticipants];
}

