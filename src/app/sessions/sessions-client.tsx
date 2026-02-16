"use client";

import { ArrowUpDown, CalendarDays, Clock3, DollarSign, LayoutGrid, MapPin, Rows3, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/admin-navbar";
import PlayerAvatarCircle from "../../components/player-avatar-circle";
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
  splitwise_status?: string | null;
  payer_player_id?: string | null;
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
  player: { id: string; name: string; avatar_url?: string | null } | null;
};

type Player = {
  id: string;
  name: string;
  active: boolean;
  avatar_url?: string | null;
};

type AdminPlayer = {
  id: string;
  name: string;
  active: boolean;
  is_default_payer?: boolean;
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
  payer_player_id: string;
  status: string;
  courts: { id: string; court_label: string; start_time: string; end_time: string }[];
  isSubmitting: boolean;
};

type SortKey = "session_date" | "status";
type SortDirection = "asc" | "desc";

const QUARTER_MINUTES = ["00", "15", "30", "45"] as const;
const USE_DEFAULT_PAYER_VALUE = "__USE_DEFAULT_PAYER__";

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

type TimeToken = {
  text: string;
  period: string;
};

function toTimeToken(value: string | null, alwaysMinutes: boolean): TimeToken | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const periodRaw = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const period = periodRaw.toUpperCase();
  const text = alwaysMinutes || minute !== "00" ? `${hour}:${minute}` : hour;

  if (!hour) return null;
  return { text, period };
}

function formatRangeWithSharedPeriod(
  start: string | null,
  end: string | null,
  options: { alwaysMinutes: boolean; separator: string }
) {
  const startToken = toTimeToken(start, options.alwaysMinutes);
  const endToken = toTimeToken(end, options.alwaysMinutes);

  if (!startToken && !endToken) return "TBD";
  if (!startToken || !endToken) {
    const fallback = (token: TimeToken | null) => (token ? `${token.text}${token.period ? ` ${token.period}` : ""}` : "TBD");
    return `${fallback(startToken)}${options.separator}${fallback(endToken)}`;
  }

  if (startToken.period && endToken.period && startToken.period === endToken.period) {
    return `${startToken.text}${options.separator}${endToken.text} ${endToken.period}`;
  }

  return `${startToken.text}${startToken.period ? ` ${startToken.period}` : ""}${options.separator}${endToken.text}${
    endToken.period ? ` ${endToken.period}` : ""
  }`;
}

function formatSessionTimeRangeMobile(start: string | null, end: string | null) {
  return formatRangeWithSharedPeriod(start, end, { alwaysMinutes: true, separator: " – " });
}

function formatCourtTimeRangeMobile(start: string | null, end: string | null) {
  return formatRangeWithSharedPeriod(start, end, { alwaysMinutes: false, separator: "–" });
}

function formatSessionTimeRangeDesktopLines(start: string | null, end: string | null) {
  const startToken = toTimeToken(start, true);
  const endToken = toTimeToken(end, true);

  if (!startToken && !endToken) {
    return { line1: "TBD", line2: "" };
  }

  if (!startToken || !endToken) {
    const fallback = (token: TimeToken | null) => (token ? `${token.text}${token.period ? ` ${token.period}` : ""}` : "TBD");
    return { line1: `${fallback(startToken)} -`, line2: fallback(endToken) };
  }

  if (startToken.period && endToken.period && startToken.period === endToken.period) {
    return { line1: `${startToken.text} -`, line2: `${endToken.text} ${endToken.period}` };
  }

  return {
    line1: `${startToken.text}${startToken.period ? ` ${startToken.period}` : ""} -`,
    line2: `${endToken.text}${endToken.period ? ` ${endToken.period}` : ""}`
  };
}

