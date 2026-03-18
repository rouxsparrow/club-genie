const DEFAULT_QUERY_BASE = 'newer_than:30d ((subject:"Playtomic" subject:"Receipt") OR subject:"Event registration completed")';
const DEFAULT_PROCESSED_LABEL = "club-genie/ingested";
const DEFAULT_PREVIEW_LIMIT = 20;
const DEFAULT_INGEST_LIMIT = 200;
const MAX_LIMIT = 500;
const RERUN_MODE_ROW_MESSAGE = "ROW_MESSAGE";

/**
 * Optional helper: call once from Apps Script editor after setting timezone to Asia/Singapore.
 * It keeps a single daily trigger around ~23:30.
 */
function ensureDailyIngestionTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "runDailyIngestion") {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger("runDailyIngestion").timeBased().everyDays(1).atHour(23).nearMinute(30).create();
}

function runDailyIngestion() {
  const result = runIngestionWithHistory_({ runSource: "API" });
  Logger.log(JSON.stringify(result));
}

function doPost(e) {
  try {
    const payload = parseJsonPayload_(e);
    if (!validateSecret_(payload.secret)) {
      return jsonResponse_({ ok: false, error: "unauthorized" });
    }

    const action = typeof payload.action === "string" ? payload.action.trim() : "";
    if (action === "manual_ingest") {
      const query = normalizeQuery_(payload.query);
      const messageIds = normalizeMessageIds_(payload.messageIds);
      const rerunMode = normalizeRerunMode_(payload.rerunMode);
      return jsonResponse_(runIngestionWithHistory_({ runSource: "ADMIN_MANUAL", query, messageIds, rerunMode }));
    }

    if (action === "preview") {
      const query = normalizeQuery_(payload.query);
      const limit = normalizeLimit_(payload.limit, DEFAULT_PREVIEW_LIMIT);
      const messages = fetchCandidateMessages_(query, limit).map((message) => ({
        id: message.getId(),
        rawHtml: message.getBody(),
        rawText: message.getPlainBody()
      }));
      return jsonResponse_({ ok: true, query, messages });
    }

    return jsonResponse_({ ok: false, error: "unsupported_action" });
  } catch (error) {
    return jsonResponse_({ ok: false, error: errorToMessage_(error) });
  }
}

function runIngestionWithHistory_(options) {
  const startedAt = new Date();
  try {
    const result = processIngestion_({
      query: options && options.query,
      messageIds: options && options.messageIds,
      rerunMode: options && options.rerunMode
    });
    const finishedAt = new Date();
    const logOutcome = logIngestionRun_({
      runSource: normalizeRunSource_(options && options.runSource),
      status: "SUCCESS",
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      summary: {
        query: result.query,
        total: result.total,
        ingested: result.ingested,
        deduped: result.deduped,
        parse_failed: result.parse_failed,
        fetch_failed: result.fetch_failed
      }
    });
    return withHistoryLogging_(result, logOutcome);
  } catch (error) {
    const finishedAt = new Date();
    const message = errorToMessage_(error);
    const logOutcome = logIngestionRun_({
      runSource: normalizeRunSource_(options && options.runSource),
      status: "FAILED",
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      summary: {
        query: typeof options?.query === "string" ? options.query : normalizeQuery_(null)
      },
      errorMessage: message
    });
    return withHistoryLogging_({ ok: false, error: message }, logOutcome);
  }
}

