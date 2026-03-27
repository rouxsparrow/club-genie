const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;

export type SplitwiseShareRow = {
  userId: number;
  paidShareCents: number;
  owedShareCents: number;
};

export type ShuttlecockShareRow = SplitwiseShareRow;

function trimOrNull(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function escapeRegexLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSessionDate(sessionDate: string, dateFormat: string) {
  if (dateFormat === "YYYY-MM-DD") return sessionDate;
  // Expect YYYY-MM-DD from DB.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);
  if (!m) return sessionDate;
  const yy = m[1].slice(2);
  const mm = m[2];
  const dd = m[3];
  return `${dd}/${mm}/${yy}`;
}

function applyLocationReplacements(location: string, replacements: Array<{ from: string; to: string }>) {
  let out = location;
  for (const rule of replacements) {
    const from = typeof rule?.from === "string" ? rule.from.trim() : "";
    const to = typeof rule?.to === "string" ? rule.to.trim() : "";
    if (!from || !to) continue;
    // Case-insensitive global replacement, but treat `from` as a literal substring.
    const re = new RegExp(escapeRegexLiteral(from), "gi");
    out = out.replace(re, to);
  }
  return out;
}

export function renderDescriptionTemplate(
  template: string,
  session: { session_date: string; location?: string | null },
  config?: { dateFormat?: string; locationReplacements?: Array<{ from: string; to: string }> }
) {
  const dateFormat = typeof config?.dateFormat === "string" && config.dateFormat.trim() ? config.dateFormat.trim().toUpperCase() : "DD/MM/YY";
  const date = formatSessionDate(session.session_date, dateFormat === "YYYY-MM-DD" ? "YYYY-MM-DD" : "DD/MM/YY");

  let location = typeof session.location === "string" && session.location.trim() ? session.location.trim() : "Session";
  const replacements = Array.isArray(config?.locationReplacements) ? config?.locationReplacements : [];
  if (replacements.length > 0) {
    location = applyLocationReplacements(location, replacements);
  }
  const base = (typeof template === "string" && template.trim() ? template : "Badminton {session_date} - {location}")
    .replace(/\{session_date\}/g, date)
    .replace(/\{location\}/g, location);

  // Normalize whitespace and keep the description reasonably short.
  return base.replace(/\s+/g, " ").trim().slice(0, 200);
}

export function toSgtDateString(now: Date) {
  // Represent SGT "wall clock" by shifting UTC timestamp by +08:00.
  const shifted = new Date(now.getTime() + SINGAPORE_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function computeSgtDateWindowLast24h(now: Date) {
  const nowSgt = new Date(now.getTime() + SINGAPORE_OFFSET_MS);
  const startSgt = new Date(nowSgt.getTime() - 24 * 60 * 60 * 1000);
  return {
    startDateSgt: startSgt.toISOString().slice(0, 10),
    endDateSgt: nowSgt.toISOString().slice(0, 10)
  };
}

export function parseMoneyToCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const normalized =
    typeof value === "number"
      ? value.toFixed(2)
      : typeof value === "string"
      ? value.trim()
      : "";

  if (!normalized) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [wholeRaw, fracRaw = ""] = normalized.split(".");
  const whole = Number(wholeRaw);
  if (!Number.isInteger(whole) || whole < 0) return null;
  const fracText = fracRaw.padEnd(2, "0").slice(0, 2);
  const frac = Number(fracText);
  if (!Number.isInteger(frac) || frac < 0 || frac > 99) return null;

  return whole * 100 + frac;
}

export function centsToMoneyString(cents: number) {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

export function computeEqualOwedSharesCents(costCents: number, participantUserIds: number[]) {
  const uniqueSorted = [...new Set(participantUserIds)].sort((a, b) => a - b);
  if (uniqueSorted.length === 0) return null;
  if (!Number.isInteger(costCents) || costCents <= 0) return null;

  const n = uniqueSorted.length;
  const base = Math.floor(costCents / n);
  const remainder = costCents - base * n;

  const map = new Map<number, number>();
  uniqueSorted.forEach((userId, idx) => {
    const extra = idx < remainder ? 1 : 0;
    map.set(userId, base + extra);
  });

  return map;
}

export function buildSplitwiseBySharesPayload(input: {
  groupId: number;
  currencyCode: string;
  description: string;
  costCents: number;
  dateIso: string;
  payerUserId: number;
  participantUserIds: number[];
  guestCount?: number;
}) {
  const uniqueParticipants = [...new Set(input.participantUserIds)].sort((a, b) => a - b);
  if (uniqueParticipants.length === 0) {
    return { ok: false as const, error: "missing_participants" };
  }

  const guestCount = Number.isInteger(input.guestCount) ? (input.guestCount as number) : 0;
  if (guestCount < 0) {
    return { ok: false as const, error: "invalid_guest_count" };
  }

  const totalShares = uniqueParticipants.length + guestCount;
  if (totalShares <= 0 || !Number.isInteger(input.costCents) || input.costCents <= 0) {
    return { ok: false as const, error: "missing_participants" };
  }

  const base = Math.floor(input.costCents / totalShares);
  const remainder = input.costCents - base * totalShares;
  const shareValues = Array.from({ length: totalShares }, (_, idx) => base + (idx < remainder ? 1 : 0));
  const participantOwedMap = new Map<number, number>();
  uniqueParticipants.forEach((userId, idx) => {
    participantOwedMap.set(userId, shareValues[idx] ?? 0);
  });
  const guestSharesOwed = shareValues.slice(uniqueParticipants.length).reduce((sum, value) => sum + value, 0);
  const payerOwed = (participantOwedMap.get(input.payerUserId) ?? 0) + guestSharesOwed;

  const shares: SplitwiseShareRow[] = [];
  // Payer row first.
  shares.push({
    userId: input.payerUserId,
    paidShareCents: input.costCents,
    owedShareCents: payerOwed
  });

  // Add non-payer participants.
  for (const userId of uniqueParticipants) {
    if (userId === input.payerUserId) continue;
    shares.push({
      userId,
      paidShareCents: 0,
      owedShareCents: participantOwedMap.get(userId) ?? 0
    });
  }

  const payload: Record<string, unknown> = {
    group_id: input.groupId,
    description: input.description,
    cost: centsToMoneyString(input.costCents),
    currency_code: input.currencyCode,
    date: input.dateIso
  };

  shares.forEach((row, idx) => {
    payload[`users__${idx}__user_id`] = row.userId;
    payload[`users__${idx}__paid_share`] = centsToMoneyString(row.paidShareCents);
    payload[`users__${idx}__owed_share`] = centsToMoneyString(row.owedShareCents);
  });

  return { ok: true as const, payload, shares };
}

export function buildSplitwiseShuttlecockPayload(input: {
  groupId: number;
  currencyCode: string;
  description: string;
  dateIso: string;
  participantOffUserIds: number[];
  recipientOnUserIds: number[];
  perOffFeeCents: number;
  guestCount?: number;
  sessionPayerUserId: number;
}) {
  const offUsers = [...new Set(input.participantOffUserIds)].sort((a, b) => a - b);
  if (!Number.isInteger(input.perOffFeeCents) || input.perOffFeeCents <= 0) {
    return { ok: false as const, error: "invalid_fee" };
  }
  if (!Number.isInteger(input.sessionPayerUserId) || input.sessionPayerUserId <= 0) {
    return { ok: false as const, error: "invalid_session_payer" };
  }

  const guestCount = Number.isInteger(input.guestCount) ? (input.guestCount as number) : 0;
  if (guestCount < 0) {
    return { ok: false as const, error: "invalid_guest_count" };
  }

  const totalChargedShares = offUsers.length + guestCount;
  if (totalChargedShares === 0) {
    return { ok: false as const, error: "no_charge" };
  }

  const recipients = [...new Set(input.recipientOnUserIds)].sort((a, b) => a - b);
  if (recipients.length === 0) {
    return { ok: false as const, error: "missing_recipients" };
  }

  const totalCostCents = totalChargedShares * input.perOffFeeCents;
  const recipientBase = Math.floor(totalCostCents / recipients.length);
  const recipientRemainder = totalCostCents - recipientBase * recipients.length;

  const paidMap = new Map<number, number>();
  recipients.forEach((userId, idx) => {
    paidMap.set(userId, recipientBase + (idx < recipientRemainder ? 1 : 0));
  });

  const owedMap = new Map<number, number>();
  offUsers.forEach((userId) => {
    owedMap.set(userId, input.perOffFeeCents);
  });
  if (guestCount > 0) {
    const current = owedMap.get(input.sessionPayerUserId) ?? 0;
    owedMap.set(input.sessionPayerUserId, current + guestCount * input.perOffFeeCents);
  }

  const userIds = [...new Set([...recipients, ...offUsers])].sort((a, b) => a - b);
  const shares: ShuttlecockShareRow[] = userIds.map((userId) => ({
    userId,
    paidShareCents: paidMap.get(userId) ?? 0,
    owedShareCents: owedMap.get(userId) ?? 0
  }));

  const payload: Record<string, unknown> = {
    group_id: input.groupId,
    description: input.description,
    cost: centsToMoneyString(totalCostCents),
    currency_code: input.currencyCode,
    date: input.dateIso
  };

  shares.forEach((row, idx) => {
    payload[`users__${idx}__user_id`] = row.userId;
    payload[`users__${idx}__paid_share`] = centsToMoneyString(row.paidShareCents);
    payload[`users__${idx}__owed_share`] = centsToMoneyString(row.owedShareCents);
  });

  return { ok: true as const, payload, shares, totalCostCents };
}

export function buildCourtExpenseNote(input: {
  totalCostCents: number;
  joinedPlayersCount: number;
  guestCount: number;
  sessionPayerLabel: string;
}) {
  const payer = trimOrNull(input.sessionPayerLabel) ?? "Unknown";
  const guests = Number.isInteger(input.guestCount) && input.guestCount > 0 ? input.guestCount : 0;
  const joined = Number.isInteger(input.joinedPlayersCount) && input.joinedPlayersCount > 0 ? input.joinedPlayersCount : 0;
  return [
    `Total: ${centsToMoneyString(input.totalCostCents)}`,
    `Joined players: ${joined}, Guests: ${guests}`,
    `Session payer: ${payer}`
  ].join("\n");
}

export function buildShuttlecockExpenseNote(input: {
  totalCostCents: number;
  shuttleOffPlayersCount: number;
  guestCount: number;
  sessionPayerLabel: string;
}) {
  const payer = trimOrNull(input.sessionPayerLabel) ?? "Unknown";
  const guests = Number.isInteger(input.guestCount) && input.guestCount > 0 ? input.guestCount : 0;
  const off = Number.isInteger(input.shuttleOffPlayersCount) && input.shuttleOffPlayersCount > 0 ? input.shuttleOffPlayersCount : 0;
  return [
    `Total: ${centsToMoneyString(input.totalCostCents)}`,
    `Shuttle OFF players: ${off}, Guests: ${guests}`,
    `Session payer: ${payer}`
  ].join("\n");
}
