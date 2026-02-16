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

export async function validateClubToken(token: string) {
  const url = `${getEdgeFunctionBaseUrl()}/validate-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildEdgeHeaders(token)
  });

  return response.ok;
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
  player: { id: string; name: string } | null;
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