function processIngestion_(options) {
  const config = readConfig_();
  const query = normalizeQuery_(options && options.query);
  const forcedMessageIds = normalizeMessageIds_(options && options.messageIds);
  const rerunMode = normalizeRerunMode_(options && options.rerunMode);
  const isRowMessageRerun = rerunMode === RERUN_MODE_ROW_MESSAGE && forcedMessageIds.length > 0;
  const maxMessages = normalizeLimit_(
    config.ingestLimit ? Number(config.ingestLimit) : null,
    DEFAULT_INGEST_LIMIT
  );
  const messages = isRowMessageRerun ? [] : fetchCandidateMessages_(query, maxMessages);
  const label = ensureLabel_(config.processedLabel);
  const seenMessageIds = new Set();
  const outcomes = [];
  const debugEntries = [];
  const processedAt = new Date().toISOString();
  for (const message of messages) {
    const messageId = normalizeMessageId_(message && typeof message.getId === "function" ? message.getId() : "");
    if (!messageId) continue;
    seenMessageIds.add(messageId);
  }

  let ingested = 0;
  let deduped = 0;
  let parseFailed = 0;
  let fetchFailed = 0;
  let total = messages.length;

  for (const message of messages) {
    const messageId = normalizeMessageId_(message && typeof message.getId === "function" ? message.getId() : "");
    if (!messageId) {
      fetchFailed += 1;
      outcomes.push({ messageId: "", status: "FETCH_FAILED", reason: "missing_message_id" });
      debugEntries.push({
        messageId: "",
        source: "query",
        found_in_gmail: true,
        ingest_http_status: null,
        ingest_response_error: "missing_message_id",
        outcome_status: "FETCH_FAILED",
        outcome_reason: "missing_message_id",
        processed_at: processedAt
      });
      continue;
    }
    try {
      const outcome = callIngestReceipts_(config, message);
      if (outcome.ok) {
        if (outcome.deduped) {
          deduped += 1;
          outcomes.push({ messageId, status: "DEDUPED", reason: "already_ingested" });
          debugEntries.push({
            messageId,
            source: "query",
            found_in_gmail: true,
            ingest_http_status: outcome.httpStatus ?? null,
            ingest_response_error: outcome.responseError ?? null,
            outcome_status: "DEDUPED",
            outcome_reason: "already_ingested",
            processed_at: processedAt
          });
        } else {
          ingested += 1;
          outcomes.push({ messageId, status: "INGESTED", reason: null });
          debugEntries.push({
            messageId,
            source: "query",
            found_in_gmail: true,
            ingest_http_status: outcome.httpStatus ?? null,
            ingest_response_error: outcome.responseError ?? null,
            outcome_status: "INGESTED",
            outcome_reason: null,
            processed_at: processedAt
          });
        }
        applyProcessedLabel_(message, label);
        continue;
      }
      if (outcome.parseFailed) {
        parseFailed += 1;
        outcomes.push({ messageId, status: "PARSE_FAILED", reason: outcome.reason || "parse_failed" });
        debugEntries.push({
          messageId,
          source: "query",
          found_in_gmail: true,
          ingest_http_status: outcome.httpStatus ?? null,
          ingest_response_error: outcome.responseError ?? null,
          outcome_status: "PARSE_FAILED",
          outcome_reason: outcome.reason || "parse_failed",
          processed_at: processedAt
        });
        applyProcessedLabel_(message, label);
        continue;
      }
      fetchFailed += 1;
      outcomes.push({ messageId, status: "FETCH_FAILED", reason: outcome.reason || "ingest_failed" });
      debugEntries.push({
        messageId,
        source: "query",
        found_in_gmail: true,
        ingest_http_status: outcome.httpStatus ?? null,
        ingest_response_error: outcome.responseError ?? null,
        outcome_status: "FETCH_FAILED",
        outcome_reason: outcome.reason || "ingest_failed",
        processed_at: processedAt
      });
    } catch (_) {
      fetchFailed += 1;
      outcomes.push({ messageId, status: "FETCH_FAILED", reason: "unexpected_error" });
      debugEntries.push({
        messageId,
        source: "query",
        found_in_gmail: true,
        ingest_http_status: null,
        ingest_response_error: "unexpected_error",
        outcome_status: "FETCH_FAILED",
        outcome_reason: "unexpected_error",
        processed_at: processedAt
      });
    }
  }

  for (const forcedMessageId of forcedMessageIds) {
    if (seenMessageIds.has(forcedMessageId)) {
      continue;
    }
    seenMessageIds.add(forcedMessageId);
    total += 1;
    try {
      const message = GmailApp.getMessageById(forcedMessageId);
      if (!message) {
        fetchFailed += 1;
        outcomes.push({ messageId: forcedMessageId, status: "FETCH_FAILED", reason: "gmail_message_not_found" });
        debugEntries.push({
          messageId: forcedMessageId,
          source: "forced_message_id",
          found_in_gmail: false,
          ingest_http_status: null,
          ingest_response_error: "gmail_message_not_found",
          outcome_status: "FETCH_FAILED",
          outcome_reason: "gmail_message_not_found",
          processed_at: processedAt
        });
        continue;
      }
      const outcome = callIngestReceipts_(config, message);
      if (outcome.ok) {
        if (outcome.deduped) {
          deduped += 1;
          outcomes.push({ messageId: forcedMessageId, status: "DEDUPED", reason: "already_ingested" });
          debugEntries.push({
            messageId: forcedMessageId,
            source: "forced_message_id",
            found_in_gmail: true,
            ingest_http_status: outcome.httpStatus ?? null,
            ingest_response_error: outcome.responseError ?? null,
            outcome_status: "DEDUPED",
            outcome_reason: "already_ingested",
            processed_at: processedAt
          });
        } else {
          ingested += 1;
          outcomes.push({ messageId: forcedMessageId, status: "INGESTED", reason: null });
          debugEntries.push({
            messageId: forcedMessageId,
            source: "forced_message_id",
            found_in_gmail: true,
            ingest_http_status: outcome.httpStatus ?? null,
            ingest_response_error: outcome.responseError ?? null,
            outcome_status: "INGESTED",
            outcome_reason: null,
            processed_at: processedAt
          });
        }
        applyProcessedLabel_(message, label);
        continue;
      }
      if (outcome.parseFailed) {
        parseFailed += 1;
        outcomes.push({ messageId: forcedMessageId, status: "PARSE_FAILED", reason: outcome.reason || "parse_failed" });
        debugEntries.push({
          messageId: forcedMessageId,
          source: "forced_message_id",
          found_in_gmail: true,
          ingest_http_status: outcome.httpStatus ?? null,
          ingest_response_error: outcome.responseError ?? null,
          outcome_status: "PARSE_FAILED",
          outcome_reason: outcome.reason || "parse_failed",
          processed_at: processedAt
        });
        applyProcessedLabel_(message, label);
        continue;
      }
      fetchFailed += 1;
      outcomes.push({ messageId: forcedMessageId, status: "FETCH_FAILED", reason: outcome.reason || "ingest_failed" });
      debugEntries.push({
        messageId: forcedMessageId,
        source: "forced_message_id",
        found_in_gmail: true,
        ingest_http_status: outcome.httpStatus ?? null,
        ingest_response_error: outcome.responseError ?? null,
        outcome_status: "FETCH_FAILED",
        outcome_reason: outcome.reason || "ingest_failed",
        processed_at: processedAt
      });
    } catch (_) {
      fetchFailed += 1;
      outcomes.push({ messageId: forcedMessageId, status: "FETCH_FAILED", reason: "unexpected_error" });
      debugEntries.push({
        messageId: forcedMessageId,
        source: "forced_message_id",
        found_in_gmail: true,
        ingest_http_status: null,
        ingest_response_error: "unexpected_error",
        outcome_status: "FETCH_FAILED",
        outcome_reason: "unexpected_error",
        processed_at: processedAt
      });
    }
  }

  return {
    ok: true,
    query,
    total,
    ingested,
    deduped,
    parse_failed: parseFailed,
    fetch_failed: fetchFailed,
    outcomes,
    bridge_version: "apps-script-bridge-2026-03-18-rerun-debug-v1",
    supports_outcomes: true,
    debug_entries: debugEntries
  };
}

