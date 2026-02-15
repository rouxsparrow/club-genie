export const MAX_EMAIL_PREVIEW_CHARS = 20000;

export type EmailPreviewMessage = {
  id: string;
  rawHtml: string | null;
  rawText: string | null;
  htmlLength: number;
  textLength: number;
  htmlTruncated: boolean;
  textTruncated: boolean;
};

export type EmailPreviewStatus = "NOT_INGESTED" | "PARSE_FAILED" | "SESSION_CREATED" | "INGESTED_NO_SESSION";

export type EmailReceiptStatusRow = {
  gmail_message_id: string;
  parse_status: string | null;
  parse_error: string | null;
  parsed_session_date: string | null;
};

export type SessionStatusRow = {
  id: string;
  session_date: string;
  status: string | null;
};

export type EmailPreviewMessageWithStatus = EmailPreviewMessage & {
  status: EmailPreviewStatus;
  parseError: string | null;
  parsedSessionDate: string | null;
  sessionId: string | null;
  sessionStatus: string | null;
};

function normalizeBody(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value.length === 0) {
    return null;
  }
  return value;
}

function truncateBody(value: string | null, maxChars: number) {
  if (!value) {
    return { body: null, length: 0, truncated: false };
  }
  if (value.length <= maxChars) {
    return { body: value, length: value.length, truncated: false };
  }
  return { body: value.slice(0, maxChars), length: value.length, truncated: true };
}

export function normalizeEmailPreviewMessages(payload: unknown, maxChars = MAX_EMAIL_PREVIEW_CHARS): EmailPreviewMessage[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const message = entry as Record<string, unknown>;
      const id = typeof message.id === "string" ? message.id.trim() : "";
      if (!id) {
        return null;
      }

      const text = truncateBody(normalizeBody(message.rawText), maxChars);
      const html = truncateBody(normalizeBody(message.rawHtml), maxChars);

      return {
        id,
        rawHtml: html.body,
        rawText: text.body,
        htmlLength: html.length,
        textLength: text.length,
        htmlTruncated: html.truncated,
        textTruncated: text.truncated
      };
    })
    .filter((entry): entry is EmailPreviewMessage => entry !== null);
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mergeEmailPreviewStatuses(
  messages: EmailPreviewMessage[],
  receiptRows: EmailReceiptStatusRow[],
  sessionRows: SessionStatusRow[]
): EmailPreviewMessageWithStatus[] {
  const receiptByMessageId = new Map<string, EmailReceiptStatusRow>();
  for (const row of receiptRows) {
    const id = typeof row.gmail_message_id === "string" ? row.gmail_message_id.trim() : "";
    if (!id) continue;
    if (!receiptByMessageId.has(id)) {
      receiptByMessageId.set(id, row);
    }
  }

  const sessionByDate = new Map<string, SessionStatusRow>();
  for (const row of sessionRows) {
    const date = normalizeDate(row.session_date);
    if (!date) continue;
    if (!sessionByDate.has(date)) {
      sessionByDate.set(date, row);
    }
  }

  return messages.map((message) => {
    const receipt = receiptByMessageId.get(message.id);
    if (!receipt) {
      return {
        ...message,
        status: "NOT_INGESTED",
        parseError: null,
        parsedSessionDate: null,
        sessionId: null,
        sessionStatus: null
      };
    }

    const parsedSessionDate = normalizeDate(receipt.parsed_session_date);
    if (receipt.parse_status === "FAILED") {
      return {
        ...message,
        status: "PARSE_FAILED",
        parseError: receipt.parse_error,
        parsedSessionDate,
        sessionId: null,
        sessionStatus: null
      };
    }

    if (receipt.parse_status === "SUCCESS") {
      const session = parsedSessionDate ? sessionByDate.get(parsedSessionDate) : null;
      if (session) {
        return {
          ...message,
          status: "SESSION_CREATED",
          parseError: null,
          parsedSessionDate,
          sessionId: session.id,
          sessionStatus: session.status,
        };
      }
      return {
        ...message,
        status: "INGESTED_NO_SESSION",
        parseError: null,
        parsedSessionDate,
        sessionId: null,
        sessionStatus: null
      };
    }

    return {
      ...message,
      status: "NOT_INGESTED",
      parseError: null,
      parsedSessionDate: null,
      sessionId: null,
      sessionStatus: null
    };
  });
}
