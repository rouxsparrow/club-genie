export function getClubTokenStorageKey() {
  return process.env.NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY ?? "club_token";
}

export function getEdgeFunctionBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return `${baseUrl.replace(/\/$/, "")}/functions/v1`;
}

function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return anonKey;
}

function buildEdgeHeaders(token: string) {
  const anonKey = getSupabaseAnonKey();
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    "x-club-token": token
  } as const;
}

export type ClubTokenValidationResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; status: 403 }
  | { ok: false; reason: "error"; status: number | null };

export async function validateClubTokenDetailed(token: string): Promise<ClubTokenValidationResult> {
  const url = `${getEdgeFunctionBaseUrl()}/validate-token`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: buildEdgeHeaders(token)
    });

    if (response.ok) return { ok: true };
    if (response.status === 403) return { ok: false, reason: "invalid", status: 403 };
    return { ok: false, reason: "error", status: response.status || null };
  } catch {
    return { ok: false, reason: "error", status: null };
  }
}

export async function validateClubToken(token: string) {
  const result = await validateClubTokenDetailed(token);
  return result.ok;
}

type RotateTokenResponse = {
  ok: boolean;
  token?: string;
};

export async function rotateClubToken(currentToken: string): Promise<RotateTokenResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/rotate-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildEdgeHeaders(currentToken)
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = (await response.json()) as RotateTokenResponse;
  return { ok: data.ok, token: data.token };
}

type SessionSummary = {
  id: string;
  session_date: string;
  status: string;
  splitwise_status?: string | null;
  payer_player_id?: string | null;
  guest_count?: number | null;
  start_time: string | null;
  end_time: string | null;
  total_fee: number | null;
  location: string | null;
  remarks: string | null;
};

type ListSessionsResponse = {
  ok: boolean;
  sessions: SessionSummary[];
  courts?: SessionCourt[];
  participants?: ParticipantDetail[];
};

export async function listSessions(token: string): Promise<ListSessionsResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/list-sessions`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildEdgeHeaders(token)
  });

  if (!response.ok) {
    return { ok: false, sessions: [] };
  }

  const data = (await response.json()) as ListSessionsResponse;
  return {
    ok: data.ok,
    sessions: data.sessions ?? [],
    courts: data.courts ?? [],
    participants: data.participants ?? []
  };
}

type SessionDetail = {
  id: string;
  session_date: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  total_fee: number | null;
};

type CourtDetail = {
  id: string;
  court_label: string | null;
  start_time: string | null;
  end_time: string | null;
};

type SessionCourt = CourtDetail & {
  session_id: string;
};

type ParticipantDetail = {
  session_id: string;
  player: { id: string; name: string; avatar_url?: string | null } | null;
};

type GetSessionResponse = {
  ok: boolean;
  session?: SessionDetail;
  courts?: CourtDetail[];
};

export async function getSession(token: string, sessionId: string): Promise<GetSessionResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/get-session`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildEdgeHeaders(token),
      "content-type": "application/json"
    },
    body: JSON.stringify({ sessionId })
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = (await response.json()) as GetSessionResponse;
  return data;
}

type JoinWithdrawPayload = {
  sessionId: string;
  playerIds: string[];
};

type JoinWithdrawResponse = {
  ok: boolean;
  error?: string;
};

async function postJoinWithdraw(
  token: string,
  endpoint: string,
  payload: JoinWithdrawPayload
): Promise<JoinWithdrawResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildEdgeHeaders(token),
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as JoinWithdrawResponse | null;
  if (!response.ok) {
    return { ok: false, error: data?.error };
  }

  return data ?? { ok: false, error: "request_failed" };
}

export function joinSession(token: string, payload: JoinWithdrawPayload) {
  return postJoinWithdraw(token, "join-session", payload);
}

export function withdrawSession(token: string, payload: JoinWithdrawPayload) {
  return postJoinWithdraw(token, "withdraw-session", payload);
}

type SetSessionGuestsPayload = {
  sessionId: string;
  guestCount: number;
};

type SetSessionGuestsResponse = {
  ok: boolean;
  error?: string;
  detail?: string;
  sessionId?: string;
  guestCount?: number;
};

export async function setSessionGuests(
  token: string,
  payload: SetSessionGuestsPayload
): Promise<SetSessionGuestsResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/set-session-guests`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildEdgeHeaders(token),
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as SetSessionGuestsResponse | null;
  if (!response.ok) {
    return data ?? { ok: false, error: "request_failed" };
  }
  return data ?? { ok: false, error: "request_failed" };
}

type UpdateSessionParticipationPayload = {
  sessionId: string;
  playerIds: string[];
  guestCount: number;
};

type UpdateSessionParticipationSuccess = {
  ok: true;
  status: number;
  sessionId: string;
  guestCount: number;
  participants: ParticipantDetail[];
};

type UpdateSessionParticipationFailure = {
  ok: false;
  status: number | null;
  error: string;
  detail?: string;
  unsupportedEndpoint?: boolean;
};

export type UpdateSessionParticipationResponse = UpdateSessionParticipationSuccess | UpdateSessionParticipationFailure;

export async function updateSessionParticipation(
  token: string,
  payload: UpdateSessionParticipationPayload
): Promise<UpdateSessionParticipationResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/update-session-participation`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...buildEdgeHeaders(token),
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      error: "unsupported_endpoint",
      unsupportedEndpoint: true
    };
  }

  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; detail?: string; sessionId?: string; guestCount?: number; participants?: ParticipantDetail[] }
    | null;

  if (!response.ok || !data?.ok) {
    return {
      ok: false,
      status: response.status || null,
      error: data?.error ?? "request_failed",
      detail: data?.detail,
      unsupportedEndpoint: false
    };
  }

  return {
    ok: true,
    status: response.status,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : payload.sessionId,
    guestCount: typeof data.guestCount === "number" ? data.guestCount : payload.guestCount,
    participants: Array.isArray(data.participants) ? data.participants : []
  };
}

type ReceiptError = {
  id: string;
  gmail_message_id: string;
  parse_error: string | null;
  received_at: string | null;
};

type ReceiptErrorsResponse = {
  ok: boolean;
  errors: ReceiptError[];
};

export async function listReceiptErrors(token: string): Promise<ReceiptErrorsResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/list-receipt-errors`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildEdgeHeaders(token)
  });

  if (!response.ok) {
    return { ok: false, errors: [] };
  }

  return (await response.json()) as ReceiptErrorsResponse;
}

type Player = {
  id: string;
  name: string;
  active: boolean;
  avatar_url?: string | null;
};

type ListPlayersResponse = {
  ok: boolean;
  players: Player[];
};

export async function listPlayers(token: string): Promise<ListPlayersResponse> {
  const url = `${getEdgeFunctionBaseUrl()}/list-players`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildEdgeHeaders(token)
  });

  if (!response.ok) {
    return { ok: false, players: [] };
  }

  return (await response.json()) as ListPlayersResponse;
}
