"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatSplitwiseHistorySummary } from "./formatters";
import type { RunHistoryEntry, RunHistorySourceFilter, RunHistoryStatusFilter } from "./types";

type SplitwiseSettings = {
  id: number;
  group_id: number;
  currency_code: string;
  enabled: boolean;
  shuttlecock_fee?: number;
  description_template?: string;
  date_format?: string;
  location_replacements?: Array<{ from: string; to: string }>;
  updated_at: string | null;
};

type SplitwiseRunSummary = {
  closed_updated: number;
  splitwise_created: number;
  splitwise_skipped: number;
  splitwise_failed: number;
};

type SplitwiseRunError = {
  session_id: string;
  session_date?: string;
  code: string;
  message: string;
};

type SplitwiseExpenseRecord = {
  id: string;
  session_id: string;
  expense_type?: "COURT" | "SHUTTLECOCK" | null;
  splitwise_expense_id: string | null;
  amount: number | null;
  status: string | null;
  last_error: string | null;
  note?: string | null;
  updated_at: string | null;
  created_at: string | null;
  session?: {
    id: string;
    session_date: string;
    status: string | null;
    splitwise_status: string | null;
    location: string | null;
  } | null;
};

export default function SplitwiseTab() {
  const [splitwiseSettings, setSplitwiseSettings] = useState<SplitwiseSettings | null>(null);
  const [splitwiseGroupIdInput, setSplitwiseGroupIdInput] = useState("");
  const [splitwiseCurrencyInput, setSplitwiseCurrencyInput] = useState("SGD");
  const [splitwiseEnabled, setSplitwiseEnabled] = useState(true);
  const [splitwiseShuttlecockFeeInput, setSplitwiseShuttlecockFeeInput] = useState("4.00");
  const [splitwiseDescriptionTemplate, setSplitwiseDescriptionTemplate] = useState(
    "Badminton {session_date} - {location}",
  );
  const [splitwiseDateFormat, setSplitwiseDateFormat] = useState<"DD/MM/YY" | "YYYY-MM-DD">("DD/MM/YY");
  const [splitwiseLocationMappingsText, setSplitwiseLocationMappingsText] = useState(
    "Club Sbh East Coast @ Expo => Expo",
  );
  const [loadingSplitwise, setLoadingSplitwise] = useState(true);
  const [splitwiseMessage, setSplitwiseMessage] = useState<string | null>(null);
  const [runningSplitwise, setRunningSplitwise] = useState(false);
  const [splitwiseTestResult, setSplitwiseTestResult] = useState<string | null>(null);
  const [splitwiseRunSummary, setSplitwiseRunSummary] = useState<SplitwiseRunSummary | null>(null);
  const [splitwiseRunErrors, setSplitwiseRunErrors] = useState<SplitwiseRunError[]>([]);
  const [splitwiseHistoryStatusFilter, setSplitwiseHistoryStatusFilter] = useState<RunHistoryStatusFilter>("ALL");
  const [splitwiseHistorySourceFilter, setSplitwiseHistorySourceFilter] = useState<RunHistorySourceFilter>("ALL");
  const [splitwiseRunHistory, setSplitwiseRunHistory] = useState<RunHistoryEntry[]>([]);
  const [loadingSplitwiseRunHistory, setLoadingSplitwiseRunHistory] = useState(false);
  const [splitwiseGroupsResult, setSplitwiseGroupsResult] = useState<{ groups: unknown[]; raw: unknown } | null>(
    null,
  );
  const [splitwiseGroupDetailIdInput, setSplitwiseGroupDetailIdInput] = useState("");
  const [splitwiseGroupDetailResult, setSplitwiseGroupDetailResult] = useState<{ group: unknown; raw: unknown } | null>(
    null,
  );
  const [splitwiseExpenseStatusFilter, setSplitwiseExpenseStatusFilter] = useState<
    "ALL" | "PENDING" | "CREATED" | "FAILED"
  >("ALL");
  const [splitwiseExpenseRecords, setSplitwiseExpenseRecords] = useState<SplitwiseExpenseRecord[]>([]);
  const [loadingSplitwiseRecords, setLoadingSplitwiseRecords] = useState(false);

  const hydrateSplitwiseSettings = (settings: SplitwiseSettings) => {
    setSplitwiseSettings(settings);
    setSplitwiseGroupIdInput(String(settings.group_id ?? 0));
    setSplitwiseCurrencyInput(settings.currency_code ?? "SGD");
    setSplitwiseEnabled(Boolean(settings.enabled));
    setSplitwiseShuttlecockFeeInput(typeof settings.shuttlecock_fee === "number" ? settings.shuttlecock_fee.toFixed(2) : "4.00");
    setSplitwiseGroupDetailIdInput(String(settings.group_id ?? 0));
    setSplitwiseDescriptionTemplate(
      typeof settings.description_template === "string" && settings.description_template.trim()
        ? settings.description_template.trim()
        : "Badminton {session_date} - {location}",
    );
    setSplitwiseDateFormat(
      typeof settings.date_format === "string" && settings.date_format.trim().toUpperCase() === "YYYY-MM-DD"
        ? "YYYY-MM-DD"
        : "DD/MM/YY",
    );
    const mappings = Array.isArray(settings.location_replacements)
      ? settings.location_replacements
          .map((row) => {
            const from = typeof row?.from === "string" ? row.from.trim() : "";
            const to = typeof row?.to === "string" ? row.to.trim() : "";
            if (!from || !to) return null;
            return `${from} => ${to}`;
          })
          .filter((line): line is string => Boolean(line))
      : [];
    setSplitwiseLocationMappingsText(mappings.length > 0 ? mappings.join("\n") : "");
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/splitwise-settings", { credentials: "include" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!isMounted) return;
        const payload = data as { ok?: boolean; settings?: SplitwiseSettings; error?: string } | null;
        if (payload?.ok && payload.settings) {
          hydrateSplitwiseSettings(payload.settings);
          setSplitwiseMessage(null);
        } else {
          setSplitwiseMessage(payload?.error ?? "Failed to load Splitwise settings.");
        }
        setLoadingSplitwise(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSplitwiseMessage("Failed to load Splitwise settings.");
        setLoadingSplitwise(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const loadSplitwiseRunHistory = async () => {
    setLoadingSplitwiseRunHistory(true);
    const qs = new URLSearchParams();
    if (splitwiseHistoryStatusFilter !== "ALL") {
      qs.set("status", splitwiseHistoryStatusFilter);
    }
    if (splitwiseHistorySourceFilter !== "ALL") {
      qs.set("source", splitwiseHistorySourceFilter);
    }
    qs.set("limit", "30");
    const response = await fetch(`/api/admin/splitwise/run-history?${qs.toString()}`, { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; runs?: RunHistoryEntry[]; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to load run history.");
      setLoadingSplitwiseRunHistory(false);
      return;
    }
    setSplitwiseRunHistory(Array.isArray(data.runs) ? data.runs : []);
    setLoadingSplitwiseRunHistory(false);
  };

  const saveSplitwiseSettings = async () => {
    setSplitwiseMessage(null);
    const locationReplacements = splitwiseLocationMappingsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [fromRaw, toRaw] = line.split("=>");
        const from = (fromRaw ?? "").trim();
        const to = (toRaw ?? "").trim();
        if (!from || !to) return null;
        return { from, to };
      })
      .filter((row): row is { from: string; to: string } => Boolean(row));

    const response = await fetch("/api/admin/splitwise-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        groupId: splitwiseGroupIdInput,
        currencyCode: splitwiseCurrencyInput,
        enabled: splitwiseEnabled,
        shuttlecockFee: splitwiseShuttlecockFeeInput,
        descriptionTemplate: splitwiseDescriptionTemplate,
        dateFormat: splitwiseDateFormat,
        locationReplacements,
      }),
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; settings?: SplitwiseSettings; error?: string } | null;
    if (!data?.ok || !data.settings) {
      setSplitwiseMessage(data?.error ?? "Failed to save Splitwise settings.");
      return;
    }
    hydrateSplitwiseSettings(data.settings);
    setSplitwiseMessage("Splitwise settings saved.");
  };

  const testSplitwise = async () => {
    setSplitwiseTestResult(null);
    const response = await fetch("/api/admin/splitwise/test", {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; currentUser?: { id?: number | null; first_name?: string | null; last_name?: string | null }; error?: string }
      | null;
    if (!data?.ok) {
      setSplitwiseTestResult(data?.error ?? "Splitwise test failed.");
      return;
    }
    const id = data.currentUser?.id ?? null;
    const name = [data.currentUser?.first_name, data.currentUser?.last_name].filter(Boolean).join(" ");
    setSplitwiseTestResult(`Connected as ${name || "user"}${id ? ` (id ${id})` : ""}.`);
  };

  const runSplitwiseNow = async () => {
    setRunningSplitwise(true);
    setSplitwiseMessage(null);
    setSplitwiseRunErrors([]);
    const response = await fetch("/api/admin/splitwise/run", {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          closed_updated?: number;
          splitwise_created?: number;
          splitwise_skipped?: number;
          splitwise_failed?: number;
          errors?: SplitwiseRunError[];
          error?: string;
        }
      | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Splitwise sync failed.");
      setRunningSplitwise(false);
      return;
    }
    setSplitwiseRunSummary({
      closed_updated: data.closed_updated ?? 0,
      splitwise_created: data.splitwise_created ?? 0,
      splitwise_skipped: data.splitwise_skipped ?? 0,
      splitwise_failed: data.splitwise_failed ?? 0,
    });
    setSplitwiseRunErrors(Array.isArray(data.errors) ? data.errors : []);
    setSplitwiseMessage("Splitwise sync completed.");
    setRunningSplitwise(false);
    await loadSplitwiseRunHistory();
  };

  const fetchSplitwiseGroups = async () => {
    setSplitwiseMessage(null);
    setSplitwiseGroupsResult(null);
    const response = await fetch("/api/admin/splitwise/groups", { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; groups?: unknown[]; raw?: unknown; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to fetch groups.");
      return;
    }
    setSplitwiseGroupsResult({ groups: Array.isArray(data.groups) ? data.groups : [], raw: data.raw ?? null });
  };

  const fetchSplitwiseGroupDetail = async () => {
    setSplitwiseMessage(null);
    setSplitwiseGroupDetailResult(null);
    const raw = splitwiseGroupDetailIdInput.trim() || splitwiseGroupIdInput.trim();
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setSplitwiseMessage("Provide a valid group id.");
      return;
    }
    const response = await fetch(`/api/admin/splitwise/groups/${parsed}`, { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; group?: unknown; raw?: unknown; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to fetch group detail.");
      return;
    }
    setSplitwiseGroupDetailResult({ group: data.group ?? null, raw: data.raw ?? null });
  };

  const loadSplitwiseRecords = async () => {
    setLoadingSplitwiseRecords(true);
    setSplitwiseMessage(null);
    const qs = new URLSearchParams();
    if (splitwiseExpenseStatusFilter !== "ALL") {
      qs.set("status", splitwiseExpenseStatusFilter);
    }
    qs.set("limit", "50");
    const response = await fetch(`/api/admin/splitwise/expenses?${qs.toString()}`, { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; records?: unknown[]; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to load Splitwise records.");
      setLoadingSplitwiseRecords(false);
      return;
    }
    setSplitwiseExpenseRecords(Array.isArray(data.records) ? (data.records as SplitwiseExpenseRecord[]) : []);
    setLoadingSplitwiseRecords(false);
  };

  const deleteSplitwiseRecord = async (expenseId: string) => {
    setSplitwiseMessage(null);
    const confirmed = window.confirm(
      "Delete this Splitwise record from our DB?\n\nSession splitwise_status will be recomputed from remaining records for that session.",
    );
    if (!confirmed) return;
    const response = await fetch(`/api/admin/splitwise/expenses/${expenseId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to delete Splitwise record.");
      return;
    }
    await loadSplitwiseRecords();
    setSplitwiseMessage("Splitwise record deleted from DB.");
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Splitwise</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Configure group settings, map players to Splitwise user IDs, and run the daily sync manually.
        </p>
        {splitwiseMessage ? <p className="mt-3 text-sm text-slate-500">{splitwiseMessage}</p> : null}
        {splitwiseTestResult ? <p className="mt-2 text-sm text-slate-500">{splitwiseTestResult}</p> : null}

        {loadingSplitwise ? (
          <p className="mt-4 text-sm text-slate-500">Loading Splitwise settings...</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="text-sm font-semibold">
              Group ID
              <input
                type="number"
                inputMode="numeric"
                value={splitwiseGroupIdInput}
                onChange={(event) => setSplitwiseGroupIdInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="e.g. 12345"
              />
            </label>
            <label className="text-sm font-semibold">
              Currency
              <input
                type="text"
                value={splitwiseCurrencyInput}
                onChange={(event) => setSplitwiseCurrencyInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="SGD"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={splitwiseEnabled}
                onChange={(event) => setSplitwiseEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <label className="text-sm font-semibold">
              Shuttlecock Fee
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={splitwiseShuttlecockFeeInput}
                onChange={(event) => setSplitwiseShuttlecockFeeInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="4.00"
              />
            </label>
          </div>
        )}

        <label className="mt-4 block text-sm font-semibold">
          Expense description template
          <textarea
            value={splitwiseDescriptionTemplate}
            onChange={(event) => setSplitwiseDescriptionTemplate(event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
            placeholder="Badminton {session_date} - {location}"
          />
          <span className="mt-2 block text-xs text-slate-400">
            Placeholders: <code>{"{session_date}"}</code>, <code>{"{location}"}</code>
          </span>
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Session date format
            <select
              value={splitwiseDateFormat}
              onChange={(event) => setSplitwiseDateFormat(event.target.value as "DD/MM/YY" | "YYYY-MM-DD")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
            >
              <option value="DD/MM/YY">DD/MM/YY (01/02/26)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-02-01)</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Location mappings
            <textarea
              value={splitwiseLocationMappingsText}
              onChange={(event) => setSplitwiseLocationMappingsText(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              placeholder={"Club Sbh East Coast @ Expo => Expo"}
            />
            <span className="mt-2 block text-xs text-slate-400">
              One per line, format: <code>{"from => to"}</code> (case-insensitive substring replace).
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveSplitwiseSettings}
            disabled={loadingSplitwise}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            Save Settings
          </button>
          <button
            type="button"
            onClick={testSplitwise}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
          >
            Test Splitwise Connection
          </button>
          <button
            type="button"
            onClick={runSplitwiseNow}
            disabled={runningSplitwise}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100 disabled:opacity-60"
          >
            {runningSplitwise ? "Running..." : "Run Splitwise Sync Now"}
          </button>
        </div>

        {splitwiseRunSummary ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Closed</p>
              <p className="font-semibold">{splitwiseRunSummary.closed_updated}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
              <p className="font-semibold">{splitwiseRunSummary.splitwise_created}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Skipped</p>
              <p className="font-semibold">{splitwiseRunSummary.splitwise_skipped}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Failed</p>
              <p className="font-semibold">{splitwiseRunSummary.splitwise_failed}</p>
            </div>
          </div>
        ) : null}

        {splitwiseRunErrors.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-ink-700/60">
            <div className="border-b border-slate-200/70 bg-slate-100/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-ink-700/60 dark:bg-ink-900/40 dark:text-slate-300">
              Splitwise Errors ({splitwiseRunErrors.length})
            </div>
            <div className="divide-y divide-slate-200/70 text-sm dark:divide-ink-700/60">
              {splitwiseRunErrors.map((entry) => (
                <div key={`${entry.session_id}:${entry.code}`} className="grid gap-2 px-4 py-3 md:grid-cols-4">
                  <a href={`/sessions/${entry.session_id}`} className="font-semibold text-emerald-600 hover:underline">
                    {entry.session_id.slice(0, 8)}
                  </a>
                  <div className="text-slate-600 dark:text-slate-300">{entry.session_date ?? "-"}</div>
                  <div className="text-slate-600 dark:text-slate-300">{entry.code}</div>
                  <div className="text-slate-600 dark:text-slate-300">{entry.message}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Splitwise Run History</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Query cron and manual Splitwise sync runs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={splitwiseHistorySourceFilter}
                onChange={(event) => setSplitwiseHistorySourceFilter(event.target.value as RunHistorySourceFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              >
                <option value="ALL">All Sources</option>
                <option value="GITHUB_CRON">GitHub Cron</option>
                <option value="ADMIN_MANUAL">Admin Manual</option>
                <option value="API">API</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
              <select
                value={splitwiseHistoryStatusFilter}
                onChange={(event) => setSplitwiseHistoryStatusFilter(event.target.value as RunHistoryStatusFilter)}
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
                onClick={loadSplitwiseRunHistory}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                {loadingSplitwiseRunHistory ? "Loading..." : "Load History"}
              </button>
            </div>
          </div>

          {splitwiseRunHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{loadingSplitwiseRunHistory ? "" : "No runs found."}</p>
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
                  {splitwiseRunHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">{entry.started_at ? new Date(entry.started_at).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">{entry.run_source}</td>
                      <td className="px-4 py-3">{entry.status}</td>
                      <td className="px-4 py-3">{formatDuration(entry.duration_ms)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">
                        {formatSplitwiseHistorySummary(entry.summary)}
                      </td>
                      <td className="px-4 py-3 text-xs text-rose-500">{entry.error_message ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
          <h3 className="text-lg font-semibold">Group Tools</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Fetch groups via Splitwise API to find the correct group id.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchSplitwiseGroups}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
            >
              Get All Groups
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={splitwiseGroupDetailIdInput}
                onChange={(event) => setSplitwiseGroupDetailIdInput(event.target.value)}
                className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="Group id"
              />
              <button
                type="button"
                onClick={fetchSplitwiseGroupDetail}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                Get Group Detail
              </button>
            </div>
          </div>

          {splitwiseGroupsResult ? (
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-sm dark:border-ink-700/60 dark:bg-ink-900/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Groups</p>
                <ul className="mt-2 space-y-1">
                  {splitwiseGroupsResult.groups.map((group, idx) => {
                    const g = group as { id?: unknown; name?: unknown };
                    const id = typeof g?.id === "number" || typeof g?.id === "string" ? String(g.id) : `#${idx + 1}`;
                    const name = typeof g?.name === "string" ? g.name : "Group";
                    return (
                      <li key={id} className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{name}</span>
                        <code className="text-xs text-slate-500">{id}</code>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <details className="rounded-2xl border border-slate-200/70 bg-white p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30">
                <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-200">Raw JSON</summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                  {JSON.stringify(splitwiseGroupsResult.raw, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}

          {splitwiseGroupDetailResult ? (
            <details className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30" open>
              <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-200">Group Detail JSON</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                {JSON.stringify(splitwiseGroupDetailResult.raw ?? splitwiseGroupDetailResult.group, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Splitwise Records</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                These come from our local <code>expenses</code> table (idempotency + debug).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={splitwiseExpenseStatusFilter}
                onChange={(event) =>
                  setSplitwiseExpenseStatusFilter(event.target.value as "ALL" | "PENDING" | "CREATED" | "FAILED")
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              >
                <option value="ALL">All</option>
                <option value="PENDING">PENDING</option>
                <option value="CREATED">CREATED</option>
                <option value="FAILED">FAILED</option>
              </select>
              <button
                type="button"
                onClick={loadSplitwiseRecords}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                {loadingSplitwiseRecords ? "Loading..." : "Load Records"}
              </button>
            </div>
          </div>

          {splitwiseExpenseRecords.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{loadingSplitwiseRecords ? "" : "No records loaded yet."}</p>
          ) : (
            <div className="v2-admin-table-wrap mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-ink-700/60">
              <table className="w-full min-w-[640px] text-left text-xs sm:min-w-[900px] sm:text-sm">
                <thead className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-ink-900/40 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Splitwise ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">Last Error</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
                  {splitwiseExpenseRecords.map((row) => {
                    const sessionId = row.session_id;
                    const isCreatedWithRemoteId = row.status === "CREATED" && Boolean(row.splitwise_expense_id);
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <a href={`/sessions/${sessionId}`} className="font-semibold text-emerald-600 hover:underline">
                            {sessionId.slice(0, 8)}
                          </a>
                          {row.session?.location ? <div className="mt-1 text-xs text-slate-500">{row.session.location}</div> : null}
                        </td>
                        <td className="px-4 py-3">{row.session?.session_date ?? "-"}</td>
                        <td className="px-4 py-3">{row.expense_type ?? "COURT"}</td>
                        <td className="px-4 py-3">{row.status ?? "-"}</td>
                        <td className="px-4 py-3">
                          {row.splitwise_expense_id ? <code className="text-xs">{row.splitwise_expense_id}</code> : "-"}
                        </td>
                        <td className="px-4 py-3">{typeof row.amount === "number" ? row.amount.toFixed(2) : "-"}</td>
                        <td className="px-4 py-3">
                          {row.note ? (
                            <pre className="whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-300">{row.note}</pre>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.last_error ? <span className="text-xs text-rose-600">{row.last_error}</span> : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => deleteSplitwiseRecord(row.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                            title={
                              isCreatedWithRemoteId
                                ? "Delete local record only. Session status is recomputed from remaining records."
                                : "Delete local record and recompute session status."
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {splitwiseSettings?.updated_at ? (
          <p className="mt-2 text-xs text-slate-400">Last updated: {new Date(splitwiseSettings.updated_at).toLocaleString()}</p>
        ) : null}
      </div>
    </section>
  );
}
