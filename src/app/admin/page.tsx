"use client";

import { useEffect, useState } from "react";
import AccountsTab from "../../components/admin/accounts-tab";
import AutomationTab from "../../components/admin/automation-tab";
import ClubAccessTab from "../../components/admin/club-access-tab";
import EmailsTab from "../../components/admin/emails-tab";
import PlayersTab from "../../components/admin/players-tab";
import SplitwiseTab from "../../components/admin/splitwise-tab";
import type { TabKey } from "../../components/admin/types";
import AdminNavbar from "../../components/admin-navbar";
import AnimatedBackground from "../../components/v2/AnimatedBackground";
import "../globals-v2.css";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("players");
  const [mounted, setMounted] = useState(false);
  const eagerMountedTabs: TabKey[] = ["players", "club", "automation", "splitwise"];
  const [visitedTabs, setVisitedTabs] = useState<Record<TabKey, boolean>>({
    accounts: false,
    players: true,
    club: false,
    automation: false,
    emails: false,
    splitwise: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  const hasVisited = (tab: TabKey) => eagerMountedTabs.includes(tab) || visitedTabs[tab];
  const keepMounted = (tab: TabKey) => hasVisited(tab);

  if (!mounted) {
    return (
      <main className="v2-page v2-admin-page">
        <AnimatedBackground />
      </main>
    );
  }

  return (
    <main className="v2-page v2-admin-page">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-6">
          <AdminNavbar currentPath="/admin" className="v2-admin-nav v2-admin-navbar" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Admin Console</p>
              <h1 className="mt-2 text-4xl font-semibold">Club Control Room</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-300">
                Manage players, access tokens, and session operations.
              </p>
            </div>
          </div>
        </header>

        <nav className="v2-admin-tab-nav mt-8 flex gap-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === "accounts"
                ? "bg-emerald-500 text-slate-900"
                : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Accounts
          </button>
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
          <button
            type="button"
            onClick={() => setActiveTab("automation")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === "automation"
                ? "bg-emerald-500 text-slate-900"
                : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Automation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emails")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === "emails"
                ? "bg-emerald-500 text-slate-900"
                : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Email Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("splitwise")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === "splitwise"
                ? "bg-emerald-500 text-slate-900"
                : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
            }`}
          >
            Splitwise
          </button>
        </nav>

        {keepMounted("accounts") ? (
          <div hidden={activeTab !== "accounts"} aria-hidden={activeTab !== "accounts"}>
            <AccountsTab />
          </div>
        ) : null}

        {keepMounted("players") ? (
          <div hidden={activeTab !== "players"} aria-hidden={activeTab !== "players"}>
            <PlayersTab />
          </div>
        ) : null}

        {keepMounted("club") ? (
          <div hidden={activeTab !== "club"} aria-hidden={activeTab !== "club"}>
            <ClubAccessTab />
          </div>
        ) : null}

        {keepMounted("automation") ? (
          <div hidden={activeTab !== "automation"} aria-hidden={activeTab !== "automation"}>
            <AutomationTab />
          </div>
        ) : null}

        {keepMounted("emails") ? (
          <div hidden={activeTab !== "emails"} aria-hidden={activeTab !== "emails"}>
            <EmailsTab />
          </div>
        ) : null}

        {keepMounted("splitwise") ? (
          <div hidden={activeTab !== "splitwise"} aria-hidden={activeTab !== "splitwise"}>
            <SplitwiseTab />
          </div>
        ) : null}
      </div>
    </main>
  );
}
