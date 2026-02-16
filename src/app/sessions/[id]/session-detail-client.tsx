"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClubTokenStorageKey, getSession, validateClubToken } from "../../../lib/edge";

type GateState = "checking" | "denied" | "allowed";

type StoredTokenResult = {
  token: string | null;
  shouldCleanUrl: boolean;
};

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

type SessionDetailClientProps = {
  sessionId: string;
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

export default function SessionDetailClient({ sessionId }: SessionDetailClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [gateState, setGateState] = useState<GateState>("checking");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [courts, setCourts] = useState<CourtDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const { token, shouldCleanUrl } = readTokenFromLocation(params);

    if (!token || !sessionId) {
      setGateState("denied");
      router.replace("/denied");
      return;
    }

    if (shouldCleanUrl) {
      router.replace(`/sessions/${sessionId}`);
    }

    validateClubToken(token)
      .then((valid) => {
        if (!valid) {
          clearStoredToken();
          setGateState("denied");
          router.replace("/denied");
          return;
        }
        setGateState("allowed");
        return fetch("/api/admin-session").catch(() => null);
      })
      .then(async (adminResponse) => {
        if (adminResponse?.ok) {
          const adminData = (await adminResponse.json()) as { ok: boolean };
          setIsAdmin(Boolean(adminData.ok));
        } else {
          setIsAdmin(false);
        }
        return getSession(token, sessionId);
      })
      .then((response) => {
        if (!response || !response.ok) {
          setLoading(false);
          return;
        }
        setSession(response.session ?? null);
        setCourts(response.courts ?? []);
        setLoading(false);
      })
      .catch(() => {
        clearStoredToken();
        setGateState("denied");
        router.replace("/denied");
      });
  }, [router, sessionId]);

  const handleCloseSession = async () => {
    if (!sessionId) return;
    setClosing(true);
    const response = await fetch(`/api/admin/sessions/${sessionId}/close`, {
      method: "POST",
      credentials: "include"
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setClosing(false);
    setCloseMessage(result?.ok ? "Session closed and Splitwise sync triggered." : result?.error ?? "Close failed.");
  };

  if (gateState !== "allowed") {
    return <main />;
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="card">
          <h1 className="text-3xl font-semibold">Session Details</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="card">
          <h1 className="text-3xl font-semibold">Session Details</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-300">Session not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="card">
        <h1 className="text-3xl font-semibold">Session Details</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-300">
          <strong>{formatDate(session.session_date)}</strong> — {session.status}
        </p>
      </div>
      {courts.length === 0 ? (
        <p className="mt-6 text-slate-500 dark:text-slate-300">No courts listed yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {courts.map((court) => (
            <li key={court.id} className="card">
              {court.court_label ?? "Court"} — {court.start_time ?? ""} {court.end_time ? `to ${court.end_time}` : ""}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {isAdmin ? (
          <button
            type="button"
            onClick={handleCloseSession}
            disabled={closing}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            {closing ? "Closing..." : "Close Session"}
          </button>
        ) : null}
        {closeMessage ? <p className="text-sm text-slate-500">{closeMessage}</p> : null}
      </div>
    </main>
  );
}
