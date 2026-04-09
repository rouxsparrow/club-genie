"use client";

import { Lock } from "../../components/icons";
import { useEffect, useState } from "react";

type ClubTokenWarningCode = "migration_missing_token_value" | "token_not_recoverable";

type ClubTokenCurrentResponse = {
  ok: boolean;
  token?: string | null;
  tokenVersion?: number | null;
  rotatedAt?: string | null;
  warningCode?: ClubTokenWarningCode;
  warningMessage?: string;
  error?: string;
};

export default function ClubAccessTab() {
  const [isRotating, setIsRotating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentAccessLink, setCurrentAccessLink] = useState<string | null>(null);
  const [clubMessage, setClubMessage] = useState<string | null>(null);

  const refreshCurrentClubToken = async () => {
    const response = await fetch("/api/admin/club-token/current", { credentials: "include" });
    const data = (await response.json()) as ClubTokenCurrentResponse;
    if (!data.ok) {
      setClubMessage(data.error ?? "Failed to load current token from DB.");
      setCurrentToken(null);
      setCurrentAccessLink(null);
      return;
    }
    const token = typeof data.token === "string" && data.token.trim() ? data.token : null;
    setCurrentToken(token);
    setCurrentAccessLink(token ? `${window.location.origin}/sessions?t=${token}` : null);
    if (!token && data.warningMessage) {
      setClubMessage(data.warningMessage);
      return;
    }
    setClubMessage(null);
  };

  useEffect(() => {
    void refreshCurrentClubToken();
  }, []);

  const handleRotateToken = async () => {
    setIsRotating(true);
    setRotationError(null);
    setClubMessage(null);
    const response = await fetch("/api/admin/club-token/rotate", {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as {
      ok: boolean;
      token?: string;
      error?: string;
      warningCode?: "token_value_not_persisted";
      warningMessage?: string;
    };
    if (!data.ok || !data.token) {
      setRotationError(data.error ?? "Token rotation failed.");
      setIsRotating(false);
      return;
    }
    setNewToken(data.token);
    setCurrentToken(data.token);
    setCurrentAccessLink(`${window.location.origin}/sessions?t=${data.token}`);
    await refreshCurrentClubToken();
    if (data.warningMessage) {
      setRotationError(data.warningMessage);
    }
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

  return (
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
        <p className="mt-4 text-xs text-slate-400">Example: https://your-app/sessions?t=NEW_TOKEN</p>
      </div>
      <div className="card md:col-span-2">
        <h3 className="text-lg font-semibold">Current Access Link</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          This access link is built from the current token stored in Supabase.
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
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              No token found in Supabase yet. Rotate once to create one.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyCurrentAccessLink}
                disabled
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                Copy Current Link
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
