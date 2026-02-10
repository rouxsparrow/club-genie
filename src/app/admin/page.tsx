"use client";

import { Lock, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminNavbar from "../../components/admin-navbar";
import ThemeToggle from "../../components/theme-toggle";
import { getClubTokenStorageKey } from "../../lib/edge";

type TabKey = "players" | "club";

type Player = {
  id: string;
  name: string;
  active: boolean;
};

type PlayersResponse = {
  ok: boolean;
  players?: Player[];
  error?: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("players");
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentAccessLink, setCurrentAccessLink] = useState<string | null>(null);
  const [clubMessage, setClubMessage] = useState<string | null>(null);

  const activePlayers = useMemo(() => players.filter((player) => player.active), [players]);
  const inactivePlayers = useMemo(() => players.filter((player) => !player.active), [players]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem(getClubTokenStorageKey());
    if (token) {
      setCurrentToken(token);
      setCurrentAccessLink(`${window.location.origin}/sessions?t=${token}`);
    }
    let isMounted = true;
    fetch("/api/admin/players", { credentials: "include" })
      .then((response) => response.json())
      .then((data: PlayersResponse) => {
        if (!isMounted) return;
        if (data.ok) {
          setPlayers(data.players ?? []);
        } else {
          setPlayersError(data.error ?? "Failed to load players.");
        }
        setLoadingPlayers(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPlayersError("Failed to load players.");
        setLoadingPlayers(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshPlayers = async () => {
    setLoadingPlayers(true);
    setPlayersError(null);
    const response = await fetch("/api/admin/players", { credentials: "include" });
    const data = (await response.json()) as PlayersResponse;
    if (data.ok) {
      setPlayers(data.players ?? []);
    } else {
      setPlayersError(data.error ?? "Failed to load players.");
    }
    setLoadingPlayers(false);
  };

  const handleAddPlayer = async () => {
    setActionMessage(null);
    const name = newPlayerName.trim();
    if (!name) {
      setActionMessage("Enter a player name.");
      return;
    }
    const response = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to add player.");
      return;
    }
    setNewPlayerName("");
    await refreshPlayers();
    setActionMessage("Player added.");
  };

  const startRename = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  };

  const cancelRename = () => {
    setEditingPlayerId(null);
    setEditingName("");
  };

  const submitRename = async (playerId: string) => {
    const name = editingName.trim();
    if (!name) {
      setActionMessage("Name cannot be empty.");
      return;
    }
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to rename player.");
      return;
    }
    cancelRename();
    await refreshPlayers();
    setActionMessage("Player renamed.");
  };

  const setPlayerActive = async (playerId: string, active: boolean) => {
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to update player.");
      return;
    }
    await refreshPlayers();
    setActionMessage(active ? "Player reactivated." : "Player deactivated.");
  };

  const handleRotateToken = async () => {
    setIsRotating(true);
    setRotationError(null);
    setClubMessage(null);
    const response = await fetch("/api/admin/club-token/rotate", {
      method: "POST",
      credentials: "include"
    });
    const data = (await response.json()) as { ok: boolean; token?: string; error?: string };
    if (!data.ok || !data.token) {
      setRotationError(data.error ?? "Token rotation failed.");
      setIsRotating(false);
      return;
    }
    setNewToken(data.token);
    localStorage.setItem(getClubTokenStorageKey(), data.token);
    setCurrentToken(data.token);
    setCurrentAccessLink(`${window.location.origin}/sessions?t=${data.token}`);
    setIsRotating(false);
  };

  const copyInviteLink = async () => {
    if (!newToken) return;
    const link = `${window.location.origin}/sessions?t=${newToken}`;
    await navigator.clipboard.writeText(link);
    setRotationError("Invite link copied.");
  };

  const copyCurrentAccessLink = async () => {
    if (!currentAccessLink) return;
    await navigator.clipboard.writeText(currentAccessLink);
    setClubMessage("Current access link copied.");
  };

  if (!mounted) {
    return <main />;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-6">
        <AdminNavbar currentPath="/admin" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Admin Console</p>
          <h1 className="mt-2 text-4xl font-semibold">Club Control Room</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-300">
            Manage players, access tokens, and session operations.
          </p>
        </div>
        <ThemeToggle />
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("players")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "players"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Players
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("club")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "club"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Club Access
        </button>
      </nav>

      {activeTab === "players" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <UserPlus size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Roster</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Players</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Manage the club roster. Deactivate to preserve history.
            </p>
            {playersError ? <p className="mt-3 text-sm text-rose-500">{playersError}</p> : null}
            {actionMessage ? <p className="mt-3 text-sm text-slate-500">{actionMessage}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Add player name"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800 md:w-72"
              />
              <button
                type="button"
                onClick={handleAddPlayer}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Add Player
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h3 className="text-lg font-semibold">Active</h3>
              {loadingPlayers ? (
                <p className="mt-3 text-sm text-slate-500">Loading players...</p>
              ) : activePlayers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No active players yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {activePlayers.map((player) => (
                    <li key={player.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-ink-700/60">
                      {editingPlayerId === player.id ? (
                        <div className="grid gap-3">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitRename(player.id)}
                              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelRename}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <strong>{player.name}</strong>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startRename(player)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlayerActive(player.id, false)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold">Inactive</h3>
              {loadingPlayers ? (
                <p className="mt-3 text-sm text-slate-500">Loading players...</p>
              ) : inactivePlayers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No inactive players.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {inactivePlayers.map((player) => (
                    <li key={player.id} className="flex items-center justify-between gap-3">
                      <span>{player.name}</span>
                      <button
                        type="button"
                        onClick={() => setPlayerActive(player.id, true)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                      >
                        Reactivate
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "club" ? (
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Lock size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Access</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Club Access Token</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Rotate the token to invalidate all prior invite links.
            </p>
            {rotationError ? <p className="mt-4 text-sm text-slate-500">{rotationError}</p> : null}
            {newToken ? (
              <div className="mt-4 grid gap-3">
                <p className="text-sm font-semibold">New token</p>
                <code className="rounded-2xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                  {newToken}
                </code>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Copy Invite Link
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRotateToken}
                disabled={isRotating}
                className="mt-4 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {isRotating ? "Rotating..." : "Rotate Token"}
              </button>
            )}
          </div>
          <div className="card-muted">
            <h3 className="text-lg font-semibold">Invite Link</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              After rotating, share the new invite link with your players. The full link includes the new token as a
              query parameter.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Example: https://your-app/sessions?t=NEW_TOKEN
            </p>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-lg font-semibold">Current Access Link</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              This is the access link built from the token currently stored in this browser.
            </p>
            {clubMessage ? <p className="mt-3 text-sm text-slate-500">{clubMessage}</p> : null}
            {currentAccessLink ? (
              <div className="mt-4 grid gap-3">
                <code className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                  {currentAccessLink}
                </code>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={copyCurrentAccessLink}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Copy Current Link
                  </button>
                  <code className="rounded-xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                    {currentToken}
                  </code>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
                No token found in local storage for this browser yet.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
