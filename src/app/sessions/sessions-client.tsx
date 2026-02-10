"use client";

import { ArrowUpDown, CalendarDays, ClipboardList, MapPin, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/admin-navbar";
import ThemeToggle from "../../components/theme-toggle";
import {
  getClubTokenStorageKey,
  joinSession,
  listPlayers,
  listSessions,
  validateClubToken,
  withdrawSession
} from "../../lib/edge";
import { combineDateAndTimeToIso, isQuarterHourTime, toLocalTime } from "../../lib/session-time";

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
  joinedPlayerIds: string[];
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

type SortKey = "session_date" | "status";
type SortDirection = "asc" | "desc";

const QUARTER_MINUTES = ["00", "15", "30", "45"] as const;

function to12HourParts(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return { hour: "12", minute: "00", period: "AM" as const };
  }
  const [hourText, minuteText] = value.split(":");
  const hour24 = Number(hourText);
  const minute = QUARTER_MINUTES.includes(minuteText as (typeof QUARTER_MINUTES)[number]) ? minuteText : "00";
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour: String(hour12), minute, period };
}

function from12HourParts(hourText: string, minuteText: string, period: "AM" | "PM") {
  const hour12 = Number(hourText);
  if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12) return "";
  if (!QUARTER_MINUTES.includes(minuteText as (typeof QUARTER_MINUTES)[number])) return "";
  let hour24 = hour12 % 12;
  if (period === "PM") {
    hour24 += 12;
  }
  return `${String(hour24).padStart(2, "0")}:${minuteText}`;
}

type QuarterTimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

