"use client";

import { useEffect, useMemo, useState } from "react";

type AdminSessionUser = {
  id: string | null;
  username: string;
  isBreakglass: boolean;
  mustChangePassword?: boolean;
};

type AdminAccount = {
  id: string;
  username: string;
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string | null;
};

type AdminSessionResponse = {
  ok: boolean;
  user?: AdminSessionUser;
};

type AccountsResponse = {
  ok: boolean;
  accounts?: AdminAccount[];
  error?: string;
};

export default function AdminAccountsPanel() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminSessionUser | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [usernameDrafts, setUsernameDrafts] = useState<Record<string, string>>({});
  const [activeDrafts, setActiveDrafts] = useState<Record<string, boolean>>({});
  const [resetPasswordDrafts, setResetPasswordDrafts] = useState<Record<string, string>>({});
  const [resetMustChangeDrafts, setResetMustChangeDrafts] = useState<Record<string, boolean>>({});
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [myCurrentPassword, setMyCurrentPassword] = useState("");
  const [myNewPassword, setMyNewPassword] = useState("");

  const breakglassWarning = useMemo(() => {
    if (!currentUser?.isBreakglass) return null;
    return "Break-glass mode active. Create/fix a DB admin account, then disable ENABLE_ADMIN_BREAKGLASS.";
  }, [currentUser]);

  const syncDraftsFromAccounts = (rows: AdminAccount[]) => {
    setUsernameDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (!(row.id in next)) next[row.id] = row.username;
      });
      return next;
    });
    setActiveDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (!(row.id in next)) next[row.id] = row.active;
      });
      return next;
    });
    setResetMustChangeDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (!(row.id in next)) next[row.id] = true;
      });
      return next;
    });
  };

  const refreshAll = async () => {
    setLoading(true);
    setMessage(null);
    const [sessionResponse, accountsResponse] = await Promise.all([
      fetch("/api/admin-session", { credentials: "include" }).then((r) => r.json()).catch(() => null),
      fetch("/api/admin/accounts", { credentials: "include" }).then((r) => r.json()).catch(() => null)
    ]);

    const sessionData = sessionResponse as AdminSessionResponse | null;
    const accountsData = accountsResponse as AccountsResponse | null;

    if (!sessionData?.ok || !sessionData.user) {
      setCurrentUser(null);
      setAccounts([]);
      setMessage("Failed to load current admin session.");
      setLoading(false);
      return;
    }
    setCurrentUser(sessionData.user);

    if (!accountsData?.ok) {
      setAccounts([]);
      setMessage(accountsData?.error ?? "Failed to load admin accounts.");
      setLoading(false);
      return;
    }
    const rows = accountsData.accounts ?? [];
    setAccounts(rows);
    syncDraftsFromAccounts(rows);
    setLoading(false);
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const createAccount = async () => {
    setMessage(null);
    const response = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        active: newActive
      })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setMessage(data?.error ?? "Failed to create account.");
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setNewActive(true);
    await refreshAll();
    setMessage("Account created.");
  };

  const saveAccount = async (accountId: string) => {
    setMessage(null);
    const response = await fetch(`/api/admin/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: usernameDrafts[accountId],
        active: Boolean(activeDrafts[accountId])
      })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setMessage(data?.error ?? "Failed to update account.");
      return;
    }
    await refreshAll();
    setMessage("Account updated.");
  };

  const resetPassword = async (accountId: string) => {
    setMessage(null);
    const password = (resetPasswordDrafts[accountId] ?? "").trim();
    if (!password) {
      setMessage("Enter a password before reset.");
      return;
    }
    const response = await fetch(`/api/admin/accounts/${accountId}/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        password,
        mustChangePassword: Boolean(resetMustChangeDrafts[accountId])
      })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setMessage(data?.error ?? "Failed to reset password.");
      return;
    }
    setResetPasswordDrafts((prev) => ({ ...prev, [accountId]: "" }));
    setMessage("Password reset completed.");
  };

  const changeMyPassword = async () => {
    setMessage(null);
    const response = await fetch("/api/admin/account/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword: myCurrentPassword,
        newPassword: myNewPassword
      })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setMessage(data?.error ?? "Failed to change password.");
      return;
    }
    setMyCurrentPassword("");
    setMyNewPassword("");
    await refreshAll();
    setMessage("Password changed.");
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Admin Accounts</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Manage account-based access for admin operations.
        </p>
        {breakglassWarning ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
            {breakglassWarning}
          </p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-slate-500">{message}</p> : null}

        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200/70 p-4 dark:border-ink-700/60 md:grid-cols-4">
          <label className="text-sm font-semibold">
            Username
            <input
              type="text"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              placeholder="new-admin"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              placeholder="min 10 chars, letter + number"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold md:self-end">
            <input type="checkbox" checked={newActive} onChange={(event) => setNewActive(event.target.checked)} />
            Active
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={createAccount}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Accounts List</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No admin accounts yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {accounts.map((account) => {
              const isSelf = Boolean(currentUser?.id && currentUser.id === account.id);
              return (
                <div key={account.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-ink-700/60">
                  <div className="grid gap-3 md:grid-cols-6">
                    <label className="text-sm font-semibold md:col-span-2">
                      Username
                      <input
                        type="text"
                        value={usernameDrafts[account.id] ?? account.username}
                        onChange={(event) => setUsernameDrafts((prev) => ({ ...prev, [account.id]: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold md:self-end">
                      <input
                        type="checkbox"
                        checked={activeDrafts[account.id] ?? account.active}
                        onChange={(event) => setActiveDrafts((prev) => ({ ...prev, [account.id]: event.target.checked }))}
                      />
                      Active
                    </label>
                    <div className="text-sm md:col-span-2">
                      <p className="font-semibold">Status</p>
                      <p className="mt-1 text-slate-500 dark:text-slate-300">
                        {account.must_change_password ? "Must change password" : "Password OK"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Last login: {account.last_login_at ? new Date(account.last_login_at).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="md:self-end">
                      <button
                        type="button"
                        onClick={() => saveAccount(account.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
                      >
                        Save
                      </button>
                      {isSelf ? <p className="mt-1 text-xs text-slate-400">This is your account.</p> : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-ink-700/60 md:grid-cols-6">
                    <label className="text-sm font-semibold md:col-span-2">
                      Reset Password
                      <input
                        type="password"
                        value={resetPasswordDrafts[account.id] ?? ""}
                        onChange={(event) => setResetPasswordDrafts((prev) => ({ ...prev, [account.id]: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                        placeholder="new password"
                        disabled={isSelf}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold md:self-end">
                      <input
                        type="checkbox"
                        checked={resetMustChangeDrafts[account.id] ?? true}
                        onChange={(event) =>
                          setResetMustChangeDrafts((prev) => ({ ...prev, [account.id]: event.target.checked }))
                        }
                        disabled={isSelf}
                      />
                      Must change on next login
                    </label>
                    <div className="md:self-end">
                      <button
                        type="button"
                        onClick={() => resetPassword(account.id)}
                        disabled={isSelf}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-ink-700/60 dark:text-slate-100"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Change My Password</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Update your own password and rotate your admin session.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold">
            Current Password
            <input
              type="password"
              value={myCurrentPassword}
              onChange={(event) => setMyCurrentPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            New Password
            <input
              type="password"
              value={myNewPassword}
              onChange={(event) => setMyNewPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              placeholder="min 10 chars, letter + number"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={changeMyPassword}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Change Password
          </button>
        </div>
      </div>
    </section>
  );
}
