"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./admin-fetch";
import AdminClubSelector, { type AdminClub } from "./club-selector";
import { AdminClubProvider } from "./admin-club-context";
import ClubAccessTab from "./club-access-tab";
import SplitwiseTab from "./splitwise-tab";

type GlobalPlayer = { id: string; name: string; splitwise_user_id?: number | null; avatar_url?: string | null; active: boolean };

type MemberRow = {
  player: GlobalPlayer;
  membership: { active: boolean; is_default_payer: boolean; shuttlecock_paid: boolean };
};

export default function ClubsTab() {
  const [club, setClub] = useState<AdminClub | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [clubMessage, setClubMessage] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);

  const [allPlayers, setAllPlayers] = useState<GlobalPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [addExistingPlayerId, setAddExistingPlayerId] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerSplitwiseUserId, setNewPlayerSplitwiseUserId] = useState("");

  const refreshMembers = async () => {
    if (!club?.id) return;
    setLoadingMembers(true);
    setMemberMessage(null);
    const data = await adminFetch<{ ok: boolean; members?: MemberRow[]; error?: string }>(`/api/admin/clubs/${club.id}/members`);
    if (!data.ok) {
      setMembers([]);
      setMemberMessage(data.error ?? "Failed to load members.");
      setLoadingMembers(false);
      return;
    }
    setMembers(Array.isArray(data.members) ? data.members : []);
    setLoadingMembers(false);
  };

  const refreshGlobalPlayers = async () => {
    setLoadingPlayers(true);
    const data = await adminFetch<{ ok: boolean; players?: GlobalPlayer[]; error?: string }>("/api/admin/players");
    if (!data.ok) {
      setAllPlayers([]);
      setLoadingPlayers(false);
      return;
    }
    setAllPlayers(Array.isArray(data.players) ? data.players : []);
    setLoadingPlayers(false);
  };

  useEffect(() => {
    if (!club?.id) return;
    setRenameDraft(club.name);
    void refreshMembers();
    void refreshGlobalPlayers();
  }, [club?.id]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.player.id)), [members]);
  const eligiblePlayers = useMemo(
    () => allPlayers.filter((p) => !memberIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [allPlayers, memberIds],
  );

  const renameClub = async () => {
    if (!club?.id) return;
    setClubMessage(null);
    const name = renameDraft.trim();
    if (!name) {
      setClubMessage("Enter a club name.");
      return;
    }
    const data = await adminFetch<{ ok: boolean; club?: AdminClub; error?: string }>(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!data.ok || !data.club) {
      setClubMessage(data.error ?? "Rename failed.");
      return;
    }
    setClub(data.club);
    setClubMessage("Club renamed.");
  };

  const addExistingMember = async () => {
    if (!club?.id) return;
    const playerId = addExistingPlayerId.trim();
    if (!playerId) {
      setMemberMessage("Select a player first.");
      return;
    }
    setMemberMessage(null);
    const data = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/clubs/${club.id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!data.ok) {
      setMemberMessage(data.error ?? "Add member failed.");
      return;
    }
    setAddExistingPlayerId("");
    await refreshMembers();
    await refreshGlobalPlayers();
    setMemberMessage("Member added.");
  };

  const createAndAddMember = async () => {
    if (!club?.id) return;
    const name = newPlayerName.trim();
    if (!name) {
      setMemberMessage("Enter a player name.");
      return;
    }
    setMemberMessage(null);
    const data = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/clubs/${club.id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, splitwiseUserId: newPlayerSplitwiseUserId.trim() || null }),
    });
    if (!data.ok) {
      setMemberMessage(data.error ?? "Create+add failed.");
      return;
    }
    setNewPlayerName("");
    setNewPlayerSplitwiseUserId("");
    await refreshMembers();
    await refreshGlobalPlayers();
    setMemberMessage("Player created and added.");
  };

  const updateMember = async (playerId: string, updates: { active?: boolean; isDefaultPayer?: boolean; shuttlecockPaid?: boolean }) => {
    if (!club?.id) return;
    setMemberMessage(null);
    const response = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/clubs/${club.id}/members/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      setMemberMessage(response.error ?? "Member update failed.");
      return;
    }
    await refreshMembers();
  };

  const removeMember = async (playerId: string) => {
    if (!club?.id) return;
    setMemberMessage(null);
    const response = await adminFetch<{ ok: boolean; error?: string }>(`/api/admin/clubs/${club.id}/members/${playerId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setMemberMessage(response.error ?? "Remove failed.");
      return;
    }
    await refreshMembers();
    await refreshGlobalPlayers();
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Clubs</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Manage clubs, members, access tokens, and Splitwise settings.
        </p>
        <AdminClubSelector onClubChange={setClub} className="mt-4" />
        {club ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Rename club</span>
              <input className="v2-admin-input" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
            </label>
            <div className="flex items-end">
              <button type="button" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" onClick={renameClub}>
                Save name
              </button>
            </div>
          </div>
        ) : null}
        {clubMessage ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{clubMessage}</p> : null}
      </div>

      {club ? (
        <AdminClubProvider club={club}>
          <div className="card">
            <h3 className="text-lg font-semibold">Members</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Add existing players or create new players in this club.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-4 dark:border-ink-700/60 dark:bg-ink-900/30">
                <p className="text-sm font-semibold">Add existing player</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <select className="v2-admin-select flex-1" value={addExistingPlayerId} onChange={(e) => setAddExistingPlayerId(e.target.value)}>
                    <option value="">Select player…</option>
                    {eligiblePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" onClick={addExistingMember}>
                    Add
                  </button>
                </div>
                {loadingPlayers ? <p className="mt-2 text-xs text-slate-500">Loading players…</p> : null}
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-4 dark:border-ink-700/60 dark:bg-ink-900/30">
                <p className="text-sm font-semibold">Create new player</p>
                <div className="mt-2 grid gap-3">
                  <input className="v2-admin-input" placeholder="Player name (unique)" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                  <input className="v2-admin-input" placeholder="Splitwise user id (optional)" value={newPlayerSplitwiseUserId} onChange={(e) => setNewPlayerSplitwiseUserId(e.target.value)} />
                  <button type="button" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" onClick={createAndAddMember}>
                    Create + Add
                  </button>
                </div>
              </div>
            </div>

            {memberMessage ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{memberMessage}</p> : null}

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-ink-700/60">
              <table className="min-w-[720px] table-auto text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-ink-900/30 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Default payer</th>
                    <th className="px-4 py-3">Shuttlecock paid</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={5}>
                        Loading members…
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={5}>
                        No members yet.
                      </td>
                    </tr>
                  ) : (
                    members.map((row) => (
                      <tr key={row.player.id} className="border-t border-slate-200/70 dark:border-ink-700/60">
                        <td className="px-4 py-3">{row.player.name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={row.membership.active}
                            onChange={(e) => void updateMember(row.player.id, { active: e.target.checked })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={row.membership.is_default_payer}
                            onChange={(e) => void updateMember(row.player.id, { isDefaultPayer: e.target.checked })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={row.membership.shuttlecock_paid}
                            onChange={(e) => void updateMember(row.player.id, { shuttlecockPaid: e.target.checked })}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" className="v2-admin-chip v2-admin-chip-danger" onClick={() => void removeMember(row.player.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Club Access</h3>
            <ClubAccessTab />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Splitwise</h3>
            <SplitwiseTab />
          </div>
        </AdminClubProvider>
      ) : null}
    </section>
  );
}

