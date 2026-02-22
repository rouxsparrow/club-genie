"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../../components/admin-navbar";
import AnimatedBackground from "../../components/v2/AnimatedBackground";
import Confetti from "../../components/v2/Confetti";
import PlayerSelectionDialog from "../../components/v2/PlayerSelectionDialog";
import SessionCard, { type Session as V2Session } from "../../components/v2/SessionCard";
import SkeletonCard from "../../components/v2/SkeletonCard";
import {
  getClubTokenStorageKey,
  joinSession,
  listPlayers,
  listSessions,
  setSessionGuests,
  validateClubToken,
  withdrawSession
} from "../../lib/edge";
import { formatCourtLabelForDisplay, formatCourtTimeRangeForDisplay } from "../../lib/session-court-display";
import { formatSessionLocationForDisplay } from "../../lib/session-location";
import { normalizeGuestCount } from "../../lib/session-guests";
import { combineDateAndTimeToIso, isQuarterHourTime, toLocalTime } from "../../lib/session-time";
import {
  groupSessionsByMonth,
  parseSessionDateToLocalDate,
  shouldIncludeSessionInFilter,
  sortByDateAsc,
  toSessionViewStatus,
  type SessionsV2Filter
} from "../../lib/sessions-v2-view";

type GateState = "checking" | "denied" | "allowed";
type StoredTokenResult = { token: string | null; shouldCleanUrl: boolean };
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
type CourtDetail = { id: string; session_id: string; court_label: string | null; start_time: string | null; end_time: string | null };
type ParticipantDetail = { session_id: string; player: { id: string; name: string; avatar_url?: string | null } | null };
type Player = { id: string; name: string; active: boolean; avatar_url?: string | null };
type AdminPlayer = { id: string; name: string; active: boolean; is_default_payer?: boolean };
type JoinState = { open: boolean; sessionId: string | null; selectedPlayerIds: string[]; joinedPlayerIds: string[]; isSubmitting: boolean };
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
type SessionsCardModel = V2Session & { sourceStatus: string };
const QUARTER_MINUTES = ["00", "15", "30", "45"] as const;
const USE_DEFAULT_PAYER_VALUE = "__USE_DEFAULT_PAYER__";

