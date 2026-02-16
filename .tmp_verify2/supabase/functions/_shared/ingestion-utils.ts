const DATE_LINE_REGEX = /\bDate\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i;
const TIME_RANGE_REGEX = /\bTime\s*:?\s*(\d{1,2}:\d{2}\s*[AaPp][Mm])\s*[-–—]\s*(\d{1,2}:\d{2}\s*[AaPp][Mm])\b/i;
const LOCATION_COURT_LINE_REGEX = /\b(Club\s+[^,\n]+?)\s*,\s*([A-Za-z]\d+)\b/i;
const TOTAL_FEE_REGEX = /\bPaid\s+(?:SGD|\$)\s*([0-9]+(?:\.[0-9]{1,2})?)\b/i;
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
  location: string;
  courts: ParsedCourt[];
};

type LocationCourt = {
  location: string;
  courtCode: string;
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

function normalizeFreeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtmlToText(rawHtml: string) {
  const withLineBreaks = rawHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n");
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags);
}

function buildParseableRaw(rawHtml: string, rawText: string | null) {
  const parts = [rawText ?? "", stripHtmlToText(rawHtml)];
  return parts
    .join("\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeFreeText(line))
    .filter(Boolean)
    .join("\n");
}

function normalizeYear(rawYear: string) {
  const year = Number(rawYear);
  if (!Number.isInteger(year) || year < 0) return null;
  return rawYear.length === 2 ? 2000 + year : year;
}

function isValidDateParts(day: number, month: number, year: number) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (day < 1 || month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function toIsoDate(day: number, month: number, year: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMeridiemTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) {
    throw new Error("invalid_time_format");
  }
  const rawHour = Number(match[1]);
  const rawMinute = Number(match[2]);
  if (!Number.isInteger(rawHour) || rawHour < 1 || rawHour > 12 || !Number.isInteger(rawMinute) || rawMinute < 0 || rawMinute > 59) {
    throw new Error("invalid_time_value");
  }
  const meridiem = match[3].toUpperCase();
  const hour = meridiem === "AM" ? rawHour % 12 : (rawHour % 12) + 12;
  return `${String(hour).padStart(2, "0")}:${String(rawMinute).padStart(2, "0")}`;
}

function parseTimeRange(raw: string) {
  const match = raw.match(TIME_RANGE_REGEX);
  if (!match) return null;

  return {
    startClock: parseMeridiemTime(match[1]),
    endClock: parseMeridiemTime(match[2])
  };
}

function extractLocationAndCourt(raw: string): LocationCourt | null {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(LOCATION_COURT_LINE_REGEX);
    if (!match) continue;
    return {
      location: normalizeFreeText(match[1]),
      courtCode: match[2].toUpperCase()
    };
  }

  const fallbackMatch = raw.match(LOCATION_COURT_LINE_REGEX);
  if (!fallbackMatch) return null;
  return {
    location: normalizeFreeText(fallbackMatch[1]),
    courtCode: fallbackMatch[2].toUpperCase()
  };
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
  const match = raw.match(DATE_LINE_REGEX);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = normalizeYear(match[3]);
  if (year === null) return null;

  if (isValidDateParts(first, second, year)) {
    return toIsoDate(first, second, year);
  }
  if (isValidDateParts(second, first, year)) {
    return toIsoDate(second, first, year);
  }

  return null;
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
  const locationAndCourt = extractLocationAndCourt(raw);
  const timeRange = parseTimeRange(raw);
  if (!locationAndCourt || !timeRange) {
    return [];
  }

  const startTime = toIsoFromLocalTime(sessionDate, timeRange.startClock, timezone);
  const endTime = toIsoFromLocalTime(sessionDate, timeRange.endClock, timezone);
  if (endTime <= startTime) {
    throw new Error("invalid_time_range");
  }

  return [
    {
      courtLabel: `Court ${locationAndCourt.courtCode}`,
      startTime,
      endTime
    }
  ];
}

export function parseReceipt(rawHtml: string, rawText: string | null, timezone: string): ParsedReceipt {
  const raw = buildParseableRaw(rawHtml, rawText);
  const sessionDate = parseSessionDate(raw);
  const totalFee = parseTotalFee(raw);
  const locationAndCourt = extractLocationAndCourt(raw);
  const timeRange = parseTimeRange(raw);

  if (!sessionDate) {
    throw new Error("missing_session_date");
  }

  if (!timeRange) {
    throw new Error("missing_time_range");
  }

  if (!locationAndCourt) {
    throw new Error("missing_location_or_court");
  }

  if (totalFee === null || totalFee <= 0) {
    throw new Error("invalid_total_fee");
  }

  const courts = parseCourts(raw, sessionDate, timezone);
  if (courts.length === 0) {
    throw new Error("missing_courts");
  }

  return { sessionDate, totalFee, location: locationAndCourt.location, courts };
}

export function aggregateReceiptsForSessionDate(
  receipts: Array<{ parsed_total_fee: unknown; parsed_courts: unknown; parsed_location?: unknown }>
) {
  let totalFee = 0;
  const merged: ParsedCourt[] = [];
  const locations = new Map<string, string>();

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

    if (typeof receipt.parsed_location === "string") {
      const location = normalizeFreeText(receipt.parsed_location);
      if (location) {
        locations.set(location.toLowerCase(), location);
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

  if (courts.length === 0 || totalFee <= 0 || locations.size !== 1) {
    return null;
  }

  const startTime = courts[0]?.startTime ?? null;
  const endTime = courts.reduce((latest, court) => (court.endTime > latest ? court.endTime : latest), courts[0].endTime);

  return {
    totalFee: Number(totalFee.toFixed(2)),
    startTime,
    endTime,
    location: locations.values().next().value as string,
    courts
  };
}

export const ingestionDefaults = {
  defaultKeywords: DEFAULT_KEYWORDS,
  defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
  timezone: SINGAPORE_TZ
};
