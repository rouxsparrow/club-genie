const COURT_LINE_REGEX = /Court\s*([A-Za-z0-9]+)\s*\|\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i;
const SESSION_DATE_REGEX = /Session Date:\s*(\d{4}-\d{2}-\d{2})/i;
const TOTAL_FEE_REGEX = /Total Fee:\s*([0-9]+(?:\.[0-9]{2})?)/i;
const DEFAULT_KEYWORDS = ["Playtomic", "Receipt"];
const DEFAULT_LOOKBACK_DAYS = 30;
const SINGAPORE_TZ = "Asia/Singapore";
const SINGAPORE_OFFSET = "+08:00";

export type ParsedCourt = {
  courtLabel: string;
  startTime: string;
  endTime: string;
};

export type ParsedReceipt = {
  sessionDate: string;
  totalFee: number;
  courts: ParsedCourt[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeClockTime(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("invalid_time_value");
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function escapeKeyword(keyword: string) {
  return keyword.replace(/"/g, '\\"');
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseCourtCandidate(candidate: unknown): ParsedCourt | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const row = candidate as Record<string, unknown>;
  const courtLabel = typeof row.court_label === "string"
    ? row.court_label
    : typeof row.courtLabel === "string"
    ? row.courtLabel
    : "";
  const startTime = typeof row.start_time === "string"
    ? row.start_time
    : typeof row.startTime === "string"
    ? row.startTime
    : null;
  const endTime = typeof row.end_time === "string"
    ? row.end_time
    : typeof row.endTime === "string"
    ? row.endTime
    : null;

  if (!startTime || !endTime) return null;
  if (Number.isNaN(new Date(startTime).getTime()) || Number.isNaN(new Date(endTime).getTime())) return null;

  return {
    courtLabel: courtLabel || "Court",
    startTime,
    endTime
  };
}

export function normalizeSubjectKeywords(value: unknown) {
  if (!Array.isArray(value)) {
    return [...DEFAULT_KEYWORDS];
  }

  const keywords = unique(
    value
      .filter((entry) => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

  return keywords.length > 0 ? keywords : [...DEFAULT_KEYWORDS];
}

export function buildGmailQueryFromKeywords(keywords: string[], lookbackDays = DEFAULT_LOOKBACK_DAYS) {
  const normalized = normalizeSubjectKeywords(keywords);
  const subjectParts = normalized.map((keyword) => `subject:"${escapeKeyword(keyword)}"`);
  return `newer_than:${lookbackDays}d ${subjectParts.join(" ")}`.trim();
}

export function parseSessionDate(raw: string) {
  const match = raw.match(SESSION_DATE_REGEX);
  return match?.[1] ?? null;
}

export function parseTotalFee(raw: string) {
  const match = raw.match(TOTAL_FEE_REGEX);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function toIsoFromLocalTime(sessionDate: string, rawTime: string, timezone: string) {
  if (timezone !== SINGAPORE_TZ) {
    throw new Error("unsupported_timezone");
  }
  const time = normalizeClockTime(rawTime);
  const iso = new Date(`${sessionDate}T${time}:00${SINGAPORE_OFFSET}`).toISOString();
  if (Number.isNaN(new Date(iso).getTime())) {
    throw new Error("invalid_datetime");
  }
  return iso;
}

export function parseCourts(raw: string, sessionDate: string, timezone: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  const courts: ParsedCourt[] = [];

  for (const line of lines) {
    const match = line.match(COURT_LINE_REGEX);
    if (!match) continue;
    const label = `Court ${match[1]}`;
    const startTime = toIsoFromLocalTime(sessionDate, match[2], timezone);
    const endTime = toIsoFromLocalTime(sessionDate, match[3], timezone);
    courts.push({ courtLabel: label, startTime, endTime });
  }

  return courts;
}

export function parseReceipt(rawHtml: string, rawText: string | null, timezone: string): ParsedReceipt {
  const raw = [rawHtml, rawText].filter(Boolean).join("\n");
  const sessionDate = parseSessionDate(raw);
  const totalFee = parseTotalFee(raw);

  if (!sessionDate) {
    throw new Error("missing_session_date");
  }

  if (totalFee === null || totalFee <= 0) {
    throw new Error("invalid_total_fee");
  }

  const courts = parseCourts(raw, sessionDate, timezone);
  if (courts.length === 0) {
    throw new Error("missing_courts");
  }

  return { sessionDate, totalFee, courts };
}

export function aggregateReceiptsForSessionDate(
  receipts: Array<{ parsed_total_fee: unknown; parsed_courts: unknown }>
) {
  let totalFee = 0;
  const merged: ParsedCourt[] = [];

  for (const receipt of receipts) {
    const fee = asNumber(receipt.parsed_total_fee);
    if (fee !== null && fee > 0) {
      totalFee += fee;
    }

    if (Array.isArray(receipt.parsed_courts)) {
      for (const row of receipt.parsed_courts) {
        const parsed = parseCourtCandidate(row);
        if (parsed) {
          merged.push(parsed);
        }
      }
    }
  }

  const seen = new Set<string>();
  const courts = merged.filter((court) => {
    const key = `${court.courtLabel}|${court.startTime}|${court.endTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  courts.sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.endTime !== b.endTime) return a.endTime.localeCompare(b.endTime);
    return a.courtLabel.localeCompare(b.courtLabel);
  });

  if (courts.length === 0 || totalFee <= 0) {
    return null;
  }

  const startTime = courts[0]?.startTime ?? null;
  const endTime = courts.reduce((latest, court) => (court.endTime > latest ? court.endTime : latest), courts[0].endTime);

  return {
    totalFee: Number(totalFee.toFixed(2)),
    startTime,
    endTime,
    courts
  };
}

export const ingestionDefaults = {
  defaultKeywords: DEFAULT_KEYWORDS,
  defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
  timezone: SINGAPORE_TZ
};