function to12HourParts(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return { hour: "12", minute: "00", period: "AM" as const };
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
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${minuteText}`;
}

type QuarterTimeSelectProps = { value: string; onChange: (value: string) => void };

function QuarterTimeSelect({ value, onChange }: QuarterTimeSelectProps) {
  const hasValue = isQuarterHourTime(value);
  const normalized = hasValue ? to12HourParts(value) : null;
  const hourValue = normalized?.hour ?? "";
  const minuteValue = normalized?.minute ?? "";
  const periodValue = normalized?.period ?? "";
  return (
    <div className="v2-admin-time-grid">
      <select
        value={hourValue}
        onChange={(event) => onChange(from12HourParts(event.target.value, minuteValue || "00", (periodValue || "AM") as "AM" | "PM"))}
        className="v2-admin-select"
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
        onChange={(event) => onChange(from12HourParts(hourValue || "12", event.target.value, (periodValue || "AM") as "AM" | "PM"))}
        className="v2-admin-select"
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
        onChange={(event) => onChange(from12HourParts(hourValue || "12", minuteValue || "00", event.target.value as "AM" | "PM"))}
        className="v2-admin-select"
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
  return { token: localStorage.getItem(key), shouldCleanUrl: false };
}

function clearStoredToken() {
  localStorage.removeItem(getClubTokenStorageKey());
}

function formatTimeForCard(value: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
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
  const [filter, setFilter] = useState<SessionsV2Filter>("upcoming");
  const [joinState, setJoinState] = useState<JoinState>({
    open: false,
    sessionId: null,
    selectedPlayerIds: [],
    joinedPlayerIds: [],
    isSubmitting: false
  });
  const [joinDialogError, setJoinDialogError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [initialGuestCount, setInitialGuestCount] = useState(0);
  const [showGuestControl, setShowGuestControl] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formState, setFormState] = useState<SessionFormState>(buildEmptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.7 });
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

  const defaultPayer = useMemo(() => adminPlayers.find((player) => Boolean(player.is_default_payer)) ?? null, [adminPlayers]);

  const payerOptions = useMemo<AdminPlayer[]>(() => {
    const adminActive = adminPlayers.filter((player) => player.active);
    if (adminActive.length > 0) return adminActive;
    return players
      .filter((player) => player.active)
      .map((player) => ({ id: player.id, name: player.name, active: player.active, is_default_payer: false }));
  }, [adminPlayers, players]);

  const sessionSummaryById = useMemo(() => {
    const map = new Map<string, SessionSummary>();
    for (const session of sessions) map.set(session.id, session);
    return map;
  }, [sessions]);

  const sessionCards = useMemo<SessionsCardModel[]>(() => {
    const mapped = sessions.map((session) => {
      const sessionStatus = toSessionViewStatus(session.status);
      const sessionCourts = courtsBySession[session.id] ?? [];
      const sessionParticipants = participantsBySession[session.id] ?? [];
      const date = parseSessionDateToLocalDate(session.session_date);
      const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
      const guestCountForSession = normalizeGuestCount(session.guest_count);
      const playerCount = sessionParticipants.filter((entry) => Boolean(entry.player?.id)).length;
      return {
        id: session.id,
        date: validDate,
        startTime: formatTimeForCard(session.start_time),
        endTime: formatTimeForCard(session.end_time),
        location: formatSessionLocationForDisplay(session.location),
        status: sessionStatus,
        sourceStatus: session.status,
        participantCount: playerCount,
        participants: sessionParticipants
          .filter((entry) => Boolean(entry.player?.id) && Boolean(entry.player?.name))
          .map((entry) => ({ id: entry.player?.id as string, name: entry.player?.name as string, avatarUrl: entry.player?.avatar_url ?? null })),
        courts: sessionCourts.map((court) => ({
          id: court.id,
          label: formatCourtLabelForDisplay(court.court_label),
          timeRange: formatCourtTimeRangeForDisplay(court.start_time, court.end_time)
        })),
        isJoined: sessionParticipants.some((entry) => Boolean(entry.player?.id)),
        joinedPlayerIds: sessionParticipants.map((entry) => entry.player?.id).filter((id): id is string => Boolean(id)),
        guestCount: guestCountForSession,
        splitwiseStatus: session.splitwise_status ?? null,
        maxParticipants: undefined
      } satisfies SessionsCardModel;
    });
    return sortByDateAsc(mapped);
  }, [sessions, courtsBySession, participantsBySession]);

  const sessionCardsById = useMemo(() => {
    const map = new Map<string, SessionsCardModel>();
    for (const session of sessionCards) map.set(session.id, session);
    return map;
  }, [sessionCards]);

  const filteredCards = useMemo(
    () => sessionCards.filter((session) => shouldIncludeSessionInFilter(session.status, filter, isAdmin)),
    [sessionCards, filter, isAdmin]
  );
  const groupedCards = useMemo(() => groupSessionsByMonth(filteredCards), [filteredCards]);
  const selectedSession = useMemo(() => (joinState.sessionId ? sessionCardsById.get(joinState.sessionId) ?? null : null), [joinState.sessionId, sessionCardsById]);

  const refreshSessions = async (token: string) => {
    const sessionsResponse = await listSessions(token);
    if (sessionsResponse.ok) {
      setSessions((sessionsResponse.sessions ?? []).map((session) => ({ ...session, guest_count: normalizeGuestCount(session.guest_count) })));
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
      router.replace("/access-denied");
      return;
    }
    if (shouldCleanUrl) router.replace("/sessions");

    validateClubToken(token)
      .then(async (valid) => {
        if (!valid) {
          clearStoredToken();
          setGateState("denied");
          router.replace("/access-denied");
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
          isAdminUser ? fetch("/api/admin/players", { credentials: "include" }).then((response) => response.json()).catch(() => null) : Promise.resolve(null)
        ]);

        if (sessionsResponse?.ok) {
          setSessions((sessionsResponse.sessions ?? []).map((session) => ({ ...session, guest_count: normalizeGuestCount(session.guest_count) })));
          setCourts(sessionsResponse.courts ?? []);
          setParticipants(sessionsResponse.participants ?? []);
        }
        if (playersResponse?.ok) setPlayers(playersResponse.players ?? []);

        if (isAdminUser) {
          const payload = adminPlayersResponse as
            | { ok?: boolean; players?: Array<{ id?: string; name?: string; active?: boolean; is_default_payer?: boolean }> }
            | null;
          if (payload?.ok && Array.isArray(payload.players)) {
            setAdminPlayers(
              payload.players
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
        router.replace("/access-denied");
      });
  }, [router]);

  useEffect(() => {
    if (!joinState.open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousOverscrollBehavior = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    return () => {
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [joinState.open]);

  const openJoinDialog = (sessionId: string) => {
    setActionMessage(null);
    setJoinDialogError(null);
    const joinedPlayerIds = (participantsBySession[sessionId] ?? [])
      .map((entry) => entry.player?.id)
      .filter((id): id is string => Boolean(id));
    const session = sessions.find((entry) => entry.id === sessionId);
    const nextGuestCount = normalizeGuestCount(session?.guest_count);
    setGuestCount(nextGuestCount);
    setInitialGuestCount(nextGuestCount);
    setShowGuestControl(nextGuestCount > 0);
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
    setGuestCount(0);
    setInitialGuestCount(0);
    setShowGuestControl(false);
    setJoinState({ open: false, sessionId: null, selectedPlayerIds: [], joinedPlayerIds: [], isSubmitting: false });
  };

  const togglePlayer = (id: string) => {
    setJoinState((prev) => {
      const exists = prev.selectedPlayerIds.includes(id);
      const selectedPlayerIds = exists ? prev.selectedPlayerIds.filter((playerId) => playerId !== id) : [...prev.selectedPlayerIds, id];
      return { ...prev, selectedPlayerIds };
    });
  };

  const incrementGuests = () => {
    setGuestCount((prev) => normalizeGuestCount(prev + 1));
    setShowGuestControl(true);
  };

  const decrementGuests = () => {
    setGuestCount((prev) => normalizeGuestCount(prev - 1));
  };

  const handleSubmitParticipants = async () => {
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (!token || !joinState.sessionId) return;

    setJoinDialogError(null);
    const toJoin = joinState.selectedPlayerIds.filter((id) => !joinState.joinedPlayerIds.includes(id));
    const toWithdraw = joinState.joinedPlayerIds.filter((id) => !joinState.selectedPlayerIds.includes(id));
    const guestChanged = guestCount !== initialGuestCount;

    if (toJoin.length === 0 && toWithdraw.length === 0 && !guestChanged) {
      closeJoinDialog();
      setActionMessage("No participant or guest changes.");
      return;
    }

    setJoinState((prev) => ({ ...prev, isSubmitting: true }));

    if (toJoin.length > 0) {
      const joinResult = await joinSession(token, { sessionId: joinState.sessionId, playerIds: toJoin });
      if (!joinResult.ok) {
        setJoinState((prev) => ({ ...prev, isSubmitting: false }));
        setJoinDialogError(joinResult.error ?? "Join failed.");
        return;
      }
    }

    if (toWithdraw.length > 0) {
      const withdrawResult = await withdrawSession(token, { sessionId: joinState.sessionId, playerIds: toWithdraw });
      if (!withdrawResult.ok) {
        setJoinState((prev) => ({ ...prev, isSubmitting: false }));
        setJoinDialogError(withdrawResult.error ?? "Withdraw failed.");
        return;
      }
    }

    if (guestChanged) {
      const guestResult = await setSessionGuests(token, { sessionId: joinState.sessionId, guestCount });
      if (!guestResult.ok) {
        setJoinState((prev) => ({ ...prev, isSubmitting: false }));
        setJoinDialogError(guestResult.detail ?? guestResult.error ?? "Guest update failed.");
        return;
      }
      setSessions((prev) =>
        prev.map((session) => (session.id === joinState.sessionId ? { ...session, guest_count: normalizeGuestCount(guestResult.guestCount) } : session))
      );
    }

    const selectedSet = new Set(joinState.selectedPlayerIds);
    const selectedParticipantRows = players
      .filter((player) => selectedSet.has(player.id))
      .map((player) => ({
        session_id: joinState.sessionId as string,
        player: { id: player.id, name: player.name, avatar_url: player.avatar_url ?? null }
      }));
    setParticipants((prev) => [...prev.filter((entry) => entry.session_id !== joinState.sessionId), ...selectedParticipantRows]);

    const refreshed = await refreshSessions(token);
    setJoinState((prev) => ({ ...prev, isSubmitting: false }));
    closeJoinDialog();
    if (toJoin.length === 0 && toWithdraw.length === 0 && guestChanged) setActionMessage(refreshed ? "Guests updated." : "Guests updated. Refresh failed.");
    else setActionMessage(refreshed ? "Participants updated." : "Participants updated. Refresh failed.");

    setConfettiOrigin({ x: 0.5, y: 0.7 });
    setConfettiTrigger((prev) => prev + 1);
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
      payer_player_id: typeof session.payer_player_id === "string" && session.payer_player_id.trim() ? session.payer_player_id : USE_DEFAULT_PAYER_VALUE,
      status: session.status,
      courts: courtRows,
      isSubmitting: false
    });
  };

  const deleteSessionDevOnly = async (sessionId: string) => {
    if (!showDevDelete) return;
    setActionMessage(null);
    const confirmed = window.confirm("Delete this session? This cannot be undone.");
    if (!confirmed) return;
    const response = await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE", credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setActionMessage(data?.error ?? "Failed to delete session.");
      return;
    }
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (token) await refreshSessions(token);
    setActionMessage("Session deleted.");
  };

  const closeSessionDialog = () => setFormState((prev) => ({ ...prev, open: false }));
  const updateFormField = (field: keyof SessionFormState, value: string) => setFormState((prev) => ({ ...prev, [field]: value }));
  const addCourtRow = () =>
    setFormState((prev) => ({ ...prev, courts: [...prev.courts, { id: `court-${prev.courts.length}`, court_label: "", start_time: "", end_time: "" }] }));
  const updateCourtRow = (index: number, key: "court_label" | "start_time" | "end_time", value: string) =>
    setFormState((prev) => ({ ...prev, courts: prev.courts.map((court, idx) => (idx === index ? { ...court, [key]: value } : court)) }));
  const removeCourtRow = (index: number) => setFormState((prev) => ({ ...prev, courts: prev.courts.filter((_, idx) => idx !== index) }));

  const submitSessionForm = async () => {
    if (!formState.session_date) {
      setFormMessage("Session date is required.");
      return;
    }
    const allTimes = [formState.start_time, formState.end_time, ...formState.courts.map((court) => court.start_time), ...formState.courts.map((court) => court.end_time)].filter(Boolean);
    if (allTimes.some((time) => !isQuarterHourTime(time))) {
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
    const endpoint = formState.mode === "create" ? "/api/admin/sessions" : `/api/admin/sessions/${formState.sessionId}`;
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
    if (token) await refreshSessions(token);
    setFormMessage("Session saved.");
    setFormState((prev) => ({ ...prev, isSubmitting: false, open: false }));
  };

  if (gateState !== "allowed") {
    return (
      <div className="v2-page">
        <AnimatedBackground />
        <main className="v2-container" />
      </div>
    );
  }

  if (!mounted || loading) {
    return (
      <div className="v2-page">
        <AnimatedBackground />
        <main className="v2-container">
          <header className="v2-header !px-0 pt-6">
            <div className="v2-logo">
              <Sparkles className="mr-2 inline-block text-[var(--v2-primary)]" size={22} />
              <span>Club</span>
              <span className="v2-logo-accent">Genie</span>
            </div>
          </header>
          <div className="mb-6">
            <h1 className="text-4xl font-bold md:text-5xl">
              Upcoming <span className="text-[var(--v2-primary)]">Sessions</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--v2-text-secondary)]">Loading sessions...</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="v2-page">
      <AnimatedBackground />
      <Confetti trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />

      <main className="v2-container">
        <header className="v2-header !px-0 pt-6">
          <div className="flex w-full flex-col gap-4">
            {isAdmin ? <AdminNavbar currentPath="/sessions" className="v2-admin-nav" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="v2-logo">
                <Sparkles className="mr-2 inline-block text-[var(--v2-primary)]" size={22} />
                <span>Club</span>
                <span className="v2-logo-accent">Genie</span>
              </div>
              {isAdmin ? (
                <button type="button" className="v2-dialog-btn v2-dialog-btn-primary" onClick={openCreateDialog}>
                  Create Session
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mb-8">
          <h1 className="text-4xl font-bold md:text-5xl">
            {filter === "upcoming" ? "Upcoming" : "Past"} <span className="text-[var(--v2-primary)]">Sessions</span>
          </h1>
          {actionMessage ? <p className="v2-inline-message mt-3">{actionMessage}</p> : null}
        </section>

        <section className="mb-8 flex items-center">
          <div className="relative flex items-center rounded-full border border-[var(--v2-border)] bg-[var(--v2-bg-card)] p-1">
            <div
              className="absolute h-[calc(100%-8px)] w-24 rounded-full bg-[var(--v2-primary)] transition-transform duration-300"
              style={{ transform: filter === "upcoming" ? "translateX(0px)" : "translateX(96px)" }}
            />
            <button
              className={`relative z-10 w-24 rounded-full px-4 py-2 text-sm font-semibold ${
                filter === "upcoming" ? "text-[var(--v2-bg-deep)]" : "text-[var(--v2-text-secondary)]"
              }`}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`relative z-10 w-24 rounded-full px-4 py-2 text-sm font-semibold ${
                filter === "past" ? "text-[var(--v2-bg-deep)]" : "text-[var(--v2-text-secondary)]"
              }`}
              onClick={() => setFilter("past")}
            >
              Past
            </button>
          </div>
        </section>

        {groupedCards.length === 0 ? (
          <div className="v2-card py-14 text-center">
            <h3 className="mb-2 text-xl font-semibold">No sessions found</h3>
            <p className="text-[var(--v2-text-secondary)]">Try switching tabs or check back later.</p>
          </div>
        ) : (
          groupedCards.map(({ month, sessions: monthSessions }) => (
            <section key={month} className="mb-8">
              <h2 className="v2-section-title mb-4">{month}</h2>
              <div className="space-y-4">
                {monthSessions.map((session, index) => {
                  const source = sessionSummaryById.get(session.id) ?? null;
                  return (
                    <SessionCard
                      key={session.id}
                      session={{ ...session, participantCount: session.participants.length, guestCount: normalizeGuestCount(session.guestCount) }}
                      index={index}
                      onJoinWithdraw={() => openJoinDialog(session.id)}
                      showAdminActions={isAdmin}
                      showSplitwiseStatus={isAdmin}
                      showDeleteAction={showDevDelete}
                      onEdit={source ? () => openEditDialog(source) : undefined}
                      onDelete={showDevDelete ? () => deleteSessionDevOnly(session.id) : undefined}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <PlayerSelectionDialog
        isOpen={joinState.open}
        onClose={closeJoinDialog}
        session={selectedSession}
        allPlayers={players.map((player) => ({ id: player.id, name: player.name, avatarUrl: player.avatar_url ?? null }))}
        selectedPlayerIds={joinState.selectedPlayerIds}
        onTogglePlayer={togglePlayer}
        onSubmit={handleSubmitParticipants}
        guestCount={guestCount}
        showGuestControls={showGuestControl}
        onShowGuestControls={() => setShowGuestControl(true)}
        onIncrementGuest={incrementGuests}
        onDecrementGuest={decrementGuests}
        isSubmitting={joinState.isSubmitting}
        errorMessage={joinDialogError}
      />

      {formState.open ? (
        <section className="v2-dialog-overlay" onClick={closeSessionDialog}>
          <div className="v2-admin-dialog-content" onClick={(event) => event.stopPropagation()}>
            <div className="v2-dialog-header">
              <div>
                <h2 className="v2-dialog-title">{formState.mode === "create" ? "Create Session" : "Edit Session"}</h2>
                <p className="v2-dialog-subtitle">Fill in session details and courts.</p>
              </div>
              <button className="v2-dialog-close" onClick={closeSessionDialog}>
                x
              </button>
            </div>

            <div className="v2-admin-grid">
              <label className="v2-admin-field">
                Session Date
                <input
                  type="date"
                  value={formState.session_date}
                  onChange={(event) => updateFormField("session_date", event.target.value)}
                  className="v2-admin-input"
                />
              </label>
              <label className="v2-admin-field">
                Status
                <select
                  value={formState.status}
                  onChange={(event) => updateFormField("status", event.target.value)}
                  className="v2-admin-select"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>
              <label className="v2-admin-field">
                Start Time
                <QuarterTimeSelect value={formState.start_time} onChange={(value) => updateFormField("start_time", value)} />
              </label>
              <label className="v2-admin-field">
                End Time
                <QuarterTimeSelect value={formState.end_time} onChange={(value) => updateFormField("end_time", value)} />
              </label>
              <label className="v2-admin-field">
                Location
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => updateFormField("location", event.target.value)}
                  className="v2-admin-input"
                />
              </label>
              <label className="v2-admin-field">
                Total Fee
                <input
                  type="number"
                  step="0.01"
                  value={formState.total_fee}
                  onChange={(event) => updateFormField("total_fee", event.target.value)}
                  className="v2-admin-input"
                />
              </label>
              <label className="v2-admin-field">
                Remarks
                <input
                  type="text"
                  value={formState.remarks}
                  onChange={(event) => updateFormField("remarks", event.target.value)}
                  className="v2-admin-input"
                />
              </label>
              <label className="v2-admin-field">
                Payer
                <select
                  value={formState.payer_player_id}
                  onChange={(event) => updateFormField("payer_player_id", event.target.value)}
                  className="v2-admin-select"
                >
                  <option value={USE_DEFAULT_PAYER_VALUE}>Use default payer ({defaultPayer?.name ?? "not set"})</option>
                  {payerOptions.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                      {player.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
                <span className="v2-admin-help">Default payer is applied and saved explicitly.</span>
                {adminPlayers.length === 0 && players.length > 0 ? (
                  <span className="v2-admin-help v2-admin-help-warning">
                    Loaded active-player fallback list (admin roster details unavailable).
                  </span>
                ) : null}
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Courts</h3>
                <button type="button" className="v2-admin-chip" onClick={addCourtRow}>
                  Add Court
                </button>
              </div>
              <div className="space-y-3">
                {formState.courts.length === 0 ? (
                  <div className="v2-card-muted">No courts added yet.</div>
                ) : (
                  formState.courts.map((court, index) => (
                    <div key={court.id} className="v2-admin-court-card">
                      <label className="v2-admin-field v2-admin-field-full">
                        Court
                        <input
                          type="text"
                          placeholder="Court label"
                          value={court.court_label}
                          onChange={(event) => updateCourtRow(index, "court_label", event.target.value)}
                          className="v2-admin-input"
                        />
                      </label>
                      <label className="v2-admin-field">
                        Start
                        <QuarterTimeSelect value={court.start_time} onChange={(value) => updateCourtRow(index, "start_time", value)} />
                      </label>
                      <label className="v2-admin-field">
                        End
                        <QuarterTimeSelect value={court.end_time} onChange={(value) => updateCourtRow(index, "end_time", value)} />
                      </label>
                      <div className="v2-admin-field v2-admin-field-full">
                        <button type="button" className="v2-admin-chip v2-admin-chip-danger" onClick={() => removeCourtRow(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {formMessage ? <p className="v2-inline-message mt-4">{formMessage}</p> : null}
            <div className="v2-admin-actions">
              <button type="button" className="v2-dialog-btn v2-dialog-btn-primary" onClick={submitSessionForm} disabled={formState.isSubmitting}>
                {formState.isSubmitting ? "Saving..." : "Save Session"}
              </button>
              <button type="button" className="v2-admin-chip" onClick={closeSessionDialog}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
