"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "./admin-fetch";
import { readSelectedClubId, writeSelectedClubId } from "../../lib/admin-club";

export type AdminClub = { id: string; name: string };

type ClubsResponse = { ok: boolean; clubs?: AdminClub[]; error?: string };

export default function AdminClubSelector(props: {
  onClubChange: (club: AdminClub | null) => void;
  className?: string;
}) {
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [newClubName, setNewClubName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadClubs = async () => {
    setMessage(null);
    const data = await adminFetch<ClubsResponse>("/api/admin/clubs");
    if (!data.ok) {
      setMessage(data.error ?? "Failed to load clubs.");
      return;
    }
    const next = Array.isArray(data.clubs) ? data.clubs : [];
    setClubs(next);
    const stored = readSelectedClubId();
    const fallback = stored && next.some((c) => c.id === stored) ? stored : (next[0]?.id ?? "");
    setSelectedClubId(fallback);
  };

  useEffect(() => {
    void loadClubs();
  }, []);

  useEffect(() => {
    if (!selectedClubId) {
      props.onClubChange(null);
      return;
    }
    writeSelectedClubId(selectedClubId);
    props.onClubChange(clubs.find((c) => c.id === selectedClubId) ?? null);
  }, [selectedClubId, clubs]);

  const createClub = async () => {
    setMessage(null);
    const name = newClubName.trim();
    if (!name) {
      setMessage("Enter a club name.");
      return;
    }
    const data = await adminFetch<{ ok: boolean; club?: AdminClub; error?: string }>("/api/admin/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!data.ok || !data.club) {
      setMessage(data.error ?? "Failed to create club.");
      return;
    }
    setNewClubName("");
    await loadClubs();
    setSelectedClubId(data.club.id);
    setMessage("Club created.");
  };

  return (
    <div className={props.className ?? ""}>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Club</span>
          <select
            className="v2-admin-select"
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
          >
            {clubs.length === 0 ? <option value="">No clubs</option> : null}
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">New club</span>
          <div className="flex flex-wrap gap-3">
            <input
              className="v2-admin-input flex-1"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              placeholder="Club name"
            />
            <button type="button" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900" onClick={createClub}>
              Create
            </button>
          </div>
        </label>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{message}</p> : null}
    </div>
  );
}