function getParticipantNames(participants: ParticipantDetail[]) {
  return participants
    .map((entry) => entry.player?.name)
    .filter((name): name is string => Boolean(name));
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
    payer_player_id: USE_DEFAULT_PAYER_VALUE,
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
  const [adminPlayers, setAdminPlayers] = useState<AdminPlayer[]>([]);
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
  const [entranceReady, setEntranceReady] = useState(false);
  const [expandedParticipantNames, setExpandedParticipantNames] = useState<Record<string, boolean>>({});
  const showDevDelete = isAdmin && process.env.NODE_ENV === "development";

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

  const defaultPayer = useMemo(
    () => adminPlayers.find((player) => Boolean(player.is_default_payer)) ?? null,
    [adminPlayers]
  );

  const payerOptions = useMemo<AdminPlayer[]>(() => {
    const adminActive = adminPlayers.filter((player) => player.active);
    if (adminActive.length > 0) return adminActive;
    return players
      .filter((player) => player.active)
      .map((player) => ({
      id: player.id,
      name: player.name,
      active: player.active,
      is_default_payer: false
      }));
  }, [adminPlayers, players]);

  const displayedSessions = useMemo(() => {
    const filtered = sessions.filter((session) => (showPastSessions ? session.status !== "OPEN" : session.status === "OPEN"));
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

  const toggleParticipantsExpanded = (sessionId: string) => {
    setExpandedParticipantNames((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
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
        let isAdminUser = false;
        if (adminResponse?.ok) {
          const adminData = (await adminResponse.json()) as { ok: boolean };
          isAdminUser = Boolean(adminData.ok);
          setIsAdmin(isAdminUser);
        } else {
          setIsAdmin(false);
        }

        const [sessionsResponse, playersResponse, adminPlayersResponse] = await Promise.all([
          listSessions(token),
          listPlayers(token),
          isAdminUser
            ? fetch("/api/admin/players", { credentials: "include" })
                .then((response) => response.json())
                .catch(() => null)
            : Promise.resolve(null)
        ]);
        if (sessionsResponse?.ok) {
          setSessions(sessionsResponse.sessions ?? []);
          setCourts(sessionsResponse.courts ?? []);
          setParticipants(sessionsResponse.participants ?? []);
        }
        if (playersResponse?.ok) {
          setPlayers(playersResponse.players ?? []);
        }
        if (isAdminUser) {
          const adminPlayersPayload = adminPlayersResponse as
            | { ok?: boolean; players?: Array<{ id?: string; name?: string; active?: boolean; is_default_payer?: boolean }> }
            | null;
          if (adminPlayersPayload?.ok && Array.isArray(adminPlayersPayload.players)) {
            setAdminPlayers(
              adminPlayersPayload.players
                .filter((player) => typeof player?.id === "string" && typeof player?.name === "string")
                .map((player) => ({
                  id: player.id as string,
                  name: player.name as string,
                  active: Boolean(player.active),
                  is_default_payer: Boolean(player.is_default_payer)
                }))
            );
          } else {
            setAdminPlayers([]);
          }
        } else {
          setAdminPlayers([]);
        }
        setLoading(false);
      })
      .catch(() => {
        clearStoredToken();
        setGateState("denied");
        router.replace("/denied");
      });
  }, [router]);

  useEffect(() => {
    if (!joinState.open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const scrollY = window.scrollY;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [joinState.open]);

  useEffect(() => {
    if (gateState !== "allowed" || loading) {
      setEntranceReady(false);
      return;
    }
    const timeout = window.setTimeout(() => setEntranceReady(true), 60);
    return () => window.clearTimeout(timeout);
  }, [gateState, loading]);

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

  const deleteSessionDevOnly = async (sessionId: string) => {
    if (!showDevDelete) return;
    setActionMessage(null);
    const confirmed = window.confirm("Delete this session? This cannot be undone.");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setActionMessage(data?.error ?? "Failed to delete session.");
      return;
    }

    const token = localStorage.getItem(getClubTokenStorageKey());
    if (token) {
      await refreshSessions(token);
    }
    setActionMessage("Session deleted.");
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
        player: { id: player.id, name: player.name, avatar_url: player.avatar_url ?? null }
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
    setFormState({ ...buildEmptyForm(), open: true, mode: "create", payer_player_id: USE_DEFAULT_PAYER_VALUE });
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
      payer_player_id:
        typeof session.payer_player_id === "string" && session.payer_player_id.trim()
          ? session.payer_player_id
          : USE_DEFAULT_PAYER_VALUE,
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
      payerPlayerId: formState.payer_player_id === USE_DEFAULT_PAYER_VALUE ? null : formState.payer_player_id || null,
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-4 sm:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Club Genie</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Upcoming Sessions</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-300">Loading sessions...</p>
          </div>
        </header>
        <div className="mt-6 flex flex-wrap items-center gap-2 animate-pulse">
          <div className="h-10 w-36 rounded-full bg-slate-200/70 dark:bg-ink-700/60" />
          <div className="h-10 w-24 rounded-full bg-slate-200/70 dark:bg-ink-700/60" />
          <div className="h-10 w-24 rounded-full bg-slate-200/70 dark:bg-ink-700/60" />
        </div>
        <section className="mt-8 space-y-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="card animate-pulse">
              <div className="h-7 w-48 rounded-lg bg-slate-200/70 dark:bg-ink-700/60" />
              <div className="mt-3 h-5 w-44 rounded-lg bg-slate-200/70 dark:bg-ink-700/60" />
              <div className="mt-2 h-5 w-24 rounded-lg bg-slate-200/70 dark:bg-ink-700/60" />
              <div className="mt-6 h-10 w-40 rounded-full bg-slate-200/70 dark:bg-ink-700/60" />
            </div>
          ))}
        </section>
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
        </div>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={openCreateDialog}
              className="tap-feedback tap-feedback-strong btn-ripple rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            >
              Create Session
            </button>
          ) : null}
        </div>
        </div>
      </header>

      <div
        className={`mt-6 flex flex-wrap items-center justify-between gap-3 transition-all duration-700 ease-out ${
          entranceReady ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-ink-700/60">
            <button
              type="button"
              onClick={() => setShowPastSessions(false)}
              className={`tap-feedback rounded-full px-4 py-2 text-sm font-semibold ${
                !showPastSessions
                  ? "bg-emerald-500 text-slate-900"
                  : "text-slate-700 dark:text-slate-100"
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setShowPastSessions(true)}
              className={`tap-feedback rounded-full px-4 py-2 text-sm font-semibold ${
                showPastSessions
                  ? "bg-emerald-500 text-slate-900"
                  : "text-slate-700 dark:text-slate-100"
              }`}
            >
              Past
            </button>
          </div>
          <button
            type="button"
            onClick={() => toggleSort("session_date")}
            className={`tap-feedback rounded-full border px-4 py-2 text-sm font-semibold ${
              sortKey === "session_date"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Date {sortKey === "session_date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("status")}
            className={`tap-feedback rounded-full border px-4 py-2 text-sm font-semibold ${
              sortKey === "status"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Status {sortKey === "status" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
        {actionMessage ? <p className="text-sm text-slate-500 dark:text-slate-300">{actionMessage}</p> : null}
      </div>

      {displayedSessions.length === 0 ? (
        <section className="card mt-10">
          <p>{showPastSessions ? "No past sessions available." : "No upcoming sessions available."}</p>
        </section>
      ) : (
        <section className="mt-8 sm:mt-10">
          <div className="space-y-4 md:hidden">
            {displayedSessions.map((session, index) => {
              const courtItems = courtsBySession[session.id] ?? [];
              const participantItems = participantsBySession[session.id] ?? [];
              const participantNames = getParticipantNames(participantItems);
              const hasParticipants = participantNames.length > 0;
              const participantsExpanded = Boolean(expandedParticipantNames[session.id]);
              const participantListId = `participant-names-${session.id}`;
              return (
                <article
                  key={session.id}
                  className={`card p-4 transition-all duration-700 ease-out ${
                    entranceReady ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                  }`}
                  style={{ transitionDelay: `${Math.min(120 + index * 90, 700)}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{formatDate(session.session_date)}</div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`pill ${
                          session.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : session.status === "CLOSED"
                            ? "bg-slate-200 text-slate-600 dark:bg-ink-700 dark:text-slate-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                        } ${session.status === "OPEN" ? "neon-open-badge" : ""}`}
                      >
                        {session.status}
                      </span>
                      {isAdmin && session.status === "CLOSED" ? (
                        <span
                          className={`pill ${
                            session.splitwise_status === "CREATED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : session.splitwise_status === "FAILED"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                          }`}
                        >
                          Splitwise {session.splitwise_status ?? "PENDING"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Clock3 size={14} className="text-emerald-400 dark:text-emerald-300" />
                    <span>{formatSessionTimeRangeMobile(session.start_time, session.end_time)}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <MapPin size={14} className="text-emerald-400 dark:text-emerald-300" />
                    <span>{session.location ?? "TBD"}</span>
                  </p>
                  {session.remarks ? <p className="mt-2 text-xs text-slate-500">{session.remarks}</p> : null}
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2.5 font-semibold">
                      <LayoutGrid size={14} className="text-emerald-400 dark:text-emerald-300" />
                      <span>Courts:</span>
                    </p>
                    {courtItems.length === 0 ? (
                      <p className="mt-1 ml-6">TBD</p>
                    ) : (
                      <ul className="mt-1 ml-6 space-y-1">
                        {courtItems.map((court) => (
                          <li key={court.id}>
                            {court.court_label ?? "Court"} ({formatCourtTimeRangeMobile(court.start_time, court.end_time)})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {hasParticipants ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleParticipantsExpanded(session.id)}
                          className="tap-feedback flex w-full items-center gap-2.5 text-left"
                          aria-expanded={participantsExpanded}
                          aria-controls={participantListId}
                        >
                          <Users2 size={14} className="text-emerald-400 dark:text-emerald-300" />
                          <span className="flex flex-wrap items-center gap-1.5">
                            {participantItems.map((entry, avatarIndex) => {
                              if (!entry.player) return null;
                              return (
                                <PlayerAvatarCircle
                                  key={`${entry.player.id}:${avatarIndex}`}
                                  name={entry.player.name}
                                  avatarUrl={entry.player.avatar_url ?? null}
                                  sizeClass="h-8 w-8 text-[11px]"
                                />
                              );
                            })}
                          </span>
                        </button>
                        {participantsExpanded ? (
                          <p id={participantListId} className="ml-6 mt-2 text-slate-500 dark:text-slate-300">
                            {participantNames.join(", ")} ({participantNames.length}{" "}
                            {participantNames.length === 1 ? "player" : "players"})
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <Users2 size={14} className="text-emerald-400 dark:text-emerald-300" />
                        <span>Open</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center text-sm font-normal text-slate-400 dark:text-slate-400">
                      {session.total_fee ? `$${session.total_fee.toFixed(2)}` : "-"}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="tap-feedback tap-feedback-strong btn-ripple min-h-11 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                        onClick={() => openJoinDialog(session.id)}
                        disabled={session.status === "CLOSED"}
                      >
                        Join / Withdraw
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          className="tap-feedback min-h-11 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          onClick={() => openEditDialog(session)}
                        >
                          Edit
                        </button>
                      ) : null}
                      {showDevDelete ? (
                        <button
                          type="button"
                          className="tap-feedback min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                          onClick={() => deleteSessionDevOnly(session.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-ink-700/60 dark:bg-ink-800/80 md:block">
            <div className="grid grid-cols-[0.55fr_0.95fr_0.8fr_1.05fr_1.45fr_2.4fr_0.6fr_1.1fr] gap-4 border-b border-slate-200/60 bg-slate-100/70 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-ink-700/60 dark:bg-ink-900/40 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={13} className="text-emerald-400 dark:text-emerald-300" />
                Day
              </span>
              <button type="button" onClick={() => toggleSort("session_date")} className="inline-flex items-center gap-2 text-left">
                <CalendarDays size={13} className="text-emerald-400 dark:text-emerald-300" />
                Date
                <ArrowUpDown size={12} />
              </button>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={13} className="text-emerald-400 dark:text-emerald-300" />
                Time
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={13} className="text-emerald-400 dark:text-emerald-300" />
                Location
              </span>
              <span className="inline-flex items-center gap-2">
                <LayoutGrid size={13} className="text-emerald-400 dark:text-emerald-300" />
                Courts
              </span>
              <span className="inline-flex items-center gap-2">
                <Users2 size={13} className="text-emerald-400 dark:text-emerald-300" />
                Participants
              </span>
              <span className="inline-flex items-center gap-2">
                <DollarSign size={13} className="text-emerald-400 dark:text-emerald-300" />
                Fee
              </span>
              <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-2 text-left">
                <Rows3 size={13} className="text-emerald-400 dark:text-emerald-300" />
                Status
                <ArrowUpDown size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
              {displayedSessions.map((session, index) => {
                const courtItems = courtsBySession[session.id] ?? [];
                const participantItems = participantsBySession[session.id] ?? [];
                const participantNames = getParticipantNames(participantItems);
                const hasParticipants = participantNames.length > 0;
                const participantsExpanded = Boolean(expandedParticipantNames[session.id]);
                const participantListId = `participant-names-desktop-${session.id}`;
                const sessionTimeLines = formatSessionTimeRangeDesktopLines(session.start_time, session.end_time);
                return (
                  <div
                    key={session.id}
                    className={`grid grid-cols-[0.55fr_0.95fr_0.8fr_1.05fr_1.45fr_2.4fr_0.6fr_1.1fr] items-start gap-4 px-6 py-5 text-sm transition-all duration-700 ease-out ${
                      entranceReady ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                    }`}
                    style={{ transitionDelay: `${Math.min(120 + index * 70, 600)}ms` }}
                  >
                    <div className="text-slate-500 dark:text-slate-300">
                      {new Date(session.session_date).toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div className="font-semibold">{formatDate(session.session_date)}</div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <p>{sessionTimeLines.line1}</p>
                      {sessionTimeLines.line2 ? <p>{sessionTimeLines.line2}</p> : null}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <div>{session.location ?? "TBD"}</div>
                      {session.remarks ? <div className="mt-2 text-xs">{session.remarks}</div> : null}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">Courts:</p>
                      {courtItems.length === 0 ? (
                        <p className="mt-1">TBD</p>
                      ) : (
                        <ul className="mt-1 space-y-1">
                          {courtItems.map((court) => (
                            <li key={court.id}>
                              {court.court_label ?? "Court"} ({formatCourtTimeRangeMobile(court.start_time, court.end_time)})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      {hasParticipants ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleParticipantsExpanded(session.id)}
                            className="tap-feedback flex w-full items-center gap-2 text-left"
                            aria-expanded={participantsExpanded}
                            aria-controls={participantListId}
                          >
                            <span className="flex flex-wrap items-center gap-1.5">
                              {participantItems.map((entry, avatarIndex) => {
                                if (!entry.player) return null;
                                return (
                                  <PlayerAvatarCircle
                                    key={`${entry.player.id}:${avatarIndex}`}
                                    name={entry.player.name}
                                    avatarUrl={entry.player.avatar_url ?? null}
                                    sizeClass="h-8 w-8 text-[11px]"
                                  />
                                );
                              })}
                            </span>
                          </button>
                          {participantsExpanded ? (
                            <p id={participantListId} className="mt-2 text-slate-500 dark:text-slate-300">
                              {participantNames.join(", ")} ({participantNames.length}{" "}
                              {participantNames.length === 1 ? "player" : "players"})
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span>Open</span>
                      )}
                      <div className="mt-2">
                        <button
                          type="button"
                          className="tap-feedback tap-feedback-strong btn-ripple rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          onClick={() => openJoinDialog(session.id)}
                          disabled={session.status === "CLOSED"}
                        >
                          Join / Withdraw
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      {session.total_fee ? `$${session.total_fee.toFixed(2)}` : "-"}
                    </div>
                    <div className="flex items-center">
                      <div className="flex flex-col items-start gap-2">
                        <span
                          className={`pill ${
                            session.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : session.status === "CLOSED"
                              ? "bg-slate-200 text-slate-600 dark:bg-ink-700 dark:text-slate-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                          } ${session.status === "OPEN" ? "neon-open-badge" : ""}`}
                        >
                          {session.status}
                        </span>
                        {isAdmin && session.status === "CLOSED" ? (
                          <span
                            className={`pill ${
                              session.splitwise_status === "CREATED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                                : session.splitwise_status === "FAILED"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                            }`}
                          >
                            Splitwise {session.splitwise_status ?? "PENDING"}
                          </span>
                        ) : null}
                        {(isAdmin || showDevDelete) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {isAdmin ? (
                              <button
                                type="button"
                                className="tap-feedback rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                onClick={() => openEditDialog(session)}
                              >
                                Edit
                              </button>
                            ) : null}
                            {showDevDelete ? (
                              <button
                                type="button"
                                className="tap-feedback rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                                onClick={() => deleteSessionDevOnly(session.id)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
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
                  <span className="inline-flex items-center gap-2">
                    <PlayerAvatarCircle
                      name={player.name}
                      avatarUrl={player.avatar_url ?? null}
                      sizeClass="h-7 w-7 text-[11px]"
                    />
                    <span>{player.name}</span>
                  </span>
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
                  className="tap-feedback tap-feedback-strong btn-ripple rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:-translate-y-0.5"
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
                <label className="text-sm font-semibold">
                  Payer
                  <select
                    value={formState.payer_player_id}
                    onChange={(event) => updateFormField("payer_player_id", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-700/60 dark:bg-ink-800"
                  >
                    <option value={USE_DEFAULT_PAYER_VALUE}>
                      Use default payer ({defaultPayer?.name ?? "not set"})
                    </option>
                    {payerOptions.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                        {player.active ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-slate-400">
                    Default payer is applied and saved explicitly.
                  </span>
                  {adminPlayers.length === 0 && players.length > 0 ? (
                    <span className="mt-1 block text-xs text-amber-400">
                      Loaded active-player fallback list (admin roster details unavailable).
                    </span>
                  ) : null}
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
                className="tap-feedback tap-feedback-strong btn-ripple rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:-translate-y-0.5"
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

    </main>
  );
}
