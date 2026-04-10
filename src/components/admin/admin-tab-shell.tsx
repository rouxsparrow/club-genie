"use client";

import type { ComponentType, Dispatch, SetStateAction } from "react";
import AccountsTab from "./accounts-tab";
import AutomationTab from "./automation-tab";
import ClubAccessTab from "./club-access-tab";
import EmailsTab from "./emails-tab";
import PlayersTab from "./players-tab";
import SplitwiseTab from "./splitwise-tab";
import type { EmailPreviewMessage, TabKey } from "./types";

type AdminTabDefinition = {
  key: TabKey;
  label: string;
  eager: boolean;
  component: ComponentType;
};

type AdminTabShellOptions = {
  emailPreviewMessages: EmailPreviewMessage[];
  onEmailPreviewMessagesChange: (messages: EmailPreviewMessage[]) => void;
};

const ADMIN_TABS: AdminTabDefinition[] = [
  { key: "accounts", label: "Accounts", eager: false, component: AccountsTab },
  { key: "players", label: "Players", eager: true, component: PlayersTab },
  { key: "club", label: "Club Access", eager: true, component: ClubAccessTab },
  { key: "automation", label: "Automation", eager: true, component: AutomationTab },
  { key: "emails", label: "Email Preview", eager: false, component: EmailsTab },
  { key: "splitwise", label: "Splitwise", eager: true, component: SplitwiseTab },
];

export const ADMIN_EAGER_TABS: TabKey[] = ADMIN_TABS.filter((tab) => tab.eager).map((tab) => tab.key);

export function renderAdminTabNav(activeTab: TabKey, setActiveTab: Dispatch<SetStateAction<TabKey>>) {
  return (
    <nav className="v2-admin-tab-nav mt-8 flex gap-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {ADMIN_TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === key
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function renderAdminTabPanels(
  activeTab: TabKey,
  keepMounted: (tab: TabKey) => boolean,
  options: AdminTabShellOptions,
) {
  return ADMIN_TABS.map(({ key, component: Component }) => {
    if (!keepMounted(key)) return null;

    return (
      <div key={key} hidden={activeTab !== key} aria-hidden={activeTab !== key}>
        {key === "automation" ? (
          <AutomationTab previewMessages={options.emailPreviewMessages} />
        ) : key === "emails" ? (
          <EmailsTab onPreviewMessagesChange={options.onEmailPreviewMessagesChange} />
        ) : (
          <Component />
        )}
      </div>
    );
  });
}
