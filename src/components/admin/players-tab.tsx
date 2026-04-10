"use client";

import { UserPlus, Users2 } from "../../components/icons";
import { useEffect, useMemo, useState } from "react";
import PlayerAvatarCircle from "../player-avatar-circle";
import { adminFetch } from "./admin-fetch";
import type { Player, PlayersResponse } from "./types";

type PlayerMutationResponse = {
  ok: boolean;
  player?: Player;
  error?: string;
};

export default function PlayersTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [splitwiseUserIdDrafts, setSplitwiseUserIdDrafts] = useState<Record<string, string>>({});
  const [avatarFileDrafts, setAvatarFileDrafts] = useState<Record<string, File | null>>({});
  const [avatarUploadingByPlayerId, setAvatarUploadingByPlayerId] = useState<Record<string, boolean>>({});
  const [avatarRemovingByPlayerId, setAvatarRemovingByPlayerId] = useState<Record<string, boolean>>({});
  const [expandedPlayerAdvanced, setExpandedPlayerAdvanced] = useState<Record<string, boolean>>({});

  const activePlayers = useMemo(() => players.filter((player) => player.active), [players]);
  const inactivePlayers = useMemo(() => players.filter((player) => !player.active), [players]);

  const refreshPlayers = async () => {
    setLoadingPlayers(true);
    setPlayersError(null);
    const data = await adminFetch<PlayersResponse>("/api/admin/players");
    if (data.ok) {
      setPlayers(data.players ?? []);
    } else {
      setPlayersError(data.error ?? "Failed to load players.");
    }
    setLoadingPlayers(false);
  };

  useEffect(() => {
    void refreshPlayers();
  }, []);

  useEffect(() => {
    // Initialize draft inputs from loaded players once, but allow user edits to persist locally.
    setSplitwiseUserIdDrafts((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, string> = {};
      players.forEach((player) => {
        next[player.id] = typeof player.splitwise_user_id === "number" ? String(player.splitwise_user_id) : "";
      });
      return next;
    });
  }, [players]);

  const updatePlayerInState = (player: Player) => {
    setPlayers((prev) => prev.map((entry) => (entry.id === player.id ? { ...entry, ...player } : entry)));
  };

  const togglePlayerAdvanced = (playerId: string) => {
    setExpandedPlayerAdvanced((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const handleAddPlayer = async () => {
    setActionMessage(null);
    const name = newPlayerName.trim();
    if (!name) {
      setActionMessage("Enter a player name.");
      return;
    }
    const data = await adminFetch<{ ok: boolean; error?: string }>("/api/admin/players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
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
    const data = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to rename player.");
      return;
    }
    cancelRename();
    await refreshPlayers();
    setActionMessage("Player renamed.");
  };

  const setPlayerActive = async (playerId: string, active: boolean) => {
    const data = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to update player.");
      return;
    }
    await refreshPlayers();
    setActionMessage(active ? "Player reactivated." : "Player deactivated.");
  };

  const updatePlayerSplitwiseUserId = async (playerId: string, value: string) => {
    setActionMessage(null);
    setSplitwiseUserIdDrafts((prev) => ({ ...prev, [playerId]: value }));
    const trimmed = value.trim();
    const data = await adminFetch<PlayerMutationResponse>(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ splitwiseUserId: trimmed ? trimmed : null }),
    });
    if (!data.ok || !data.player) {
      setActionMessage(data.error ?? "Failed to update Splitwise user id.");
      return;
    }
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, splitwise_user_id: data.player?.splitwise_user_id ?? null } : p)),
    );
    setSplitwiseUserIdDrafts((prev) => ({
      ...prev,
      [playerId]: typeof data.player?.splitwise_user_id === "number" ? String(data.player.splitwise_user_id) : "",
    }));
    setActionMessage("Splitwise user id updated.");
  };

  const setDefaultPayer = async (playerId: string, enabled: boolean) => {
    setActionMessage(null);
    const data = await adminFetch<PlayerMutationResponse>(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDefaultPayer: enabled }),
    });
    if (!data.ok || !data.player) {
      setActionMessage(data.error ?? "Failed to update default payer.");
      return;
    }
    setPlayers((prev) =>
      prev.map((p) => {
        if (enabled) {
          return { ...p, is_default_payer: p.id === playerId };
        }
        if (p.id === playerId) return { ...p, is_default_payer: false };
        return p;
      }),
    );
    setActionMessage(enabled ? "Default payer updated." : "Default payer cleared.");
  };

  const setPlayerShuttlecockPaid = async (playerId: string, enabled: boolean) => {
    setActionMessage(null);
    const data = await adminFetch<PlayerMutationResponse>(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shuttlecockPaid: enabled }),
    });
    if (!data.ok || !data.player) {
      setActionMessage(data.error ?? "Failed to update shuttlecock setting.");
      return;
    }
    updatePlayerInState(data.player);
    setActionMessage("Shuttlecock paid updated.");
  };

  const uploadPlayerAvatar = async (playerId: string) => {
    const file = avatarFileDrafts[playerId];
    if (!file) {
      setActionMessage("Choose an image first.");
      return;
    }

    setActionMessage(null);
    setAvatarUploadingByPlayerId((prev) => ({ ...prev, [playerId]: true }));

    const formData = new FormData();
    formData.append("file", file);
    const data = await adminFetch<PlayerMutationResponse>(
      `/api/admin/players/${playerId}/avatar`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!data.ok || !data.player) {
      setActionMessage(data.error ?? "Failed to upload avatar.");
      setAvatarUploadingByPlayerId((prev) => ({ ...prev, [playerId]: false }));
      return;
    }

    updatePlayerInState(data.player);
    setAvatarFileDrafts((prev) => ({ ...prev, [playerId]: null }));
    setActionMessage("Avatar updated.");
    setAvatarUploadingByPlayerId((prev) => ({ ...prev, [playerId]: false }));
  };

  const removePlayerAvatar = async (playerId: string) => {
    setActionMessage(null);
    setAvatarRemovingByPlayerId((prev) => ({ ...prev, [playerId]: true }));
    const data = await adminFetch<PlayerMutationResponse>(
      `/api/admin/players/${playerId}/avatar`,
      {
        method: "DELETE",
      },
    );
    if (!data.ok || !data.player) {
      setActionMessage(data.error ?? "Failed to remove avatar.");
      setAvatarRemovingByPlayerId((prev) => ({ ...prev, [playerId]: false }));
      return;
    }

    updatePlayerInState(data.player);
    setAvatarFileDrafts((prev) => ({ ...prev, [playerId]: null }));
    setActionMessage("Avatar removed.");
    setAvatarRemovingByPlayerId((prev) => ({ ...prev, [playerId]: false }));
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Users2 size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Roster Summary</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">Players</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Manage club roster with compact cards and expandable advanced controls.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 dark:border-ink-700/60 dark:bg-ink-900/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Active Players
            </p>
            <p className="mt-1 text-2xl font-semibold">{activePlayers.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50 px-4 py-3 dark:border-ink-700/60 dark:bg-ink-900/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Inactive Players
            </p>
            <p className="mt-1 text-2xl font-semibold">{inactivePlayers.length}</p>
          </div>
        </div>
        {playersError ? <p className="mt-4 text-sm text-rose-500">{playersError}</p> : null}
        {actionMessage ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{actionMessage}</p> : null}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <UserPlus size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Add Player</span>
        </div>
        <h3 className="mt-3 text-xl font-semibold">Add to Roster</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Create a new player profile for join/withdraw and Splitwise mapping.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="add-player-name">
            Player name
          </label>
          <input
            id="add-player-name"
            name="new_player_name"
            type="text"
            placeholder="Add player name…"
            value={newPlayerName}
            onChange={(event) => setNewPlayerName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800 md:w-80"
          />
          <button
            type="button"
            onClick={handleAddPlayer}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Add Player
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Active</h3>
            <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-ink-700/60 dark:text-slate-300">
              {activePlayers.length}
            </span>
          </div>
          {loadingPlayers ? (
            <p className="mt-3 text-sm text-slate-500">Loading players…</p>
          ) : activePlayers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No active players yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activePlayers.map((player) => {
                const isAdvancedOpen = Boolean(expandedPlayerAdvanced[player.id]);
                return (
                  <li key={player.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-ink-700/60">
                    {editingPlayerId === player.id ? (
                      <div className="grid gap-3">
                        <label className="sr-only" htmlFor={`rename-player-${player.id}`}>
                          Rename player
                        </label>
                        <input
                          id={`rename-player-${player.id}`}
                          name={`rename_player_${player.id}`}
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => submitRename(player.id)}
                            className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <PlayerAvatarCircle
                              name={player.name}
                              avatarUrl={player.avatar_url ?? null}
                              sizeClass="h-10 w-10 text-sm"
                            />
                            <strong className="truncate">{player.name}</strong>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startRename(player)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlayerActive(player.id, false)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                            >
                              Deactivate
                            </button>
                            <button
                              type="button"
                              aria-expanded={isAdvancedOpen}
                              aria-controls={`player-advanced-${player.id}`}
                              onClick={() => togglePlayerAdvanced(player.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                            >
                              {isAdvancedOpen ? "Hide Advanced" : "Show Advanced"}
                            </button>
                          </div>
                        </div>

                        {isAdvancedOpen ? (
                          <div id={`player-advanced-${player.id}`} className="grid gap-3">
                            <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30">
                              <label className="font-semibold" htmlFor={`avatar-upload-${player.id}`}>
                                Avatar
                              </label>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  id={`avatar-upload-${player.id}`}
                                  name={`avatar_upload_${player.id}`}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={(event) =>
                                    setAvatarFileDrafts((prev) => ({
                                      ...prev,
                                      [player.id]: event.target.files && event.target.files[0] ? event.target.files[0] : null,
                                    }))
                                  }
                                  className="block max-w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:font-semibold file:text-slate-900 hover:file:opacity-90"
                                />
                                <button
                                  type="button"
                                  onClick={() => uploadPlayerAvatar(player.id)}
                                  disabled={!avatarFileDrafts[player.id] || avatarUploadingByPlayerId[player.id]}
                                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-60 dark:border-ink-700/60 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                >
                                  {avatarUploadingByPlayerId[player.id]
                                    ? "Uploading…"
                                    : player.avatar_url || player.avatar_path
                                      ? "Replace Avatar"
                                      : "Upload Avatar"}
                                </button>
                                {player.avatar_url || player.avatar_path ? (
                                  <button
                                    type="button"
                                    onClick={() => removePlayerAvatar(player.id)}
                                    disabled={avatarRemovingByPlayerId[player.id]}
                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-60 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                  >
                                    {avatarRemovingByPlayerId[player.id] ? "Removing…" : "Remove Avatar"}
                                  </button>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-slate-400">JPEG, PNG, or WebP up to 2MB.</p>
                            </div>

                            <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30 md:grid-cols-2">
                              <label className="font-semibold" htmlFor={`splitwise-user-id-${player.id}`}>
                                Splitwise User ID
                                <input
                                  id={`splitwise-user-id-${player.id}`}
                                  name={`splitwise_user_id_${player.id}`}
                                  type="number"
                                  inputMode="numeric"
                                  value={
                                    splitwiseUserIdDrafts[player.id] ??
                                    (typeof player.splitwise_user_id === "number" ? String(player.splitwise_user_id) : "")
                                  }
                                  onChange={(event) =>
                                    setSplitwiseUserIdDrafts((prev) => ({ ...prev, [player.id]: event.target.value }))
                                  }
                                  onBlur={(event) => updatePlayerSplitwiseUserId(player.id, event.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                                  placeholder="e.g. 54123"
                                />
                              </label>
                              <label className="mt-5 flex items-center gap-2 font-semibold md:mt-6">
                                <input
                                  name={`default_payer_${player.id}`}
                                  type="checkbox"
                                  checked={Boolean(player.is_default_payer)}
                                  onChange={(event) => setDefaultPayer(player.id, event.target.checked)}
                                />
                                Default payer
                              </label>
                              <label className="flex items-center gap-2 font-semibold">
                                <input
                                  name={`shuttlecock_paid_${player.id}`}
                                  type="checkbox"
                                  checked={Boolean(player.shuttlecock_paid)}
                                  onChange={(event) => setPlayerShuttlecockPaid(player.id, event.target.checked)}
                                />
                                Shuttlecock paid
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Inactive</h3>
            <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-ink-700/60 dark:text-slate-300">
              {inactivePlayers.length}
            </span>
          </div>
          {loadingPlayers ? (
            <p className="mt-3 text-sm text-slate-500">Loading players…</p>
          ) : inactivePlayers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No inactive players.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {inactivePlayers.map((player) => (
                <li
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-ink-700/60"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <PlayerAvatarCircle
                      name={player.name}
                      avatarUrl={player.avatar_url ?? null}
                      sizeClass="h-8 w-8 text-xs"
                    />
                    <span className="truncate">{player.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPlayerActive(player.id, true)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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
  );
}
