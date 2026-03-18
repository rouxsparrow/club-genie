import type { EmailPreviewStatus } from "./ingestion-preview";

export type AdminEmailPreviewMessageLike = {
  id: string;
  status: EmailPreviewStatus;
};

export function isEmailPreviewRerunnable(status: EmailPreviewStatus) {
  return status === "NOT_INGESTED";
}

export function collectNotIngestedMessageIds(messages: AdminEmailPreviewMessageLike[]) {
  const seen = new Set<string>();
  for (const message of messages) {
    if (!isEmailPreviewRerunnable(message.status)) continue;
    const id = typeof message.id === "string" ? message.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
  }
  return [...seen];
}

export function buildSingleEmailRerunPayload(messageId: string) {
  const normalized = messageId.trim();
  if (!normalized) return null;
  return { messageIds: [normalized], rerunMode: "ROW_MESSAGE" as const };
}
