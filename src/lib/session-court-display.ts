type TimeToken = {
  text: string;
  period: string;
};

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function toTimeToken(value: string | null): TimeToken | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const periodRaw = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const period = periodRaw.toUpperCase();
  const text = minute !== "00" ? `${hour}:${minute}` : hour;

  if (!hour) return null;
  return { text, period };
}

function formatToken(token: TimeToken | null) {
  if (!token) return "TBD";
  return `${token.text}${token.period}`;
}

export function formatCourtLabelForDisplay(courtLabel: string | null | undefined) {
  if (typeof courtLabel !== "string") return "Court";

  const normalized = normalizeText(courtLabel);
  if (!normalized) return "Court";

  const withoutCourtPrefix = normalized.replace(/^court\b\s*/i, "").trim();
  return withoutCourtPrefix || normalized;
}

export function formatCourtTimeRangeForDisplay(start: string | null, end: string | null) {
  const startToken = toTimeToken(start);
  const endToken = toTimeToken(end);

  if (!startToken && !endToken) return "TBD";
  if (!startToken || !endToken) return `${formatToken(startToken)}-${formatToken(endToken)}`;

  if (startToken.period && endToken.period && startToken.period === endToken.period) {
    return `${startToken.text}-${endToken.text}${endToken.period}`;
  }

  return `${formatToken(startToken)}-${formatToken(endToken)}`;
}