function logIngestionRun_(input) {
  try {
    const config = readConfig_();
    const url = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/log-ingestion-run`;
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      muteHttpExceptions: true,
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
        "x-automation-secret": config.automationSecret,
        "x-run-source": normalizeRunSource_(input.runSource)
      },
      payload: JSON.stringify({
        status: input.status,
        startedAt: input.startedAt.toISOString(),
        finishedAt: input.finishedAt.toISOString(),
        durationMs: input.durationMs,
        summary: input.summary || null,
        errorMessage: input.errorMessage || null
      })
    });

    const statusCode = Number(response.getResponseCode());
    const parsedBody = safeParseJson_(response.getContentText());
    if (statusCode >= 200 && statusCode < 300) {
      return { ok: true, statusCode, error: null };
    }

    const responseError =
      parsedBody && typeof parsedBody.error === "string" && parsedBody.error.trim()
        ? parsedBody.error.trim()
        : "run_history_log_failed";
    const error = `http_${statusCode}: ${responseError}`;
    Logger.log(`log-ingestion-run failed: ${error}`);
    return { ok: false, statusCode, error };
  } catch (errorInput) {
    const error = errorToMessage_(errorInput);
    Logger.log(`log-ingestion-run failed: ${error}`);
    return { ok: false, statusCode: null, error };
  }
}

function withHistoryLogging_(payload, logOutcome) {
  const statusCode =
    logOutcome && Number.isFinite(Number(logOutcome.statusCode)) ? Number(logOutcome.statusCode) : null;
  const error =
    logOutcome && typeof logOutcome.error === "string" && logOutcome.error.trim() ? logOutcome.error.trim() : null;
  const ok = Boolean(logOutcome && logOutcome.ok);
  return {
    ...payload,
    history_logged: ok,
    history_log_status: statusCode,
    history_log_error: error
  };
}

function callIngestReceipts_(config, message) {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/ingest-receipts`;
  const rawHtml = message.getBody();
  const rawText = message.getPlainBody();
  if (!rawHtml && !rawText) {
    return { ok: false, deduped: false, parseFailed: false, reason: "empty_body", httpStatus: null, responseError: "empty_body" };
  }

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      apikey: config.supabaseAnonKey,
      "x-automation-secret": config.automationSecret
    },
    payload: JSON.stringify({
      messageId: message.getId(),
      rawHtml,
      rawText
    })
  });

  const code = response.getResponseCode();
  const body = safeParseJson_(response.getContentText());
  if (code >= 200 && code < 300) {
    return {
      ok: true,
      deduped: Boolean(body && body.deduped),
      parseFailed: false,
      reason: Boolean(body && body.deduped) ? "already_ingested" : null,
      httpStatus: code,
      responseError: null
    };
  }
  if (code === 422 && body && body.error === "parse_failed") {
    return {
      ok: false,
      deduped: false,
      parseFailed: true,
      reason: "parse_failed",
      httpStatus: code,
      responseError: typeof body?.error === "string" ? body.error : "parse_failed"
    };
  }
  const reason =
    body && typeof body.error === "string" && body.error.trim()
      ? `http_${code}: ${body.error.trim()}`
      : `http_${code}`;
  return {
    ok: false,
    deduped: false,
    parseFailed: false,
    reason,
    httpStatus: code,
    responseError: body && typeof body.error === "string" ? body.error : null
  };
}

