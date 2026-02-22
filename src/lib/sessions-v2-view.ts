export type SessionsV2Filter = "upcoming" | "past";

export type SessionViewStatus = "open" | "full" | "closed" | "draft";

type DatedSession<T> = T & { date: Date };

export function toSessionViewStatus(status: string | null | undefined): SessionViewStatus {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "CLOSED") return "closed";
  if (normalized === "DRAFT") return "draft";
  if (normalized === "FULL") return "full";
  return "open";
}

export function shouldIncludeSessionInFilter(status: SessionViewStatus, filter: SessionsV2Filter, isAdmin: boolean) {
  if (filter === "upcoming") {
    return status === "open" || status === "full";
  }
  if (isAdmin) {
    return status === "closed" || status === "draft";
  }
  return status === "closed";
}

export function formatParticipantSummary(playerCount: number, guestCount: number) {
  const base = `${playerCount} player${playerCount === 1 ? "" : "s"} joined`;
  if (guestCount > 0) {
    return `${base} | Guests x${guestCount}`;
  }
  return base;
}

export function groupSessionsByMonth<T extends { date: Date }>(items: T[]): Array<{ month: string; sessions: T[] }> {
  const ordered = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
  const groups = new Map<string, T[]>();

  for (const item of ordered) {
    const month = item.date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const monthItems = groups.get(month);
    if (monthItems) {
      monthItems.push(item);
    } else {
      groups.set(month, [item]);
    }
  }

  return Array.from(groups.entries()).map(([month, sessions]) => ({ month, sessions }));
}

export function parseSessionDateToLocalDate(sessionDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sessionDate);
  if (!match) {
    return new Date(sessionDate);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

export function sortByDateAsc<T extends DatedSession<Record<string, unknown>>>(items: T[]) {
  return [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
}
