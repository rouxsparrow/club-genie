"use client";

import { useEffect, useState } from "react";
import { collectNotIngestedMessageIds } from "../../lib/admin-email-preview-rerun";
import { adminFetch } from "./admin-fetch";
import { formatDuration, formatIngestionHistorySummary } from "./formatters";
import type {
  EmailPreviewMessage,
  RunHistoryEntry,
  RunHistorySourceFilter,
  RunHistoryStatusFilter,
} from "./types";

type AutomationSettings = {
  id: number;
  subject_keywords: string[];
  timezone: string;
  enabled: boolean;
  updated_at: string | null;
};

type ReceiptError = {
  id: string;
  gmail_message_id: string;
  parse_error: string | null;
  received_at: string | null;
};

type AutomationRunSummary = {
  total: number;
  ingested: number;
  deduped: number;
  parse_failed: number;
  fetch_failed: number;
};

type AutomationTabProps = {
  previewMessages?: EmailPreviewMessage[];
};

export default function AutomationTab({ previewMessages = [] }: AutomationTabProps) {
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [loadingAutomation, setLoadingAutomation] = useState(true);
  const [automationMessage, setAutomationMessage] = useState<string | null>(null);
  const [runningIngestion, setRunningIngestion] = useState(false);
  const [runSummary, setRunSummary] = useState<AutomationRunSummary | null>(null);
  const [automationHistoryStatusFilter, setAutomationHistoryStatusFilter] = useState<RunHistoryStatusFilter>("ALL");
  const [automationHistorySourceFilter, setAutomationHistorySourceFilter] = useState<RunHistorySourceFilter>("ALL");
  const [automationRunHistory, setAutomationRunHistory] = useState<RunHistoryEntry[]>([]);
  const [loadingAutomationRunHistory, setLoadingAutomationRunHistory] = useState(false);
  const [receiptErrors, setReceiptErrors] = useState<ReceiptError[]>([]);
  const [loadingReceiptErrors, setLoadingReceiptErrors] = useState(true);

  const refreshAutomationSettings = async () => {
    setLoadingAutomation(true);
    const data = await adminFetch<{ ok: boolean; settings?: AutomationSettings; error?: string }>(
      "/api/admin/automation-settings",
    );
    if (!data.ok || !data.settings) {
      setAutomationMessage(data.error ?? "Failed to load automation settings.");
      setLoadingAutomation(false);
      return;
    }
    setAutomationSettings(data.settings);
    setKeywordsInput((data.settings.subject_keywords ?? []).join(", "));
    setLoadingAutomation(false);
  };

  const refreshReceiptErrors = async () => {
    setLoadingReceiptErrors(true);
    const data = await adminFetch<{ ok: boolean; errors?: ReceiptError[]; error?: string }>(
      "/api/admin/receipt-errors",
    );
    if (data.ok) {
      setReceiptErrors(data.errors ?? []);
    }
    setLoadingReceiptErrors(false);
  };

  const loadAutomationRunHistory = async () => {
    setLoadingAutomationRunHistory(true);
    const qs = new URLSearchParams();
    if (automationHistoryStatusFilter !== "ALL") {
      qs.set("status", automationHistoryStatusFilter);
    }
    if (automationHistorySourceFilter !== "ALL") {
      qs.set("source", automationHistorySourceFilter);
    }
    qs.set("limit", "30");
    const data = await adminFetch<{ ok: boolean; runs?: RunHistoryEntry[]; error?: string }>(
      `/api/admin/automation/run-history?${qs.toString()}`,
    );
    if (!data?.ok) {
      setAutomationMessage(data?.error ?? "Failed to load run history.");
      setLoadingAutomationRunHistory(false);
      return;
    }
    setAutomationRunHistory(Array.isArray(data.runs) ? data.runs : []);
    setLoadingAutomationRunHistory(false);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminFetch<{ ok: boolean; settings?: AutomationSettings; error?: string }>("/api/admin/automation-settings"),
      adminFetch<{ ok: boolean; errors?: ReceiptError[]; error?: string }>("/api/admin/receipt-errors"),
    ])
      .then(([settingsData, errorsData]) => {
        if (!isMounted) return;
        const settingsPayload = settingsData as { ok: boolean; settings?: AutomationSettings; error?: string };
        if (settingsPayload.ok && settingsPayload.settings) {
          setAutomationSettings(settingsPayload.settings);
          setKeywordsInput((settingsPayload.settings.subject_keywords ?? []).join(", "));
        } else {
          setAutomationMessage(settingsPayload.error ?? "Failed to load automation settings.");
        }
        setLoadingAutomation(false);

        const errorsPayload = errorsData as { ok: boolean; errors?: ReceiptError[]; error?: string };
        if (errorsPayload.ok) {
          setReceiptErrors(errorsPayload.errors ?? []);
        }
        setLoadingReceiptErrors(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setAutomationMessage("Failed to load automation settings.");
        setLoadingAutomation(false);
        setLoadingReceiptErrors(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveAutomationSettings = async () => {
    const keywords = keywordsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      setAutomationMessage("Provide at least one subject keyword.");
      return;
    }

    const response = await fetch("/api/admin/automation-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subjectKeywords: keywords }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; settings?: AutomationSettings; error?: string }
      | null;
    if (!data?.ok || !data.settings) {
      setAutomationMessage(data?.error ?? "Failed to save settings.");
      return;
    }
    setAutomationSettings(data.settings);
    setKeywordsInput((data.settings.subject_keywords ?? []).join(", "));
    setAutomationMessage("Automation settings saved.");
  };

  const runIngestionNow = async () => {
    setRunningIngestion(true);
    setAutomationMessage(null);
    const notIngestedMessageIds = collectNotIngestedMessageIds(previewMessages);
    const response = await fetch("/api/admin/ingestion/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(notIngestedMessageIds.length > 0 ? { messageIds: notIngestedMessageIds } : {}),
    });
    const data = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          total?: number;
          ingested?: number;
          deduped?: number;
          parse_failed?: number;
          fetch_failed?: number;
          error?: string;
        }
      | null;
    if (!data?.ok) {
      setAutomationMessage(data?.error ?? "Ingestion run failed.");
      setRunningIngestion(false);
      return;
    }

    setRunSummary({
      total: data.total ?? 0,
      ingested: data.ingested ?? 0,
      deduped: data.deduped ?? 0,
      parse_failed: data.parse_failed ?? 0,
      fetch_failed: data.fetch_failed ?? 0,
    });
    setAutomationMessage(
      notIngestedMessageIds.length > 0
        ? `Ingestion run completed. Included ${notIngestedMessageIds.length} preview Not Ingested email(s).`
        : "Ingestion run completed. No preview Not Ingested emails were included.",
    );
    setRunningIngestion(false);
    await Promise.all([refreshReceiptErrors(), refreshAutomationSettings(), loadAutomationRunHistory()]);
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Receipt Ingestion</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Configure Gmail subject matching and run ingestion manually when needed.
        </p>
        {automationMessage ? <p className="mt-3 text-sm text-slate-500">{automationMessage}</p> : null}
        {loadingAutomation ? (
          <p className="mt-4 text-sm text-slate-500">Loading automation settings...</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr]">
            <label className="text-sm font-semibold">
              Subject Keywords (comma separated)
              <input
                type="text"
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="Playtomic, Receipt"
              />
            </label>
            <label className="text-sm font-semibold">
              Timezone
              <input
                type="text"
                value={automationSettings?.timezone ?? "Asia/Singapore"}
                disabled
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-900/40"
              />
            </label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveAutomationSettings}
            disabled={loadingAutomation}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            Save Settings
          </button>
          <button
            type="button"
            onClick={runIngestionNow}
            disabled={runningIngestion}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100 disabled:opacity-60"
          >
            {runningIngestion ? "Running..." : "Run Ingestion Now"}
          </button>
        </div>
        {runSummary ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60 md:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
              <p className="font-semibold">{runSummary.total}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Ingested</p>
              <p className="font-semibold">{runSummary.ingested}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Deduped</p>
              <p className="font-semibold">{runSummary.deduped}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Parse Failed</p>
              <p className="font-semibold">{runSummary.parse_failed}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Fetch Failed</p>
              <p className="font-semibold">{runSummary.fetch_failed}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Ingestion Run History</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Query cron and manual ingestion run results.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={automationHistorySourceFilter}
              onChange={(event) => setAutomationHistorySourceFilter(event.target.value as RunHistorySourceFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
            >
              <option value="ALL">All Sources</option>
              <option value="GITHUB_CRON">GitHub Cron</option>
              <option value="ADMIN_MANUAL">Admin Manual</option>
              <option value="API">API</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select
              value={automationHistoryStatusFilter}
              onChange={(event) => setAutomationHistoryStatusFilter(event.target.value as RunHistoryStatusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">RUNNING</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>
            <button
              type="button"
              onClick={loadAutomationRunHistory}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
            >
              {loadingAutomationRunHistory ? "Loading..." : "Load History"}
            </button>
          </div>
        </div>

        {automationRunHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{loadingAutomationRunHistory ? "" : "No runs found."}</p>
        ) : (
          <div className="v2-admin-table-wrap mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-ink-700/60">
            <table className="w-full min-w-[640px] text-left text-xs sm:min-w-[900px] sm:text-sm">
              <thead className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-ink-900/40 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
                {automationRunHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">{entry.started_at ? new Date(entry.started_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{entry.run_source}</td>
                    <td className="px-4 py-3">{entry.status}</td>
                    <td className="px-4 py-3">{formatDuration(entry.duration_ms)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">
                      {formatIngestionHistorySummary(entry.summary)}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-500">{entry.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Parse Failures</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Latest receipt parse failures that require admin review.
        </p>
        {loadingReceiptErrors ? (
          <p className="mt-4 text-sm text-slate-500">Loading failures...</p>
        ) : receiptErrors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No parse failures.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {receiptErrors.map((error) => (
              <li key={error.id} className="rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
                <p className="font-semibold">{error.gmail_message_id}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-300">{error.parse_error ?? "parse_failed"}</p>
                {error.received_at ? (
                  <p className="mt-1 text-xs text-slate-400">{new Date(error.received_at).toLocaleString()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
