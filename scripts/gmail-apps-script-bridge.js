const DEFAULT_QUERY_BASE = 'newer_than:30d subject:"Playtomic" subject:"Receipt"';
const DEFAULT_PROCESSED_LABEL = "club-genie/ingested";
const DEFAULT_PREVIEW_LIMIT = 20;
const DEFAULT_INGEST_LIMIT = 200;
const MAX_LIMIT = 500;

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
      return jsonResponse_(runIngestionWithHistory_({ runSource: "ADMIN_MANUAL", query }));
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
    const result = processIngestion_({ query: options && options.query });
    const finishedAt = new Date();
    logIngestionRun_({
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
    return result;
  } catch (error) {
    const finishedAt = new Date();
    const message = errorToMessage_(error);
    logIngestionRun_({
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
    return { ok: false, error: message };
  }
}

function processIngestion_(options) {
  const config = readConfig_();
  const query = normalizeQuery_(options && options.query);
  const maxMessages = normalizeLimit_(
    config.ingestLimit ? Number(config.ingestLimit) : null,
    DEFAULT_INGEST_LIMIT
  );
  const messages = fetchCandidateMessages_(query, maxMessages);
  const label = ensureLabel_(config.processedLabel);

  let ingested = 0;
  let deduped = 0;
  let parseFailed = 0;
  let fetchFailed = 0;

  for (const message of messages) {
    try {
      const outcome = callIngestReceipts_(config, message);
      if (outcome.ok) {
        if (outcome.deduped) {
          deduped += 1;
        } else {
          ingested += 1;
        }
        applyProcessedLabel_(message, label);
        continue;
      }
      if (outcome.parseFailed) {
        parseFailed += 1;
        applyProcessedLabel_(message, label);
        continue;
      }
      fetchFailed += 1;
    } catch (_) {
      fetchFailed += 1;
    }
  }

  return {
    ok: true,
    query,
    total: messages.length,
    ingested,
    deduped,
    parse_failed: parseFailed,
    fetch_failed: fetchFailed
  };
}

function logIngestionRun_(input) {
  try {
    const config = readConfig_();
    const url = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/log-ingestion-run`;
    UrlFetchApp.fetch(url, {
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
  } catch (_) {
    // Do not fail ingestion if run-history logging fails.
  }
}

function callIngestReceipts_(config, message) {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/ingest-receipts`;
  const rawHtml = message.getBody();
  const rawText = message.getPlainBody();
  if (!rawHtml && !rawText) {
    return { ok: false, deduped: false, parseFailed: false };
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
    return { ok: true, deduped: Boolean(body && body.deduped), parseFailed: false };
  }
  if (code === 422 && body && body.error === "parse_failed") {
    return { ok: false, deduped: false, parseFailed: true };
  }
  return { ok: false, deduped: false, parseFailed: false };
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

function normalizeRunSource_(input) {
  if (input === "ADMIN_MANUAL") return "ADMIN_MANUAL";
  if (input === "API") return "API";
  return "UNKNOWN";
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
