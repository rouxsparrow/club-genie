export type TabKey = 'accounts' | 'clubs' | 'players' | 'automation' | 'emails';

export type Club = {
  id: string;
  name: string;
};

export type Player = {
  id: string;
  name: string;
  active: boolean;
  splitwise_user_id?: number | null;
  avatar_path?: string | null;
  avatar_url?: string | null;
  clubs?: Club[];
};

export type PlayersResponse = {
  ok: boolean;
  players?: Player[];
  error?: string;
};

export type RunHistoryStatusFilter = 'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
export type RunHistorySourceFilter = 'ALL' | 'GITHUB_CRON' | 'ADMIN_MANUAL' | 'API' | 'UNKNOWN';

export type RunHistoryEntry = {
  id: string;
  job_type: 'INGESTION' | 'SPLITWISE';
  run_source: RunHistorySourceFilter;
  status: Exclude<RunHistoryStatusFilter, 'ALL'>;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  summary: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string | null;
};

export type EmailPreviewMessage = {
  id: string;
  rawHtml: string | null;
  rawText: string | null;
  htmlLength: number;
  textLength: number;
  htmlTruncated: boolean;
  textTruncated: boolean;
  status: 'NOT_INGESTED' | 'PARSE_FAILED' | 'SESSION_CREATED' | 'INGESTED_NO_SESSION';
  parseError: string | null;
  parsedSessionDate: string | null;
  sessionId: string | null;
  sessionStatus: string | null;
};

export type EmailRerunOutcomeStatus = 'INGESTED' | 'DEDUPED' | 'PARSE_FAILED' | 'FETCH_FAILED';

export type EmailRerunOutcome = {
  messageId: string;
  status: EmailRerunOutcomeStatus;
  reason: string | null;
};

export type EmailRerunChip = {
  status: EmailRerunOutcomeStatus;
  text: string;
  tone: 'emerald' | 'amber' | 'rose';
};

export type EmailRerunLog = {
  summary: string;
  raw: unknown;
};