function QuarterTimeSelect({ value, onChange }: QuarterTimeSelectProps) {
  const hasValue = isQuarterHourTime(value);
  const normalized = hasValue ? to12HourParts(value) : null;
  const hourValue = normalized?.hour ?? "";
  const minuteValue = normalized?.minute ?? "";
  const periodValue = normalized?.period ?? "";

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      <select
        value={hourValue}
        onChange={(event) =>
          onChange(from12HourParts(event.target.value, minuteValue || "00", (periodValue || "AM") as "AM" | "PM"))
        }
        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-900 dark:border-ink-700/60 dark:bg-ink-800 dark:text-slate-100"
      >
        <option value="">Hour</option>
        {Array.from({ length: 12 }).map((_, idx) => {
          const hour = String(idx + 1);
          return (
            <option key={hour} value={hour}>
              {hour}
            </option>
          );
        })}
      </select>
      <select
        value={minuteValue}
        onChange={(event) =>
          onChange(from12HourParts(hourValue || "12", event.target.value, (periodValue || "AM") as "AM" | "PM"))
        }
        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-900 dark:border-ink-700/60 dark:bg-ink-800 dark:text-slate-100"
      >
        <option value="">Min</option>
        {QUARTER_MINUTES.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>
      <select
        value={periodValue}
        onChange={(event) =>
          onChange(from12HourParts(hourValue || "12", minuteValue || "00", event.target.value as "AM" | "PM"))
        }
        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-900 dark:border-ink-700/60 dark:bg-ink-800 dark:text-slate-100"
      >
        <option value="">AM/PM</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

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

export default function SessionsClient() {
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
    joinedPlayerIds: [],
    isSubmitting: false
  });
  const [joinDialogError, setJoinDialogError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formState, setFormState] = useState<SessionFormState>(buildEmptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("session_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

  const displayedSessions = useMemo(() => {
    const filtered = sessions.filter((session) => (showPastSessions ? true : session.status === "OPEN"));
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "status") {
        const cmp = a.status.localeCompare(b.status);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const aTime = new Date(a.session_date).getTime();
      const bTime = new Date(b.session_date).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [sessions, showPastSessions, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const refreshSessions = async (token: string) => {
    const sessionsResponse = await listSessions(token);
    if (sessionsResponse.ok) {
      setSessions(sessionsResponse.sessions ?? []);
      setCourts(sessionsResponse.courts ?? []);
      setParticipants(sessionsResponse.participants ?? []);
      return true;
    }
    return false;
  };

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const { token, shouldCleanUrl } = readTokenFromLocation(params);

    if (!token) {
      setGateState("denied");
      router.replace("/denied");
      return;
    }

    if (shouldCleanUrl) {
      router.replace("/sessions");
    }

    validateClubToken(token)
      .then(async (valid) => {
        if (!valid) {
          clearStoredToken();
          setGateState("denied");
          router.replace("/denied");
          return;
        }
        setGateState("allowed");
        const adminResponse = await fetch("/api/admin-session").catch(() => null);
        if (adminResponse?.ok) {
          const adminData = (await adminResponse.json()) as { ok: boolean };
          setIsAdmin(adminData.ok);
        } else {
          setIsAdmin(false);
        }
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
  }, [router]);

  const openJoinDialog = (sessionId: string) => {
    setActionMessage(null);
    setJoinDialogError(null);
    const joinedPlayerIds = (participantsBySession[sessionId] ?? [])
      .map((entry) => entry.player?.id)
      .filter((id): id is string => Boolean(id));
    setJoinState({
      open: true,
      sessionId,
      selectedPlayerIds: joinedPlayerIds,
      joinedPlayerIds,
      isSubmitting: false
    });
  };

  const closeJoinDialog = () => {
    setJoinDialogError(null);
    setJoinState({ open: false, sessionId: null, selectedPlayerIds: [], joinedPlayerIds: [], isSubmitting: false });
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

  const handleSubmitParticipants = async () => {
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (!token || !joinState.sessionId) return;
    setJoinDialogError(null);
    const toJoin = joinState.selectedPlayerIds.filter((id) => !joinState.joinedPlayerIds.includes(id));
    const toWithdraw = joinState.joinedPlayerIds.filter((id) => !joinState.selectedPlayerIds.includes(id));

    if (toJoin.length === 0 && toWithdraw.length === 0) {
      closeJoinDialog();
      setActionMessage("No participant changes.");
      return;
    }

    setJoinState((prev) => ({ ...prev, isSubmitting: true }));

    if (toJoin.length > 0) {
      const joinResult = await joinSession(token, {
        sessionId: joinState.sessionId,
        playerIds: toJoin
      });
      if (!joinResult.ok) {
        setJoinState((prev) => ({ ...prev, isSubmitting: false }));
        setJoinDialogError(joinResult.error ?? "Join failed.");
        return;
      }
    }

    if (toWithdraw.length > 0) {
      const withdrawResult = await withdrawSession(token, {
        sessionId: joinState.sessionId,
        playerIds: toWithdraw
      });
      if (!withdrawResult.ok) {
        setJoinState((prev) => ({ ...prev, isSubmitting: false }));
        setJoinDialogError(withdrawResult.error ?? "Withdraw failed.");
        return;
      }
    }

    const selectedSet = new Set(joinState.selectedPlayerIds);
    const selectedParticipantRows = players
      .filter((player) => selectedSet.has(player.id))
      .map((player) => ({
        session_id: joinState.sessionId as string,
        player: { id: player.id, name: player.name }
      }));
    setParticipants((prev) => [
      ...prev.filter((entry) => entry.session_id !== joinState.sessionId),
      ...selectedParticipantRows
    ]);

    const refreshed = await refreshSessions(token);
    setJoinState((prev) => ({ ...prev, isSubmitting: false }));
    closeJoinDialog();
    setActionMessage(refreshed ? "Participants updated." : "Participants updated. Refresh failed.");
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
        start_time: toLocalTime(court.start_time),
        end_time: toLocalTime(court.end_time)
      })) ?? [];
    setFormMessage(null);
    setFormState({
      open: true,
      mode: "edit",
      sessionId: session.id,
      session_date: session.session_date,
      start_time: toLocalTime(session.start_time),
      end_time: toLocalTime(session.end_time),
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
    const allTimes = [formState.start_time, formState.end_time, ...formState.courts.map((court) => court.start_time), ...formState.courts.map((court) => court.end_time)].filter(Boolean);
    const hasInvalidTime = allTimes.some((time) => !isQuarterHourTime(time));
    if (hasInvalidTime) {
      setFormMessage("Use 15-minute time blocks only (00, 15, 30, 45).");
      return;
    }
    setFormState((prev) => ({ ...prev, isSubmitting: true }));
    const payload = {
      session_date: formState.session_date,
      start_time: combineDateAndTimeToIso(formState.session_date, formState.start_time),
      end_time: combineDateAndTimeToIso(formState.session_date, formState.end_time),
      location: formState.location || null,
      total_fee: formState.total_fee ? Number(formState.total_fee) : null,
      remarks: formState.remarks || null,
      status: formState.status,
      courts: formState.courts.map((court) => ({
        court_label: court.court_label || null,
        start_time: combineDateAndTimeToIso(formState.session_date, court.start_time),
        end_time: combineDateAndTimeToIso(formState.session_date, court.end_time)
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="card">
          <h1 className="text-3xl font-semibold">Upcoming Sessions</h1>
          <p className="mt-2 text-slate-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:gap-6">
        {isAdmin ? <AdminNavbar currentPath="/sessions" /> : null}
        <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Club Genie</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Upcoming Sessions</h1>
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
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPastSessions((prev) => !prev)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
          >
            {showPastSessions ? "Hide past sessions" : "Show past sessions"}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("session_date")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
          >
            Date {sortKey === "session_date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("status")}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
          >
            Status {sortKey === "status" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
        {actionMessage ? <p className="text-sm text-slate-500 dark:text-slate-300">{actionMessage}</p> : null}
      </div>

      {displayedSessions.length === 0 ? (
        <section className="card mt-10">
          <p>{showPastSessions ? "No sessions available yet." : "No open sessions available."}</p>
        </section>
      ) : (
        <section className="mt-8 sm:mt-10">
          <div className="space-y-4 md:hidden">
            {displayedSessions.map((session) => {
              const courtItems = courtsBySession[session.id] ?? [];
              const participantItems = participantsBySession[session.id] ?? [];
              const participantNames = participantItems
                .map((entry) => entry.player?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <article key={session.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{formatDate(session.session_date)}</div>
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
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {formatTimeRange(session.start_time, session.end_time)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {session.location ?? "TBD"}
                  </p>
                  {session.remarks ? <p className="mt-2 text-xs text-slate-500">{session.remarks}</p> : null}
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {courtItems.length === 0 ? (
                      <span>TBD courts</span>
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
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Users2 size={14} />
                    <span>{participantNames || "Open"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
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
                    {session.total_fee ? (
                      <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-300">
                        ${session.total_fee.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-ink-700/60 dark:bg-ink-800/80 md:block">
            <div className="grid grid-cols-8 gap-4 border-b border-slate-200/60 bg-slate-100/70 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-ink-700/60 dark:bg-ink-900/40 dark:text-slate-300">
              <span>Day</span>
              <button type="button" onClick={() => toggleSort("session_date")} className="inline-flex items-center gap-1 text-left">
                Date
                <ArrowUpDown size={12} />
              </button>
              <span>Time</span>
              <span>Location</span>
              <span>Courts</span>
              <span>Participants</span>
              <span>Fee</span>
              <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 text-left">
                Status
                <ArrowUpDown size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
              {displayedSessions.map((session) => {
                const courtItems = courtsBySession[session.id] ?? [];
                const participantItems = participantsBySession[session.id] ?? [];
                const participantNames = participantItems
                  .map((entry) => entry.player?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={session.id} className="grid grid-cols-8 items-center gap-4 px-6 py-5 text-sm">
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
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
                    <div className="text-slate-600 dark:text-slate-300">
                      {session.total_fee ? `$${session.total_fee.toFixed(2)}` : "-"}
                    </div>
                    <div className="flex items-center">
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
                    </div>
                  </div>
                );
              })}
            </div>
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
                <button
                  type="button"
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    joinState.selectedPlayerIds.includes(player.id)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "border-slate-200/80 text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
                  }`}
                >
                  <span>{player.name}</span>
                  <span className="text-xs font-semibold">
                    {joinState.selectedPlayerIds.includes(player.id)
                      ? joinState.joinedPlayerIds.includes(player.id)
                        ? "Joined"
                        : "Will join"
                      : joinState.joinedPlayerIds.includes(player.id)
                      ? "Will withdraw"
                      : "Not joined"}
                  </span>
                </button>
              ))}
            </div>
            {joinDialogError ? <p className="mt-3 text-sm text-rose-400">{joinDialogError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmitParticipants}
                disabled={joinState.isSubmitting}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {joinState.isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {formState.open ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-4 sm:px-6">
          <div className="card max-h-full w-full max-w-2xl overflow-y-auto p-4 sm:p-6">
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
                  <QuarterTimeSelect
                    value={formState.start_time}
                    onChange={(value) => updateFormField("start_time", value)}
                  />
                </label>
                <label className="text-sm font-semibold">
                  End Time
                  <QuarterTimeSelect
                    value={formState.end_time}
                    onChange={(value) => updateFormField("end_time", value)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Location
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(event) => updateFormField("location", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  />
                </label>
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
              </div>
              <div className="grid gap-3 md:grid-cols-2">
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
                      className="grid gap-4 rounded-2xl border border-slate-200/80 p-4 dark:border-ink-700/60 md:grid-cols-2"
                    >
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                        Court
                        <input
                          type="text"
                          placeholder="Court label"
                          value={court.court_label}
                          onChange={(event) => updateCourtRow(index, "court_label", event.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-ink-700/60 dark:bg-ink-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Start
                        <QuarterTimeSelect
                          value={court.start_time}
                          onChange={(value) => updateCourtRow(index, "start_time", value)}
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        End
                        <QuarterTimeSelect
                          value={court.end_time}
                          onChange={(value) => updateCourtRow(index, "end_time", value)}
                        />
                      </label>
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeCourtRow(index)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                        >
                          Remove
                        </button>
                      </div>
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
