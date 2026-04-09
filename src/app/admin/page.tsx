"use client";

import { useEffect, useState } from "react";
import { renderAdminTabNav, renderAdminTabPanels } from "../../components/admin/admin-tab-shell";
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

        {renderAdminTabNav(activeTab, setActiveTab)}
        {renderAdminTabPanels(activeTab, keepMounted)}
      </div>
    </main>
  );
}