function fetchCandidateMessages_(query, limit) {
  const threads = GmailApp.search(query, 0, limit);
  const messages = [];
  for (const thread of threads) {
    const threadMessages = thread.getMessages();
    for (const message of threadMessages) {
      messages.push(message);
      if (messages.length >= limit) {
        return messages;
      }
    }
  }
  return messages;
}

function applyProcessedLabel_(message, label) {
  message.getThread().addLabel(label);
}

function ensureLabel_(labelName) {
  const existing = GmailApp.getUserLabelByName(labelName);
  if (existing) {
    return existing;
  }
  return GmailApp.createLabel(labelName);
}

function parseJsonPayload_(e) {
  const raw = e && e.postData && typeof e.postData.contents === "string" ? e.postData.contents : "{}";
  const parsed = safeParseJson_(raw);
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  return parsed;
}

function validateSecret_(inputSecret) {
  const config = readConfig_();
  const provided = typeof inputSecret === "string" ? inputSecret.trim() : "";
  return Boolean(config.bridgeSecret) && provided === config.bridgeSecret;
}

function normalizeQuery_(input) {
  if (typeof input === "string" && input.trim()) {
    return input.trim();
  }
  const config = readConfig_();
  if (config.defaultQuery) {
    return config.defaultQuery;
  }
  return `${DEFAULT_QUERY_BASE} -label:"${config.processedLabel}"`;
}

function normalizeLimit_(input, fallback) {
  const numeric = Number(input);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(numeric, MAX_LIMIT));
}

function normalizeMessageId_(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeMessageIds_(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  for (const entry of value) {
    const normalized = normalizeMessageId_(entry);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    if (seen.size >= MAX_LIMIT) {
      break;
    }
  }
  return Array.from(seen);
}

function normalizeRunSource_(input) {
  if (input === "ADMIN_MANUAL") return "ADMIN_MANUAL";
  if (input === "API") return "API";
  return "UNKNOWN";
}

function normalizeRerunMode_(input) {
  if (input === RERUN_MODE_ROW_MESSAGE) return RERUN_MODE_ROW_MESSAGE;
  return null;
}

function readConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const supabaseUrl = readRequiredProperty_(properties, "SUPABASE_URL");
  const supabaseAnonKey = readRequiredProperty_(properties, "SUPABASE_ANON_KEY");
  const automationSecret = readRequiredProperty_(properties, "AUTOMATION_SECRET");
  const bridgeSecret = readRequiredProperty_(properties, "BRIDGE_SECRET");
  return {
    supabaseUrl,
    supabaseAnonKey,
    automationSecret,
    bridgeSecret,
    processedLabel: readOptionalProperty_(properties, "PROCESSED_LABEL", DEFAULT_PROCESSED_LABEL),
    defaultQuery: readOptionalProperty_(properties, "DEFAULT_QUERY", ""),
    ingestLimit: readOptionalProperty_(properties, "INGEST_LIMIT", String(DEFAULT_INGEST_LIMIT))
  };
}

function readRequiredProperty_(properties, key) {
  const value = properties.getProperty(key);
  if (!value || !value.trim()) {
    throw new Error(`missing_property_${key}`);
  }
  return value.trim();
}

function readOptionalProperty_(properties, key, fallback) {
  const value = properties.getProperty(key);
  if (!value || !value.trim()) {
    return fallback;
  }
  return value.trim();
}

function safeParseJson_(value) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function errorToMessage_(error) {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "unexpected_error";
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
