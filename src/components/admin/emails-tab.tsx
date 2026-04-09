"use client";

import { useMemo, useState } from "react";
import {
  buildSingleEmailRerunPayload,
  collectNotIngestedMessageIds,
  isEmailPreviewRerunnable,
} from "../../lib/admin-email-preview-rerun";
import type { EmailPreviewMessage, EmailRerunChip, EmailRerunLog, EmailRerunOutcome } from "./types";

type EmailStatusFilter = "ALL" | "SESSION_CREATED" | "PARSE_FAILED" | "NOT_INGESTED" | "INGESTED_NO_SESSION";

type EmailPreviewResult = {
  query: string | null;
  timezone: string | null;
  messages: EmailPreviewMessage[];
};

export default function EmailsTab() {
  const [previewQueryInput, setPreviewQueryInput] = useState("");
  const [loadingEmailPreview, setLoadingEmailPreview] = useState(false);
  const [emailPreviewMessage, setEmailPreviewMessage] = useState<string | null>(null);
  const [emailStatusFilter, setEmailStatusFilter] = useState<EmailStatusFilter>("ALL");
  const [emailPreview, setEmailPreview] = useState<EmailPreviewResult | null>(null);
  const [rerunningByMessageId, setRerunningByMessageId] = useState<Record<string, boolean>>({});
  const [rerunResultByMessageId, setRerunResultByMessageId] = useState<Record<string, EmailRerunChip>>({});
  const [rerunLogByMessageId, setRerunLogByMessageId] = useState<Record<string, EmailRerunLog>>({});

  const filteredEmailPreviewMessages = useMemo(() => {
    if (!emailPreview) return [];
    if (emailStatusFilter === "ALL") return emailPreview.messages;
    return emailPreview.messages.filter((message) => message.status === emailStatusFilter);
  }, [emailPreview, emailStatusFilter]);
  const rerunnableMessageIds = useMemo(
    () => collectNotIngestedMessageIds(emailPreview?.messages ?? []),
    [emailPreview],
  );

  const loadEmailPreview = async (options?: { successMessage?: string; preserveRerunResults?: boolean }) => {
    setLoadingEmailPreview(true);
    setEmailPreviewMessage(null);
    if (!options?.preserveRerunResults) {
      setRerunResultByMessageId({});
      setRerunLogByMessageId({});
    }
    const query = previewQueryInput.trim();
    const response = await fetch("/api/admin/ingestion/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(query ? { query } : {}),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; query?: string | null; timezone?: string | null; messages?: EmailPreviewMessage[]; error?: string }
      | null;
    if (!data?.ok) {
      setEmailPreviewMessage(data?.error ?? "Failed to load email preview.");
      setLoadingEmailPreview(false);
      return;
    }

    setEmailPreview({
      query: data.query ?? null,
      timezone: data.timezone ?? null,
      messages: Array.isArray(data.messages) ? data.messages : [],
    });
    setEmailPreviewMessage(options?.successMessage ?? "Email preview loaded.");
    setLoadingEmailPreview(false);
  };

  const toFetchFailedChip = (reason: string | null | undefined): EmailRerunChip => {
    const fetchReasonMap: Record<string, string> = {
      gmail_message_not_found: "Message Not Found",
      empty_body: "Empty Body",
      ingest_failed: "Ingest Failed",
      unexpected_error: "Unexpected Error",
      missing_outcome: "Missing Outcome",
    };
    const normalized = typeof reason === "string" ? reason.trim() : "";
    const fetchReason = normalized ? fetchReasonMap[normalized] ?? normalized.replaceAll("_", " ") : "";
    return {
      status: "FETCH_FAILED",
      text: `Re-run: Fetch Failed${fetchReason ? ` (${fetchReason})` : ""}`,
      tone: "rose",
    };
  };

  const toEmailRerunChip = (outcome: EmailRerunOutcome): EmailRerunChip => {
    if (outcome.status === "INGESTED") {
      return { status: outcome.status, text: "Re-run: Ingested", tone: "emerald" };
    }
    if (outcome.status === "DEDUPED") {
      return { status: outcome.status, text: "Re-run: Already Ingested", tone: "amber" };
    }
    if (outcome.status === "PARSE_FAILED") {
      const reason = outcome.reason && outcome.reason !== "parse_failed" ? ` (${outcome.reason.replaceAll("_", " ")})` : "";
      return { status: outcome.status, text: `Re-run: Parse Failed${reason}`, tone: "rose" };
    }
    return toFetchFailedChip(outcome.reason);
  };

  const rerunPreviewMessage = async (messageId: string) => {
    const payload = buildSingleEmailRerunPayload(messageId);
    if (!payload) {
      setEmailPreviewMessage("Invalid message id.");
      return;
    }

    const normalizedMessageId = payload.messageIds[0]!;
    setRerunningByMessageId((prev) => ({ ...prev, [normalizedMessageId]: true }));
    setEmailPreviewMessage(null);

    try {
      const response = await fetch("/api/admin/ingestion/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; outcomes?: EmailRerunOutcome[]; debug?: unknown }
        | null;
      if (!data?.ok) {
        setEmailPreviewMessage(data?.error ?? "Re-run failed.");
        const chip = toFetchFailedChip(data?.error);
        setRerunResultByMessageId((prev) => ({ ...prev, [normalizedMessageId]: chip }));
        setRerunLogByMessageId((prev) => ({
          ...prev,
          [normalizedMessageId]: {
            summary: chip.text,
            raw: data?.debug ?? { ok: false, error: data?.error ?? "re_run_failed" },
          },
        }));
        return;
      }

      const outcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
      const matchedOutcome = outcomes.find((entry) => entry?.messageId?.trim() === normalizedMessageId);
      const chip = matchedOutcome ? toEmailRerunChip(matchedOutcome) : toFetchFailedChip("missing_outcome");
      setRerunResultByMessageId((prev) => ({ ...prev, [normalizedMessageId]: chip }));
      setRerunLogByMessageId((prev) => ({
        ...prev,
        [normalizedMessageId]: {
          summary: chip.text,
          raw: data.debug ?? { ok: true, outcomes: data.outcomes ?? [] },
        },
      }));

      await loadEmailPreview({
        successMessage: `Re-run completed for ${normalizedMessageId}. Preview refreshed.`,
        preserveRerunResults: true,
      });
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message.trim() : "unexpected_error";
      setEmailPreviewMessage("Re-run failed.");
      const chip = toFetchFailedChip(message);
      setRerunResultByMessageId((prev) => ({ ...prev, [normalizedMessageId]: chip }));
      setRerunLogByMessageId((prev) => ({
        ...prev,
        [normalizedMessageId]: {
          summary: chip.text,
          raw: { ok: false, error: message },
        },
      }));
    } finally {
      setRerunningByMessageId((prev) => ({ ...prev, [normalizedMessageId]: false }));
    }
  };

  return (
    <section className="mt-8 grid gap-6">
      <div className="card">
        <h2 className="text-2xl font-semibold">Fetched Email Content</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Preview receipt content fetched by the Gmail function before parsing.
        </p>
        {emailPreviewMessage ? <p className="mt-3 text-sm text-slate-500">{emailPreviewMessage}</p> : null}
        <div className="mt-4 min-w-0 grid gap-3 md:grid-cols-[minmax(0,2fr)_auto] md:items-end">
          <label className="text-sm font-semibold">
            Gmail Query Override (optional)
            <input
              type="text"
              value={previewQueryInput}
              onChange={(event) => setPreviewQueryInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
              placeholder='newer_than:7d subject:"Playtomic" subject:"Receipt"'
            />
          </label>
          <button
            type="button"
            onClick={() => loadEmailPreview()}
            disabled={loadingEmailPreview}
            className="md:justify-self-start rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {loadingEmailPreview ? "Loading..." : "Load Email Content"}
          </button>
        </div>
        {emailPreview ? (
          <div className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
            <p>
              <span className="font-semibold">Query:</span> {emailPreview.query ?? "-"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Timezone:</span> {emailPreview.timezone ?? "-"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Messages:</span> {emailPreview.messages.length}
            </p>
            <label className="mt-3 block text-sm font-semibold">
              Status Filter
              <select
                value={emailStatusFilter}
                onChange={(event) => setEmailStatusFilter(event.target.value as EmailStatusFilter)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800 md:max-w-xs"
              >
                <option value="ALL">All</option>
                <option value="SESSION_CREATED">Session Created</option>
                <option value="PARSE_FAILED">Parse Failed</option>
                <option value="NOT_INGESTED">Not Ingested</option>
                <option value="INGESTED_NO_SESSION">Ingested, No Session</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Email Bodies</h3>
        {loadingEmailPreview ? (
          <p className="mt-4 text-sm text-slate-500">Loading email content...</p>
        ) : !emailPreview ? (
          <p className="mt-4 text-sm text-slate-500">Run preview to inspect fetched emails.</p>
        ) : filteredEmailPreviewMessages.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No matching messages found.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {filteredEmailPreviewMessages.map((message) => {
              const rerunMessageId = message.id.trim();
              const rerunChip = rerunResultByMessageId[rerunMessageId] ?? null;
              const rerunLog = rerunLogByMessageId[rerunMessageId] ?? null;
              const canRerunMessage =
                isEmailPreviewRerunnable(message.status) && rerunnableMessageIds.includes(rerunMessageId);
              return (
                <li
                  key={message.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 p-4 dark:border-ink-700/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all font-semibold">{message.id}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        message.status === "SESSION_CREATED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                          : message.status === "PARSE_FAILED"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                            : message.status === "INGESTED_NO_SESSION"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                      }`}
                    >
                      {message.status === "SESSION_CREATED"
                        ? "Session Created"
                        : message.status === "PARSE_FAILED"
                          ? "Parse Failed"
                          : message.status === "INGESTED_NO_SESSION"
                            ? "Ingested, No Session"
                            : "Not Ingested"}
                    </span>
                    {canRerunMessage ? (
                      <button
                        type="button"
                        onClick={() => rerunPreviewMessage(rerunMessageId)}
                        disabled={Boolean(rerunningByMessageId[rerunMessageId]) || loadingEmailPreview}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100 disabled:opacity-60"
                      >
                        {rerunningByMessageId[rerunMessageId] ? "Running..." : "Re-run"}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    text={message.textLength}
                    {message.textTruncated ? " (truncated)" : ""} | html={message.htmlLength}
                    {message.htmlTruncated ? " (truncated)" : ""}
                  </p>
                  {message.parsedSessionDate ? (
                    <p className="mt-1 text-xs text-slate-400">
                      date={message.parsedSessionDate}
                      {message.sessionStatus ? ` | session=${message.sessionStatus}` : ""}
                    </p>
                  ) : null}
                  {message.parseError ? <p className="mt-1 text-xs text-rose-500">{message.parseError}</p> : null}
                  {rerunChip ? (
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        rerunChip.tone === "emerald"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : rerunChip.tone === "amber"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-rose-600 dark:text-rose-300"
                      }`}
                    >
                      {rerunChip.text}
                    </p>
                  ) : null}
                  {rerunLog ? (
                    <details className="mt-2 min-w-0 rounded-xl border border-slate-200/80 p-2 dark:border-ink-700/60">
                      <summary className="cursor-pointer text-xs font-semibold">Re-run Log</summary>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{rerunLog.summary}</p>
                      <pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200/80 bg-slate-100 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                        {JSON.stringify(rerunLog.raw, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                  <details className="mt-3 min-w-0">
                    <summary className="cursor-pointer text-sm font-semibold">Text Body</summary>
                    <pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200/80 bg-slate-100 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                      {message.rawText ?? "(empty)"}
                    </pre>
                  </details>
                  <details className="mt-3 min-w-0">
                    <summary className="cursor-pointer text-sm font-semibold">HTML Body (raw)</summary>
                    <pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200/80 bg-slate-100 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                      {message.rawHtml ?? "(empty)"}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
