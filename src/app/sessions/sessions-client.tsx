"use client";

import { CalendarDays, ClipboardList, MapPin, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../../components/theme-toggle";
import {
  getClubTokenStorageKey,
  joinSession,
  listPlayers,
  listSessions,
  validateClubToken,
  withdrawSession
} from "../../lib/edge";

type GateState = "checking" | "denied" | "allowed";

type StoredTokenResult = {
  token: string | null;
  shouldCleanUrl: boolean;
};

type SessionSummary = {
  id: string;
  session_date: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  total_fee: number | null;
  location: string | null;
  remarks: string | null;
};

type CourtDetail = {
  id: string;
  session_id: string;
  court_label: string | null;
  start_time: string | null;
  end_time: string | null;
};

type ParticipantDetail = {
  session_id: string;
  player: { id: string; name: string } | null;
};

type Player = {
  id: string;
  name: string;
  active: boolean;
};

type JoinState = {
  open: boolean;
  sessionId: string | null;
  selectedPlayerIds: string[];
  isSubmitting: boolean;
};

type SessionFormState = {
  open: boolean;
  mode: "create" | "edit";
  sessionId: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  total_fee: string;
  remarks: string;
  status: string;
  courts: { id: string; court_label: string; start_time: string; end_time: string }[];
  isSubmitting: boolean;
};

type SessionsClientProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function readTokenFromLocation(searchParams: URLSearchParams): StoredTokenResult {
  const key = getClubTokenStorageKey();
  const tokenFromUrl = searchParams.get("t");

  if (tokenFromUrl) {
    localStorage.setItem(key, tokenFromUrl);
    return { token: tokenFromUrl, shouldCleanUrl: true };
  }

  const existingToken = localStorage.getItem(key);
  return { token: existingToken, shouldCleanUrl: false };
}

function clearStoredToken() {
  const key = getClubTokenStorageKey();
  localStorage.removeItem(key);
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return "TBD";
  const format = (value: string | null) =>
    value ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "TBD";
  return `${format(start)} - ${format(end)}`;
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function buildEmptyForm(): SessionFormState {
  return {
    open: false,
    mode: "create",
    sessionId: null,
    session_date: "",
    start_time: "",
    end_time: "",
    location: "",
    total_fee: "",
    remarks: "",
    status: "OPEN",
    courts: [],
    isSubmitting: false
  };
}

export default function SessionsClient({ searchParams }: SessionsClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [gateState, setGateState] = useState<GateState>("checking");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [courts, setCourts] = useState<CourtDetail[]>([]);
  const [participants, setParticipants] = useState<ParticipantDetail[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinState, setJoinState] = useState<JoinState>({
    open: false,
    sessionId: null,
    selectedPlayerIds: [],
    isSubmitting: false
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formState, setFormState] = useState<SessionFormState>(buildEmptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const memoizedParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => params.append(key, entry));
      } else if (typeof value === "string") {
        params.set(key, value);
      }
    });
    return params;
  }, [searchParams]);

  const courtsBySession = useMemo(() => {
    const map: Record<string, CourtDetail[]> = {};
    courts.forEach((court) => {
      map[court.session_id] = map[court.session_id] ? [...map[court.session_id], court] : [court];
    });
    return map;
  }, [courts]);

  const participantsBySession = useMemo(() => {
    const map: Record<string, ParticipantDetail[]> = {};
    participants.forEach((entry) => {
      map[entry.session_id] = map[entry.session_id] ? [...map[entry.session_id], entry] : [entry];
    });
    return map;
  }, [participants]);

  const refreshSessions = async (token: string) => {
    const sessionsResponse = await listSessions(token);
    if (sessionsResponse.ok) {
      setSessions(sessionsResponse.sessions ?? []);
      setCourts(sessionsResponse.courts ?? []);
      setParticipants(sessionsResponse.participants ?? []);
    }
  };

  useEffect(() => {
    setMounted(true);
    const { token, shouldCleanUrl } = readTokenFromLocation(memoizedParams);

    if (!token) {
      setGateState("denied");
      router.replace("/denied");
      return;
    }

    if (shouldCleanUrl) {
      router.replace("/sessions");
    }

    Promise.all([validateClubToken(token), fetch("/api/admin-session")])
      .then(async ([valid, adminResponse]) => {
        if (!valid) {
          clearStoredToken();
          setGateState("denied");
          router.replace("/denied");
          return;
        }
        setGateState("allowed");
        const adminData = (await adminResponse.json()) as { ok: boolean };
        setIsAdmin(adminData.ok);
        const [sessionsResponse, playersResponse] = await Promise.all([listSessions(token), listPlayers(token)]);
        if (sessionsResponse?.ok) {
          setSessions(sessionsResponse.sessions ?? []);
          setCourts(sessionsResponse.courts ?? []);
          setParticipants(sessionsResponse.participants ?? []);
        }
        if (playersResponse?.ok) {
          setPlayers(playersResponse.players ?? []);
        }
        setLoading(false);
      })
      .catch(() => {
        clearStoredToken();
        setGateState("denied");
        router.replace("/denied");
      });
  }, [memoizedParams, router]);

  const openJoinDialog = (sessionId: string) => {
    setActionMessage(null);
    setJoinState({ open: true, sessionId, selectedPlayerIds: [], isSubmitting: false });
  };

  const closeJoinDialog = () => {
    setJoinState({ open: false, sessionId: null, selectedPlayerIds: [], isSubmitting: false });
  };

  const togglePlayer = (id: string) => {
    setJoinState((prev) => {
      const exists = prev.selectedPlayerIds.includes(id);
      const selectedPlayerIds = exists
        ? prev.selectedPlayerIds.filter((playerId) => playerId !== id)
        : [...prev.selectedPlayerIds, id];
      return { ...prev, selectedPlayerIds };
    });
  };

  const handleJoin = async () => {
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (!token || !joinState.sessionId) return;
    setJoinState((prev) => ({ ...prev, isSubmitting: true }));
    const result = await joinSession(token, {
      sessionId: joinState.sessionId,
      playerIds: joinState.selectedPlayerIds
    });
    setJoinState((prev) => ({ ...prev, isSubmitting: false }));
    if (result.ok) {
      await refreshSessions(token);
    }
    setActionMessage(result.ok ? "Players joined." : "Join failed.");
  };

  const handleWithdraw = async () => {
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (!token || !joinState.sessionId) return;
    setJoinState((prev) => ({ ...prev, isSubmitting: true }));
    const result = await withdrawSession(token, {
      sessionId: joinState.sessionId,
      playerIds: joinState.selectedPlayerIds
    });
    setJoinState((prev) => ({ ...prev, isSubmitting: false }));
    if (result.ok) {
      await refreshSessions(token);
    }
    setActionMessage(result.ok ? "Players withdrawn." : "Withdraw failed.");
  };

  const openCreateDialog = () => {
    setFormMessage(null);
    setFormState({ ...buildEmptyForm(), open: true, mode: "create" });
  };

  const openEditDialog = (session: SessionSummary) => {
    const courtRows =
      courtsBySession[session.id]?.map((court) => ({
        id: court.id,
        court_label: court.court_label ?? "",
        start_time: toLocalDateTime(court.start_time),
        end_time: toLocalDateTime(court.end_time)
      })) ?? [];
    setFormMessage(null);
    setFormState({
      open: true,
      mode: "edit",
      sessionId: session.id,
      session_date: session.session_date,
      start_time: toLocalDateTime(session.start_time),
      end_time: toLocalDateTime(session.end_time),
      location: session.location ?? "",
      total_fee: session.total_fee?.toString() ?? "",
      remarks: session.remarks ?? "",
      status: session.status,
      courts: courtRows,
      isSubmitting: false
    });
  };

  const closeSessionDialog = () => {
    setFormState((prev) => ({ ...prev, open: false }));
  };

  const updateFormField = (field: keyof SessionFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const addCourtRow = () => {
    setFormState((prev) => ({
      ...prev,
      courts: [
        ...prev.courts,
        { id: `court-${prev.courts.length}`, court_label: "", start_time: "", end_time: "" }
      ]
    }));
  };

  const updateCourtRow = (index: number, key: "court_label" | "start_time" | "end_time", value: string) => {
    setFormState((prev) => ({
      ...prev,
      courts: prev.courts.map((court, idx) => (idx === index ? { ...court, [key]: value } : court))
    }));
  };

  const removeCourtRow = (index: number) => {
    setFormState((prev) => ({ ...prev, courts: prev.courts.filter((_, idx) => idx !== index) }));
  };

  const submitSessionForm = async () => {
    if (!formState.session_date) {
      setFormMessage("Session date is required.");
      return;
    }
    setFormState((prev) => ({ ...prev, isSubmitting: true }));
    const payload = {
      session_date: formState.session_date,
      start_time: fromLocalDateTime(formState.start_time),
      end_time: fromLocalDateTime(formState.end_time),
      location: formState.location || null,
      total_fee: formState.total_fee ? Number(formState.total_fee) : null,
      remarks: formState.remarks || null,
      status: formState.status,
      courts: formState.courts.map((court) => ({
        court_label: court.court_label || null,
        start_time: fromLocalDateTime(court.start_time),
        end_time: fromLocalDateTime(court.end_time)
      }))
    };

    const endpoint =
      formState.mode === "create" ? "/api/admin/sessions" : `/api/admin/sessions/${formState.sessionId}`;
    const method = formState.mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setFormMessage(data.error ?? "Failed to save session.");
      setFormState((prev) => ({ ...prev, isSubmitting: false }));
      return;
    }
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (token) {
      await refreshSessions(token);
    }
    setFormMessage("Session saved.");
    setFormState((prev) => ({ ...prev, isSubmitting: false, open: false }));
  };

  if (gateState !== "allowed") {
    return <main />;
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="card">
          <h1 className="text-3xl font-semibold">Upcoming Sessions</h1>
          <p className="mt-2 text-slate-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Club Genie</p>
          <h1 className="mt-2 text-4xl font-semibold">Upcoming Sessions</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-300">
            Reserve your courts, track players, and keep the night smooth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={openCreateDialog}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Create Session
            </button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      {sessions.length === 0 ? (
        <section className="card mt-10">
          <p>No sessions available yet.</p>
        </section>
      ) : (
        <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-ink-700/60 dark:bg-ink-800/80">
          <div className="grid grid-cols-7 gap-4 border-b border-slate-200/60 bg-slate-100/70 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-ink-700/60 dark:bg-ink-900/40 dark:text-slate-300">
            <span>Day</span>
            <span>Date</span>
            <span>Time</span>
            <span>Location</span>
            <span>Courts</span>
            <span>Participants</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
            {sessions.map((session) => {
              const courtItems = courtsBySession[session.id] ?? [];
              const participantItems = participantsBySession[session.id] ?? [];
              const participantNames = participantItems
                .map((entry) => entry.player?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div key={session.id} className="grid grid-cols-7 gap-4 px-6 py-5 text-sm">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                    <CalendarDays size={16} />
                    <span>{new Date(session.session_date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                  </div>
                  <div className="font-semibold">{formatDate(session.session_date)}</div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {formatTimeRange(session.start_time, session.end_time)}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{session.location ?? "TBD"}</span>
                    </div>
                    {session.remarks ? <div className="mt-2 text-xs">{session.remarks}</div> : null}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {courtItems.length === 0 ? (
                      <span>TBD</span>
                    ) : (
                      <ul className="space-y-1">
                        {courtItems.map((court) => (
                          <li key={court.id}>
                            {court.court_label ?? "Court"} • {formatTimeRange(court.start_time, court.end_time)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users2 size={14} />
                      <span>{participantNames || "Open"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-ink-700/60 dark:text-slate-200"
                        onClick={() => openJoinDialog(session.id)}
                        disabled={session.status === "CLOSED"}
                      >
                        Join / Withdraw
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          onClick={() => openEditDialog(session)}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`pill ${
                        session.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                          : session.status === "CLOSED"
                          ? "bg-slate-200 text-slate-600 dark:bg-ink-700 dark:text-slate-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                      }`}
                    >
                      {session.status}
                    </span>
                    {session.total_fee ? (
                      <span className="text-xs text-slate-500 dark:text-slate-300">
                        ${session.total_fee.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {joinState.open ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="card w-full max-w-lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Select players</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Choose one or more players to join or withdraw.
                </p>
              </div>
              <button type="button" onClick={closeJoinDialog} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {players.length === 0 ? <p>No players available.</p> : null}
              {players.map((player) => (
                <label
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 text-sm dark:border-ink-700/60"
                >
                  <span>{player.name}</span>
                  <input
                    type="checkbox"
                    checked={joinState.selectedPlayerIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                  />
                </label>
              ))}
            </div>
            {actionMessage ? <p className="mt-3 text-sm text-slate-500">{actionMessage}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinState.isSubmitting}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Join
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={joinState.isSubmitting}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                Withdraw
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {formState.open ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="card w-full max-w-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {formState.mode === "create" ? "Create Session" : "Edit Session"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Fill in the session details and courts.
                </p>
              </div>
              <button type="button" onClick={closeSessionDialog} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Session Date
                  <input
                    type="date"
                    value={formState.session_date}
                    onChange={(event) => updateFormField("session_date", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Status
                  <select
                    value={formState.status}
                    onChange={(event) => updateFormField("status", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Start Time
                  <input
                    type="datetime-local"
                    value={formState.start_time}
                    onChange={(event) => updateFormField("start_time", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
                <label className="text-sm font-semibold">
                  End Time
                  <input
                    type="datetime-local"
                    value={formState.end_time}
                    onChange={(event) => updateFormField("end_time", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
              </div>
              <label className="text-sm font-semibold">
                Location
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => updateFormField("location", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Total Fee
                  <input
                    type="number"
                    step="0.01"
                    value={formState.total_fee}
                    onChange={(event) => updateFormField("total_fee", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Remarks
                  <input
                    type="text"
                    value={formState.remarks}
                    onChange={(event) => updateFormField("remarks", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Courts</h3>
                <button
                  type="button"
                  onClick={addCourtRow}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                >
                  Add Court
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {formState.courts.length === 0 ? (
                  <div className="card-muted text-sm text-slate-500 dark:text-slate-300">
                    No courts added yet.
                  </div>
                ) : (
                  formState.courts.map((court, index) => (
                    <div
                      key={court.id}
                      className="grid gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-ink-700/60 md:grid-cols-4"
                    >
                      <input
                        type="text"
                        placeholder="Court label"
                        value={court.court_label}
                        onChange={(event) => updateCourtRow(index, "court_label", event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                      />
                      <input
                        type="datetime-local"
                        value={court.start_time}
                        onChange={(event) => updateCourtRow(index, "start_time", event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                      />
                      <input
                        type="datetime-local"
                        value={court.end_time}
                        onChange={(event) => updateCourtRow(index, "end_time", event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                      />
                      <button
                        type="button"
                        onClick={() => removeCourtRow(index)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {formMessage ? <p className="mt-4 text-sm text-slate-500">{formMessage}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={submitSessionForm}
                disabled={formState.isSubmitting}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {formState.isSubmitting ? "Saving..." : "Save Session"}
              </button>
              <button
                type="button"
                onClick={closeSessionDialog}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <ClipboardList size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Session Rules</span>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Join or withdraw any time before the session starts. Admins can update courts and fees.
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <Users2 size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Bring Friends</span>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Select multiple players in a single action to keep the roster accurate.
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <MapPin size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Court Notes</span>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Locations and court times update automatically from receipts or admin edits.
          </p>
        </div>
      </section>
    </main>
  );
}
