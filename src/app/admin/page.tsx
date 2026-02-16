"use client";

import { Lock, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminAccountsPanel from "../../components/admin-accounts-panel";
import AdminNavbar from "../../components/admin-navbar";

type TabKey = "accounts" | "players" | "club" | "automation" | "emails" | "gmail" | "splitwise";

type Player = {
  id: string;
  name: string;
  active: boolean;
  splitwise_user_id?: number | null;
  is_default_payer?: boolean;
};

type PlayersResponse = {
  ok: boolean;
  players?: Player[];
  error?: string;
};

type SplitwiseSettings = {
  id: number;
  group_id: number;
  currency_code: string;
  enabled: boolean;
  description_template?: string;
  date_format?: string;
  location_replacements?: Array<{ from: string; to: string }>;
  updated_at: string | null;
};

type AutomationSettings = {
  id: number;
  subject_keywords: string[];
  timezone: string;
  enabled: boolean;
  updated_at: string | null;
};

type GmailConfig = {
  id: number;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  updated_at: string | null;
};

type GmailConfigSource = "table" | "env" | "empty";

type ClubTokenWarningCode = "migration_missing_token_value" | "token_not_recoverable";

type ClubTokenCurrentResponse = {
  ok: boolean;
  token?: string | null;
  tokenVersion?: number | null;
  rotatedAt?: string | null;
  warningCode?: ClubTokenWarningCode;
  warningMessage?: string;
  error?: string;
};

type ReceiptError = {
  id: string;
  gmail_message_id: string;
  parse_error: string | null;
  received_at: string | null;
};

type EmailPreviewMessage = {
  id: string;
  rawHtml: string | null;
  rawText: string | null;
  htmlLength: number;
  textLength: number;
  htmlTruncated: boolean;
  textTruncated: boolean;
  status: "NOT_INGESTED" | "PARSE_FAILED" | "SESSION_CREATED" | "INGESTED_NO_SESSION";
  parseError: string | null;
  parsedSessionDate: string | null;
  sessionId: string | null;
  sessionStatus: string | null;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("players");
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [loadingAutomation, setLoadingAutomation] = useState(true);
  const [automationMessage, setAutomationMessage] = useState<string | null>(null);
  const [runningIngestion, setRunningIngestion] = useState(false);
  const [runSummary, setRunSummary] = useState<{
    total: number;
    ingested: number;
    deduped: number;
    parse_failed: number;
    fetch_failed: number;
  } | null>(null);
  const [receiptErrors, setReceiptErrors] = useState<ReceiptError[]>([]);
  const [loadingReceiptErrors, setLoadingReceiptErrors] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentAccessLink, setCurrentAccessLink] = useState<string | null>(null);
  const [clubMessage, setClubMessage] = useState<string | null>(null);
  const [previewQueryInput, setPreviewQueryInput] = useState("");
  const [loadingEmailPreview, setLoadingEmailPreview] = useState(false);
  const [emailPreviewMessage, setEmailPreviewMessage] = useState<string | null>(null);
  const [emailStatusFilter, setEmailStatusFilter] = useState<
    "ALL" | "SESSION_CREATED" | "PARSE_FAILED" | "NOT_INGESTED" | "INGESTED_NO_SESSION"
  >("ALL");
  const [emailPreview, setEmailPreview] = useState<{
    query: string | null;
    timezone: string | null;
    messages: EmailPreviewMessage[];
  } | null>(null);
  const [loadingGmailConfig, setLoadingGmailConfig] = useState(true);
  const [savingGmailConfig, setSavingGmailConfig] = useState(false);
  const [gmailConfigMessage, setGmailConfigMessage] = useState<string | null>(null);
  const [gmailClientId, setGmailClientId] = useState("");
  const [gmailClientSecret, setGmailClientSecret] = useState("");
  const [gmailRefreshToken, setGmailRefreshToken] = useState("");
  const [gmailUpdatedAt, setGmailUpdatedAt] = useState<string | null>(null);
  const [gmailConfigSource, setGmailConfigSource] = useState<GmailConfigSource>("empty");
  const [splitwiseSettings, setSplitwiseSettings] = useState<SplitwiseSettings | null>(null);
  const [splitwiseGroupIdInput, setSplitwiseGroupIdInput] = useState("");
  const [splitwiseCurrencyInput, setSplitwiseCurrencyInput] = useState("SGD");
  const [splitwiseEnabled, setSplitwiseEnabled] = useState(true);
  const [splitwiseDescriptionTemplate, setSplitwiseDescriptionTemplate] = useState("Badminton {session_date} - {location}");
  const [splitwiseDateFormat, setSplitwiseDateFormat] = useState<"DD/MM/YY" | "YYYY-MM-DD">("DD/MM/YY");
  const [splitwiseLocationMappingsText, setSplitwiseLocationMappingsText] = useState("Club Sbh East Coast @ Expo => Expo");
  const [loadingSplitwise, setLoadingSplitwise] = useState(true);
  const [splitwiseMessage, setSplitwiseMessage] = useState<string | null>(null);
  const [runningSplitwise, setRunningSplitwise] = useState(false);
  const [splitwiseTestResult, setSplitwiseTestResult] = useState<string | null>(null);
  const [splitwiseRunSummary, setSplitwiseRunSummary] = useState<{
    closed_updated: number;
    splitwise_created: number;
    splitwise_skipped: number;
    splitwise_failed: number;
  } | null>(null);
  const [splitwiseRunErrors, setSplitwiseRunErrors] = useState<
    Array<{ session_id: string; session_date?: string; code: string; message: string }>
  >([]);
  const [splitwiseGroupsResult, setSplitwiseGroupsResult] = useState<{ groups: unknown[]; raw: unknown } | null>(null);
  const [splitwiseGroupDetailIdInput, setSplitwiseGroupDetailIdInput] = useState("");
  const [splitwiseGroupDetailResult, setSplitwiseGroupDetailResult] = useState<{ group: unknown; raw: unknown } | null>(null);
  const [splitwiseUserIdDrafts, setSplitwiseUserIdDrafts] = useState<Record<string, string>>({});
  const [splitwiseExpenseStatusFilter, setSplitwiseExpenseStatusFilter] = useState<"ALL" | "PENDING" | "CREATED" | "FAILED">("ALL");
  const [splitwiseExpenseRecords, setSplitwiseExpenseRecords] = useState<
    Array<{
      id: string;
      session_id: string;
      splitwise_expense_id: string | null;
      amount: number | null;
      status: string | null;
      last_error: string | null;
      updated_at: string | null;
      created_at: string | null;
      session?: { id: string; session_date: string; status: string | null; splitwise_status: string | null; location: string | null } | null;
    }>
  >([]);
  const [loadingSplitwiseRecords, setLoadingSplitwiseRecords] = useState(false);

  const activePlayers = useMemo(() => players.filter((player) => player.active), [players]);
  const inactivePlayers = useMemo(() => players.filter((player) => !player.active), [players]);
  const filteredEmailPreviewMessages = useMemo(() => {
    if (!emailPreview) return [];
    if (emailStatusFilter === "ALL") return emailPreview.messages;
    return emailPreview.messages.filter((message) => message.status === emailStatusFilter);
  }, [emailPreview, emailStatusFilter]);

  const refreshCurrentClubToken = async () => {
    const response = await fetch("/api/admin/club-token/current", { credentials: "include" });
    const data = (await response.json()) as ClubTokenCurrentResponse;
    if (!data.ok) {
      setClubMessage(data.error ?? "Failed to load current token from DB.");
      setCurrentToken(null);
      setCurrentAccessLink(null);
      return;
    }
    const token = typeof data.token === "string" && data.token.trim() ? data.token : null;
    setCurrentToken(token);
    setCurrentAccessLink(token ? `${window.location.origin}/sessions?t=${token}` : null);
    if (!token && data.warningMessage) {
      setClubMessage(data.warningMessage);
      return;
    }
    setClubMessage(null);
  };

  useEffect(() => {
    setMounted(true);
    let isMounted = true;
    Promise.all([
      fetch("/api/admin/players", { credentials: "include" }).then((response) => response.json()),
      fetch("/api/admin/automation-settings", { credentials: "include" }).then((response) => response.json()),
      fetch("/api/admin/receipt-errors", { credentials: "include" }).then((response) => response.json()),
      fetch("/api/admin/club-token/current", { credentials: "include" }).then((response) => response.json()),
      fetch("/api/admin/gmail-config", { credentials: "include" }).then((response) => response.json()),
      fetch("/api/admin/splitwise-settings", { credentials: "include" }).then((response) => response.json())
    ])
      .then(([playersData, settingsData, errorsData, tokenData, gmailConfigData, splitwiseSettingsData]) => {
        if (!isMounted) return;
        const playersPayload = playersData as PlayersResponse;
        if (playersPayload.ok) {
          setPlayers(playersPayload.players ?? []);
        } else {
          setPlayersError(playersPayload.error ?? "Failed to load players.");
        }
        setLoadingPlayers(false);

        const settingsPayload = settingsData as { ok: boolean; settings?: AutomationSettings };
        if (settingsPayload.ok && settingsPayload.settings) {
          setAutomationSettings(settingsPayload.settings);
          setKeywordsInput((settingsPayload.settings.subject_keywords ?? []).join(", "));
        } else {
          setAutomationMessage("Failed to load automation settings.");
        }
        setLoadingAutomation(false);

        const errorsPayload = errorsData as { ok: boolean; errors?: ReceiptError[] };
        if (errorsPayload.ok) {
          setReceiptErrors(errorsPayload.errors ?? []);
        }
        setLoadingReceiptErrors(false);

        const tokenPayload = tokenData as ClubTokenCurrentResponse;
        if (tokenPayload.ok) {
          const token = typeof tokenPayload.token === "string" && tokenPayload.token.trim() ? tokenPayload.token : null;
          setCurrentToken(token);
          setCurrentAccessLink(token ? `${window.location.origin}/sessions?t=${token}` : null);
          if (!token && tokenPayload.warningMessage) {
            setClubMessage(tokenPayload.warningMessage);
          } else {
            setClubMessage(null);
          }
        } else {
          setClubMessage(tokenPayload.error ?? "Failed to load current token from DB.");
        }

        const gmailPayload = gmailConfigData as {
          ok: boolean;
          config?: GmailConfig;
          source?: GmailConfigSource;
          error?: string;
        };
        if (!gmailPayload.ok || !gmailPayload.config) {
          setGmailConfigMessage(gmailPayload.error ?? "Failed to load Gmail config.");
        } else {
          setGmailClientId(gmailPayload.config.client_id ?? "");
          setGmailClientSecret(gmailPayload.config.client_secret ?? "");
          setGmailRefreshToken(gmailPayload.config.refresh_token ?? "");
          setGmailUpdatedAt(gmailPayload.config.updated_at ?? null);
          const source = gmailPayload.source ?? "empty";
          setGmailConfigSource(source);
          if (source === "env") {
            setGmailConfigMessage("Loaded from runtime env fallback. Save once to persist in database.");
          } else if (source === "empty") {
            setGmailConfigMessage("No Gmail config found yet.");
          } else {
            setGmailConfigMessage(null);
          }
        }
        setLoadingGmailConfig(false);

        const splitwisePayload = splitwiseSettingsData as { ok: boolean; settings?: SplitwiseSettings; error?: string };
        if (splitwisePayload.ok && splitwisePayload.settings) {
          setSplitwiseSettings(splitwisePayload.settings);
          setSplitwiseGroupIdInput(String(splitwisePayload.settings.group_id ?? 0));
          setSplitwiseCurrencyInput(splitwisePayload.settings.currency_code ?? "SGD");
          setSplitwiseEnabled(Boolean(splitwisePayload.settings.enabled));
          setSplitwiseGroupDetailIdInput(String(splitwisePayload.settings.group_id ?? 0));
          setSplitwiseDescriptionTemplate(
            (typeof splitwisePayload.settings.description_template === "string" && splitwisePayload.settings.description_template.trim()
              ? splitwisePayload.settings.description_template.trim()
              : "Badminton {session_date} - {location}") as string
          );
          setSplitwiseDateFormat(
            (typeof splitwisePayload.settings.date_format === "string" && splitwisePayload.settings.date_format.trim().toUpperCase() === "YYYY-MM-DD"
              ? "YYYY-MM-DD"
              : "DD/MM/YY") as "DD/MM/YY" | "YYYY-MM-DD"
          );
          const mappings = Array.isArray(splitwisePayload.settings.location_replacements)
            ? splitwisePayload.settings.location_replacements
                .map((row) => {
                  const from = typeof row?.from === "string" ? row.from.trim() : "";
                  const to = typeof row?.to === "string" ? row.to.trim() : "";
                  if (!from || !to) return null;
                  return `${from} => ${to}`;
                })
                .filter((line): line is string => Boolean(line))
            : [];
          setSplitwiseLocationMappingsText(mappings.length > 0 ? mappings.join("\n") : "");
          setSplitwiseMessage(null);
        } else {
          setSplitwiseMessage(splitwisePayload.error ?? "Failed to load Splitwise settings.");
        }
        setLoadingSplitwise(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPlayersError("Failed to load players.");
        setLoadingPlayers(false);
        setAutomationMessage("Failed to load automation settings.");
        setLoadingAutomation(false);
        setLoadingReceiptErrors(false);
        setClubMessage("Failed to load current token from DB.");
        setGmailConfigMessage("Failed to load Gmail config.");
        setLoadingGmailConfig(false);
        setSplitwiseMessage("Failed to load Splitwise settings.");
        setLoadingSplitwise(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Initialize draft inputs from loaded players once, but allow user edits to persist locally.
    setSplitwiseUserIdDrafts((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, string> = {};
      players.forEach((player) => {
        next[player.id] = typeof player.splitwise_user_id === "number" ? String(player.splitwise_user_id) : "";
      });
      return next;
    });
  }, [players]);

  const refreshPlayers = async () => {
    setLoadingPlayers(true);
    setPlayersError(null);
    const response = await fetch("/api/admin/players", { credentials: "include" });
    const data = (await response.json()) as PlayersResponse;
    if (data.ok) {
      setPlayers(data.players ?? []);
    } else {
      setPlayersError(data.error ?? "Failed to load players.");
    }
    setLoadingPlayers(false);
  };

  const refreshAutomationSettings = async () => {
    setLoadingAutomation(true);
    const response = await fetch("/api/admin/automation-settings", { credentials: "include" });
    const data = (await response.json()) as { ok: boolean; settings?: AutomationSettings; error?: string };
    if (!data.ok || !data.settings) {
      setAutomationMessage(data.error ?? "Failed to load automation settings.");
      setLoadingAutomation(false);
      return;
    }
    setAutomationSettings(data.settings);
    setKeywordsInput((data.settings.subject_keywords ?? []).join(", "));
    setLoadingAutomation(false);
  };

  const refreshReceiptErrors = async () => {
    setLoadingReceiptErrors(true);
    const response = await fetch("/api/admin/receipt-errors", { credentials: "include" });
    const data = (await response.json()) as { ok: boolean; errors?: ReceiptError[] };
    if (data.ok) {
      setReceiptErrors(data.errors ?? []);
    }
    setLoadingReceiptErrors(false);
  };

  const saveAutomationSettings = async () => {
    const keywords = keywordsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      setAutomationMessage("Provide at least one subject keyword.");
      return;
    }

    const response = await fetch("/api/admin/automation-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subjectKeywords: keywords })
    });
    const data = (await response.json()) as { ok: boolean; settings?: AutomationSettings; error?: string };
    if (!data.ok || !data.settings) {
      setAutomationMessage(data.error ?? "Failed to save settings.");
      return;
    }
    setAutomationSettings(data.settings);
    setKeywordsInput((data.settings.subject_keywords ?? []).join(", "));
    setAutomationMessage("Automation settings saved.");
  };

  const runIngestionNow = async () => {
    setRunningIngestion(true);
    setAutomationMessage(null);
    const response = await fetch("/api/admin/ingestion/run", {
      method: "POST",
      credentials: "include"
    });
    const data = (await response.json()) as {
      ok: boolean;
      total?: number;
      ingested?: number;
      deduped?: number;
      parse_failed?: number;
      fetch_failed?: number;
      error?: string;
    };
    if (!data.ok) {
      setAutomationMessage(data.error ?? "Ingestion run failed.");
      setRunningIngestion(false);
      return;
    }

    setRunSummary({
      total: data.total ?? 0,
      ingested: data.ingested ?? 0,
      deduped: data.deduped ?? 0,
      parse_failed: data.parse_failed ?? 0,
      fetch_failed: data.fetch_failed ?? 0
    });
    setAutomationMessage("Ingestion run completed.");
    setRunningIngestion(false);
    await Promise.all([refreshReceiptErrors(), refreshAutomationSettings()]);
  };

  const loadEmailPreview = async () => {
    setLoadingEmailPreview(true);
    setEmailPreviewMessage(null);
    const query = previewQueryInput.trim();
    const response = await fetch("/api/admin/ingestion/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(query ? { query } : {})
    });
    const data = (await response.json()) as {
      ok: boolean;
      query?: string | null;
      timezone?: string | null;
      messages?: EmailPreviewMessage[];
      error?: string;
    };
    if (!data.ok) {
      setEmailPreviewMessage(data.error ?? "Failed to load email preview.");
      setLoadingEmailPreview(false);
      return;
    }

    setEmailPreview({
      query: data.query ?? null,
      timezone: data.timezone ?? null,
      messages: data.messages ?? []
    });
    setEmailPreviewMessage("Email preview loaded.");
    setLoadingEmailPreview(false);
  };

  const saveGmailConfig = async () => {
    setSavingGmailConfig(true);
    setGmailConfigMessage(null);
    const response = await fetch("/api/admin/gmail-config", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        clientId: gmailClientId,
        clientSecret: gmailClientSecret,
        refreshToken: gmailRefreshToken
      })
    });
    const data = (await response.json()) as { ok: boolean; config?: GmailConfig; error?: string };
    if (!data.ok || !data.config) {
      setGmailConfigMessage(data.error ?? "Failed to save Gmail config.");
      setSavingGmailConfig(false);
      return;
    }
    setGmailClientId(data.config.client_id ?? "");
    setGmailClientSecret(data.config.client_secret ?? "");
    setGmailRefreshToken(data.config.refresh_token ?? "");
    setGmailUpdatedAt(data.config.updated_at ?? null);
    setGmailConfigSource("table");
    setGmailConfigMessage("Gmail config saved.");
    setSavingGmailConfig(false);
  };

  const handleAddPlayer = async () => {
    setActionMessage(null);
    const name = newPlayerName.trim();
    if (!name) {
      setActionMessage("Enter a player name.");
      return;
    }
    const response = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to add player.");
      return;
    }
    setNewPlayerName("");
    await refreshPlayers();
    setActionMessage("Player added.");
  };

  const startRename = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  };

  const cancelRename = () => {
    setEditingPlayerId(null);
    setEditingName("");
  };

  const submitRename = async (playerId: string) => {
    const name = editingName.trim();
    if (!name) {
      setActionMessage("Name cannot be empty.");
      return;
    }
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to rename player.");
      return;
    }
    cancelRename();
    await refreshPlayers();
    setActionMessage("Player renamed.");
  };

  const setPlayerActive = async (playerId: string, active: boolean) => {
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setActionMessage(data.error ?? "Failed to update player.");
      return;
    }
    await refreshPlayers();
    setActionMessage(active ? "Player reactivated." : "Player deactivated.");
  };

  const updatePlayerSplitwiseUserId = async (playerId: string, value: string) => {
    setActionMessage(null);
    setSplitwiseUserIdDrafts((prev) => ({ ...prev, [playerId]: value }));
    const trimmed = value.trim();
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ splitwiseUserId: trimmed ? trimmed : null })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; player?: Player; error?: string } | null;
    if (!data?.ok || !data.player) {
      setActionMessage(data?.error ?? "Failed to update Splitwise user id.");
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, splitwise_user_id: data.player?.splitwise_user_id ?? null } : p)));
    setSplitwiseUserIdDrafts((prev) => ({
      ...prev,
      [playerId]: typeof data.player?.splitwise_user_id === "number" ? String(data.player.splitwise_user_id) : ""
    }));
    setActionMessage("Splitwise user id updated.");
  };

  const setDefaultPayer = async (playerId: string, enabled: boolean) => {
    setActionMessage(null);
    const response = await fetch(`/api/admin/players/${playerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isDefaultPayer: enabled })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; player?: Player; error?: string } | null;
    if (!data?.ok || !data.player) {
      setActionMessage(data?.error ?? "Failed to update default payer.");
      return;
    }
    setPlayers((prev) =>
      prev.map((p) => {
        if (enabled) {
          return { ...p, is_default_payer: p.id === playerId };
        }
        if (p.id === playerId) return { ...p, is_default_payer: false };
        return p;
      })
    );
    setActionMessage(enabled ? "Default payer updated." : "Default payer cleared.");
  };

  const saveSplitwiseSettings = async () => {
    setSplitwiseMessage(null);
    const locationReplacements = splitwiseLocationMappingsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [fromRaw, toRaw] = line.split("=>");
        const from = (fromRaw ?? "").trim();
        const to = (toRaw ?? "").trim();
        if (!from || !to) return null;
        return { from, to };
      })
      .filter((row): row is { from: string; to: string } => Boolean(row));

    const response = await fetch("/api/admin/splitwise-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        groupId: splitwiseGroupIdInput,
        currencyCode: splitwiseCurrencyInput,
        enabled: splitwiseEnabled,
        descriptionTemplate: splitwiseDescriptionTemplate,
        dateFormat: splitwiseDateFormat,
        locationReplacements
      })
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; settings?: SplitwiseSettings; error?: string } | null;
    if (!data?.ok || !data.settings) {
      setSplitwiseMessage(data?.error ?? "Failed to save Splitwise settings.");
      return;
    }
    setSplitwiseSettings(data.settings);
    setSplitwiseGroupIdInput(String(data.settings.group_id ?? 0));
    setSplitwiseCurrencyInput(data.settings.currency_code ?? "SGD");
    setSplitwiseEnabled(Boolean(data.settings.enabled));
    setSplitwiseGroupDetailIdInput(String(data.settings.group_id ?? 0));
    setSplitwiseDescriptionTemplate(
      (typeof data.settings.description_template === "string" && data.settings.description_template.trim()
        ? data.settings.description_template.trim()
        : "Badminton {session_date} - {location}") as string
    );
    setSplitwiseDateFormat(
      (typeof data.settings.date_format === "string" && data.settings.date_format.trim().toUpperCase() === "YYYY-MM-DD"
        ? "YYYY-MM-DD"
        : "DD/MM/YY") as "DD/MM/YY" | "YYYY-MM-DD"
    );
    const mappings = Array.isArray(data.settings.location_replacements)
      ? data.settings.location_replacements
          .map((row) => {
            const from = typeof row?.from === "string" ? row.from.trim() : "";
            const to = typeof row?.to === "string" ? row.to.trim() : "";
            if (!from || !to) return null;
            return `${from} => ${to}`;
          })
          .filter((line): line is string => Boolean(line))
      : [];
    setSplitwiseLocationMappingsText(mappings.length > 0 ? mappings.join("\n") : "");
    setSplitwiseMessage("Splitwise settings saved.");
  };

  const testSplitwise = async () => {
    setSplitwiseTestResult(null);
    const response = await fetch("/api/admin/splitwise/test", {
      method: "POST",
      credentials: "include"
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; currentUser?: { id?: number | null; first_name?: string | null; last_name?: string | null }; error?: string }
      | null;
    if (!data?.ok) {
      setSplitwiseTestResult(data?.error ?? "Splitwise test failed.");
      return;
    }
    const id = data.currentUser?.id ?? null;
    const name = [data.currentUser?.first_name, data.currentUser?.last_name].filter(Boolean).join(" ");
    setSplitwiseTestResult(`Connected as ${name || "user"}${id ? ` (id ${id})` : ""}.`);
  };

  const runSplitwiseNow = async () => {
    setRunningSplitwise(true);
    setSplitwiseMessage(null);
    setSplitwiseRunErrors([]);
    const response = await fetch("/api/admin/splitwise/run", {
      method: "POST",
      credentials: "include"
    });
    const data = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          closed_updated?: number;
          splitwise_created?: number;
          splitwise_skipped?: number;
          splitwise_failed?: number;
          errors?: Array<{ session_id: string; session_date?: string; code: string; message: string }>;
          error?: string;
        }
      | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Splitwise sync failed.");
      setRunningSplitwise(false);
      return;
    }
    setSplitwiseRunSummary({
      closed_updated: data.closed_updated ?? 0,
      splitwise_created: data.splitwise_created ?? 0,
      splitwise_skipped: data.splitwise_skipped ?? 0,
      splitwise_failed: data.splitwise_failed ?? 0
    });
    setSplitwiseRunErrors(Array.isArray(data.errors) ? data.errors : []);
    setSplitwiseMessage("Splitwise sync completed.");
    setRunningSplitwise(false);
  };

  const fetchSplitwiseGroups = async () => {
    setSplitwiseMessage(null);
    setSplitwiseGroupsResult(null);
    const response = await fetch("/api/admin/splitwise/groups", { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; groups?: unknown[]; raw?: unknown; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to fetch groups.");
      return;
    }
    setSplitwiseGroupsResult({ groups: Array.isArray(data.groups) ? data.groups : [], raw: data.raw ?? null });
  };

  const fetchSplitwiseGroupDetail = async () => {
    setSplitwiseMessage(null);
    setSplitwiseGroupDetailResult(null);
    const raw = splitwiseGroupDetailIdInput.trim() || splitwiseGroupIdInput.trim();
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setSplitwiseMessage("Provide a valid group id.");
      return;
    }
    const response = await fetch(`/api/admin/splitwise/groups/${parsed}`, { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; group?: unknown; raw?: unknown; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to fetch group detail.");
      return;
    }
    setSplitwiseGroupDetailResult({ group: data.group ?? null, raw: data.raw ?? null });
  };

  const loadSplitwiseRecords = async () => {
    setLoadingSplitwiseRecords(true);
    setSplitwiseMessage(null);
    const qs = new URLSearchParams();
    if (splitwiseExpenseStatusFilter !== "ALL") {
      qs.set("status", splitwiseExpenseStatusFilter);
    }
    qs.set("limit", "50");
    const response = await fetch(`/api/admin/splitwise/expenses?${qs.toString()}`, { credentials: "include" });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; records?: unknown[]; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to load Splitwise records.");
      setLoadingSplitwiseRecords(false);
      return;
    }
    setSplitwiseExpenseRecords(Array.isArray(data.records) ? (data.records as typeof splitwiseExpenseRecords) : []);
    setLoadingSplitwiseRecords(false);
  };

  const deleteSplitwiseRecord = async (sessionId: string) => {
    setSplitwiseMessage(null);
    const confirmed = window.confirm(
      "Delete this Splitwise record from our DB?\n\nIf the record was already created in Splitwise, we will keep the session status as CREATED to avoid duplicates."
    );
    if (!confirmed) return;
    const response = await fetch(`/api/admin/splitwise/expenses/${sessionId}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setSplitwiseMessage(data?.error ?? "Failed to delete Splitwise record.");
      return;
    }
    await loadSplitwiseRecords();
    setSplitwiseMessage("Splitwise record deleted from DB.");
  };

  const handleRotateToken = async () => {
    setIsRotating(true);
    setRotationError(null);
    setClubMessage(null);
    const response = await fetch("/api/admin/club-token/rotate", {
      method: "POST",
      credentials: "include"
    });
    const data = (await response.json()) as {
      ok: boolean;
      token?: string;
      error?: string;
      warningCode?: "token_value_not_persisted";
      warningMessage?: string;
    };
    if (!data.ok || !data.token) {
      setRotationError(data.error ?? "Token rotation failed.");
      setIsRotating(false);
      return;
    }
    setNewToken(data.token);
    setCurrentToken(data.token);
    setCurrentAccessLink(`${window.location.origin}/sessions?t=${data.token}`);
    await refreshCurrentClubToken();
    if (data.warningMessage) {
      setRotationError(data.warningMessage);
    }
    setIsRotating(false);
  };

  const copyInviteLink = async () => {
    if (!newToken) return;
    const link = `${window.location.origin}/sessions?t=${newToken}`;
    await navigator.clipboard.writeText(link);
    setRotationError("Invite link copied.");
  };

  const copyCurrentAccessLink = async () => {
    if (!currentAccessLink) return;
    await navigator.clipboard.writeText(currentAccessLink);
    setClubMessage("Current access link copied.");
  };

  if (!mounted) {
    return <main />;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-6">
        <AdminNavbar currentPath="/admin" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-500">Admin Console</p>
          <h1 className="mt-2 text-4xl font-semibold">Club Control Room</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-300">
            Manage players, access tokens, and session operations.
          </p>
        </div>
        </div>
      </header>

      <nav className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "accounts"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("players")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "players"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Players
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("club")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "club"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Club Access
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("automation")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "automation"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Automation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emails")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "emails"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Email Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("gmail")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "gmail"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Gmail Config
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("splitwise")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "splitwise"
              ? "bg-emerald-500 text-slate-900"
              : "border border-slate-200 text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
          }`}
        >
          Splitwise
        </button>
      </nav>

      {activeTab === "accounts" ? <AdminAccountsPanel /> : null}

      {activeTab === "players" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <UserPlus size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Roster</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Players</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Manage the club roster. Deactivate to preserve history.
            </p>
            {playersError ? <p className="mt-3 text-sm text-rose-500">{playersError}</p> : null}
            {actionMessage ? <p className="mt-3 text-sm text-slate-500">{actionMessage}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Add player name"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800 md:w-72"
              />
              <button
                type="button"
                onClick={handleAddPlayer}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Add Player
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h3 className="text-lg font-semibold">Active</h3>
              {loadingPlayers ? (
                <p className="mt-3 text-sm text-slate-500">Loading players...</p>
              ) : activePlayers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No active players yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {activePlayers.map((player) => (
                    <li key={player.id} className="rounded-2xl border border-slate-200/70 p-4 dark:border-ink-700/60">
                      {editingPlayerId === player.id ? (
                        <div className="grid gap-3">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitRename(player.id)}
                              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelRename}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <strong>{player.name}</strong>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startRename(player)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlayerActive(player.id, false)}
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                              >
                                Deactivate
                              </button>
                            </div>
                          </div>
                          <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30 md:grid-cols-2">
                            <label className="font-semibold">
                              Splitwise User ID
                              <input
                                type="number"
                                inputMode="numeric"
                                value={
                                  splitwiseUserIdDrafts[player.id] ??
                                  (typeof player.splitwise_user_id === "number" ? String(player.splitwise_user_id) : "")
                                }
                                onChange={(event) =>
                                  setSplitwiseUserIdDrafts((prev) => ({ ...prev, [player.id]: event.target.value }))
                                }
                                onBlur={(event) => updatePlayerSplitwiseUserId(player.id, event.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                                placeholder="e.g. 54123"
                              />
                            </label>
                            <label className="flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={Boolean(player.is_default_payer)}
                                onChange={(event) => setDefaultPayer(player.id, event.target.checked)}
                              />
                              Default payer
                            </label>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold">Inactive</h3>
              {loadingPlayers ? (
                <p className="mt-3 text-sm text-slate-500">Loading players...</p>
              ) : inactivePlayers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No inactive players.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {inactivePlayers.map((player) => (
                    <li key={player.id} className="flex items-center justify-between gap-3">
                      <span>{player.name}</span>
                      <button
                        type="button"
                        onClick={() => setPlayerActive(player.id, true)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-ink-700/60 dark:text-slate-100"
                      >
                        Reactivate
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "club" ? (
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Lock size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Access</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Club Access Token</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Rotate the token to invalidate all prior invite links.
            </p>
            {rotationError ? <p className="mt-4 text-sm text-slate-500">{rotationError}</p> : null}
            {newToken ? (
              <div className="mt-4 grid gap-3">
                <p className="text-sm font-semibold">New token</p>
                <code className="rounded-2xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                  {newToken}
                </code>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Copy Invite Link
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRotateToken}
                disabled={isRotating}
                className="mt-4 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {isRotating ? "Rotating..." : "Rotate Token"}
              </button>
            )}
          </div>
          <div className="card-muted">
            <h3 className="text-lg font-semibold">Invite Link</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              After rotating, share the new invite link with your players. The full link includes the new token as a
              query parameter.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Example: https://your-app/sessions?t=NEW_TOKEN
            </p>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-lg font-semibold">Current Access Link</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              This access link is built from the current token stored in Supabase.
            </p>
            {clubMessage ? <p className="mt-3 text-sm text-slate-500">{clubMessage}</p> : null}
            {currentAccessLink ? (
              <div className="mt-4 grid gap-3">
                <code className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                  {currentAccessLink}
                </code>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={copyCurrentAccessLink}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Copy Current Link
                  </button>
                  <code className="rounded-xl border border-slate-200/70 bg-slate-100 px-3 py-2 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                    {currentToken}
                  </code>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  No token found in Supabase yet. Rotate once to create one.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={copyCurrentAccessLink}
                    disabled
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                  >
                    Copy Current Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "automation" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <h2 className="text-2xl font-semibold">Receipt Ingestion</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Configure Gmail subject matching and run ingestion manually when needed.
            </p>
            {automationMessage ? <p className="mt-3 text-sm text-slate-500">{automationMessage}</p> : null}
            {loadingAutomation ? (
              <p className="mt-4 text-sm text-slate-500">Loading automation settings...</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr]">
                <label className="text-sm font-semibold">
                  Subject Keywords (comma separated)
                  <input
                    type="text"
                    value={keywordsInput}
                    onChange={(event) => setKeywordsInput(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="Playtomic, Receipt"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Timezone
                  <input
                    type="text"
                    value={automationSettings?.timezone ?? "Asia/Singapore"}
                    disabled
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-900/40"
                  />
                </label>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveAutomationSettings}
                disabled={loadingAutomation}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={runIngestionNow}
                disabled={runningIngestion}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100 disabled:opacity-60"
              >
                {runningIngestion ? "Running..." : "Run Ingestion Now"}
              </button>
            </div>
            {runSummary ? (
              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60 md:grid-cols-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
                  <p className="font-semibold">{runSummary.total}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Ingested</p>
                  <p className="font-semibold">{runSummary.ingested}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Deduped</p>
                  <p className="font-semibold">{runSummary.deduped}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Parse Failed</p>
                  <p className="font-semibold">{runSummary.parse_failed}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Fetch Failed</p>
                  <p className="font-semibold">{runSummary.fetch_failed}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Parse Failures</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Latest receipt parse failures that require admin review.
            </p>
            {loadingReceiptErrors ? (
              <p className="mt-4 text-sm text-slate-500">Loading failures...</p>
            ) : receiptErrors.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No parse failures.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {receiptErrors.map((error) => (
                  <li key={error.id} className="rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
                    <p className="font-semibold">{error.gmail_message_id}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-300">{error.parse_error ?? "parse_failed"}</p>
                    {error.received_at ? (
                      <p className="mt-1 text-xs text-slate-400">{new Date(error.received_at).toLocaleString()}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "gmail" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <h2 className="text-2xl font-semibold">Gmail OAuth Config</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Stored in Supabase table <code>gmail_oauth_config</code> (row <code>id=1</code>).
            </p>
            {gmailConfigMessage ? <p className="mt-3 text-sm text-slate-500">{gmailConfigMessage}</p> : null}
            <p className="mt-1 text-xs text-slate-400">Source: {gmailConfigSource}</p>
            {gmailUpdatedAt ? (
              <p className="mt-1 text-xs text-slate-400">Last updated: {new Date(gmailUpdatedAt).toLocaleString()}</p>
            ) : null}

            {loadingGmailConfig ? (
              <p className="mt-4 text-sm text-slate-500">Loading config...</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <label className="text-sm font-semibold">
                  Client ID
                  <input
                    type="text"
                    value={gmailClientId}
                    onChange={(event) => setGmailClientId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="Google OAuth client id"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Client Secret
                  <input
                    type="text"
                    value={gmailClientSecret}
                    onChange={(event) => setGmailClientSecret(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="Google OAuth client secret"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Refresh Token
                  <textarea
                    value={gmailRefreshToken}
                    onChange={(event) => setGmailRefreshToken(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="Google OAuth refresh token"
                  />
                </label>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={saveGmailConfig}
                disabled={loadingGmailConfig || savingGmailConfig}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                {savingGmailConfig ? "Saving..." : "Save Gmail Config"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "splitwise" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <h2 className="text-2xl font-semibold">Splitwise</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Configure group settings, map players to Splitwise user IDs, and run the daily sync manually.
            </p>
            {splitwiseMessage ? <p className="mt-3 text-sm text-slate-500">{splitwiseMessage}</p> : null}
            {splitwiseTestResult ? <p className="mt-2 text-sm text-slate-500">{splitwiseTestResult}</p> : null}

            {loadingSplitwise ? (
              <p className="mt-4 text-sm text-slate-500">Loading Splitwise settings...</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="text-sm font-semibold">
                  Group ID
                  <input
                    type="number"
                    inputMode="numeric"
                    value={splitwiseGroupIdInput}
                    onChange={(event) => setSplitwiseGroupIdInput(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="e.g. 12345"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Currency
                  <input
                    type="text"
                    value={splitwiseCurrencyInput}
                    onChange={(event) => setSplitwiseCurrencyInput(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="SGD"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={splitwiseEnabled}
                    onChange={(event) => setSplitwiseEnabled(event.target.checked)}
                  />
                  Enabled
                </label>
              </div>
            )}

            <label className="mt-4 block text-sm font-semibold">
              Expense description template
              <textarea
                value={splitwiseDescriptionTemplate}
                onChange={(event) => setSplitwiseDescriptionTemplate(event.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                placeholder="Badminton {session_date} - {location}"
              />
              <span className="mt-2 block text-xs text-slate-400">
                Placeholders: <code>{"{session_date}"}</code>, <code>{"{location}"}</code>
              </span>
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Session date format
                <select
                  value={splitwiseDateFormat}
                  onChange={(event) => setSplitwiseDateFormat(event.target.value as "DD/MM/YY" | "YYYY-MM-DD")}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                >
                  <option value="DD/MM/YY">DD/MM/YY (01/02/26)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-02-01)</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Location mappings
                <textarea
                  value={splitwiseLocationMappingsText}
                  onChange={(event) => setSplitwiseLocationMappingsText(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                  placeholder={"Club Sbh East Coast @ Expo => Expo"}
                />
                <span className="mt-2 block text-xs text-slate-400">One per line, format: <code>{"from => to"}</code> (case-insensitive substring replace).</span>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSplitwiseSettings}
                disabled={loadingSplitwise}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={testSplitwise}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
              >
                Test Splitwise Connection
              </button>
              <button
                type="button"
                onClick={runSplitwiseNow}
                disabled={runningSplitwise}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100 disabled:opacity-60"
              >
                {runningSplitwise ? "Running..." : "Run Splitwise Sync Now"}
              </button>
            </div>

            {splitwiseRunSummary ? (
              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Closed</p>
                  <p className="font-semibold">{splitwiseRunSummary.closed_updated}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                  <p className="font-semibold">{splitwiseRunSummary.splitwise_created}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Skipped</p>
                  <p className="font-semibold">{splitwiseRunSummary.splitwise_skipped}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Failed</p>
                  <p className="font-semibold">{splitwiseRunSummary.splitwise_failed}</p>
                </div>
              </div>
            ) : null}

            {splitwiseRunErrors.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-ink-700/60">
                <div className="border-b border-slate-200/70 bg-slate-100/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-ink-700/60 dark:bg-ink-900/40 dark:text-slate-300">
                  Splitwise Errors ({splitwiseRunErrors.length})
                </div>
                <div className="divide-y divide-slate-200/70 text-sm dark:divide-ink-700/60">
                  {splitwiseRunErrors.map((entry) => (
                    <div key={`${entry.session_id}:${entry.code}`} className="grid gap-2 px-4 py-3 md:grid-cols-4">
                      <a href={`/sessions/${entry.session_id}`} className="font-semibold text-emerald-600 hover:underline">
                        {entry.session_id.slice(0, 8)}
                      </a>
                      <div className="text-slate-600 dark:text-slate-300">{entry.session_date ?? "-"}</div>
                      <div className="text-slate-600 dark:text-slate-300">{entry.code}</div>
                      <div className="text-slate-600 dark:text-slate-300">{entry.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
              <h3 className="text-lg font-semibold">Group Tools</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Fetch groups via Splitwise API to find the correct group id.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={fetchSplitwiseGroups}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
                >
                  Get All Groups
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={splitwiseGroupDetailIdInput}
                    onChange={(event) => setSplitwiseGroupDetailIdInput(event.target.value)}
                    className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                    placeholder="Group id"
                  />
                  <button
                    type="button"
                    onClick={fetchSplitwiseGroupDetail}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
                  >
                    Get Group Detail
                  </button>
                </div>
              </div>

              {splitwiseGroupsResult ? (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-sm dark:border-ink-700/60 dark:bg-ink-900/30">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Groups</p>
                    <ul className="mt-2 space-y-1">
                      {splitwiseGroupsResult.groups.map((group, idx) => {
                        const g = group as { id?: unknown; name?: unknown };
                        const id = typeof g?.id === "number" || typeof g?.id === "string" ? String(g.id) : `#${idx + 1}`;
                        const name = typeof g?.name === "string" ? g.name : "Group";
                        return (
                          <li key={id} className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{name}</span>
                            <code className="text-xs text-slate-500">{id}</code>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <details className="rounded-2xl border border-slate-200/70 bg-white p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30">
                    <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-200">Raw JSON</summary>
                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                      {JSON.stringify(splitwiseGroupsResult.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : null}

              {splitwiseGroupDetailResult ? (
                <details className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/30" open>
                  <summary className="cursor-pointer font-semibold text-slate-600 dark:text-slate-200">Group Detail JSON</summary>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                    {JSON.stringify(splitwiseGroupDetailResult.raw ?? splitwiseGroupDetailResult.group, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Splitwise Records</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    These come from our local <code>expenses</code> table (idempotency + debug).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={splitwiseExpenseStatusFilter}
                    onChange={(event) =>
                      setSplitwiseExpenseStatusFilter(event.target.value as "ALL" | "PENDING" | "CREATED" | "FAILED")
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                  >
                    <option value="ALL">All</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CREATED">CREATED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                  <button
                    type="button"
                    onClick={loadSplitwiseRecords}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-ink-700/60 dark:text-slate-100"
                  >
                    {loadingSplitwiseRecords ? "Loading..." : "Load Records"}
                  </button>
                </div>
              </div>

              {splitwiseExpenseRecords.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{loadingSplitwiseRecords ? "" : "No records loaded yet."}</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-ink-700/60">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-ink-900/40 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Session</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Splitwise ID</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Last Error</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-ink-700/60">
                      {splitwiseExpenseRecords.map((row) => {
                        const sessionId = row.session_id;
                        const isCreatedWithRemoteId = row.status === "CREATED" && Boolean(row.splitwise_expense_id);
                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-3">
                              <a href={`/sessions/${sessionId}`} className="font-semibold text-emerald-600 hover:underline">
                                {sessionId.slice(0, 8)}
                              </a>
                              {row.session?.location ? (
                                <div className="mt-1 text-xs text-slate-500">{row.session.location}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">{row.session?.session_date ?? "-"}</td>
                            <td className="px-4 py-3">{row.status ?? "-"}</td>
                            <td className="px-4 py-3">
                              {row.splitwise_expense_id ? <code className="text-xs">{row.splitwise_expense_id}</code> : "-"}
                            </td>
                            <td className="px-4 py-3">{typeof row.amount === "number" ? row.amount.toFixed(2) : "-"}</td>
                            <td className="px-4 py-3">
                              {row.last_error ? <span className="text-xs text-rose-600">{row.last_error}</span> : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => deleteSplitwiseRecord(sessionId)}
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
                                title={
                                  isCreatedWithRemoteId
                                    ? "Delete local record only. Session stays CREATED to avoid duplicate expenses."
                                    : "Delete local record and reset session to PENDING."
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {splitwiseSettings?.updated_at ? (
              <p className="mt-2 text-xs text-slate-400">
                Last updated: {new Date(splitwiseSettings.updated_at).toLocaleString()}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "emails" ? (
        <section className="mt-8 grid gap-6">
          <div className="card">
            <h2 className="text-2xl font-semibold">Fetched Email Content</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Preview receipt content fetched by the Gmail function before parsing.
            </p>
            {emailPreviewMessage ? <p className="mt-3 text-sm text-slate-500">{emailPreviewMessage}</p> : null}
            <div className="mt-4 min-w-0 grid gap-3 md:grid-cols-[minmax(0,2fr)_auto] md:items-end">
              <label className="text-sm font-semibold">
                Gmail Query Override (optional)
                <input
                  type="text"
                  value={previewQueryInput}
                  onChange={(event) => setPreviewQueryInput(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800"
                  placeholder='newer_than:7d subject:"Playtomic" subject:"Receipt"'
                />
              </label>
              <button
                type="button"
                onClick={loadEmailPreview}
                disabled={loadingEmailPreview}
                className="md:justify-self-start rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                {loadingEmailPreview ? "Loading..." : "Load Email Content"}
              </button>
            </div>
            {emailPreview ? (
              <div className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 p-4 text-sm dark:border-ink-700/60">
                <p>
                  <span className="font-semibold">Query:</span> {emailPreview.query ?? "-"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Timezone:</span> {emailPreview.timezone ?? "-"}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Messages:</span> {emailPreview.messages.length}
                </p>
                <label className="mt-3 block text-sm font-semibold">
                  Status Filter
                  <select
                    value={emailStatusFilter}
                    onChange={(event) => setEmailStatusFilter(event.target.value as typeof emailStatusFilter)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-ink-700/60 dark:bg-ink-800 md:max-w-xs"
                  >
                    <option value="ALL">All</option>
                    <option value="SESSION_CREATED">Session Created</option>
                    <option value="PARSE_FAILED">Parse Failed</option>
                    <option value="NOT_INGESTED">Not Ingested</option>
                    <option value="INGESTED_NO_SESSION">Ingested, No Session</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold">Email Bodies</h3>
            {loadingEmailPreview ? (
              <p className="mt-4 text-sm text-slate-500">Loading email content...</p>
            ) : !emailPreview ? (
              <p className="mt-4 text-sm text-slate-500">Run preview to inspect fetched emails.</p>
            ) : filteredEmailPreviewMessages.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No matching messages found.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {filteredEmailPreviewMessages.map((message) => (
                  <li key={message.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 p-4 dark:border-ink-700/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all font-semibold">{message.id}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          message.status === "SESSION_CREATED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : message.status === "PARSE_FAILED"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                            : message.status === "INGESTED_NO_SESSION"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                        }`}
                      >
                        {message.status === "SESSION_CREATED"
                          ? "Session Created"
                          : message.status === "PARSE_FAILED"
                          ? "Parse Failed"
                          : message.status === "INGESTED_NO_SESSION"
                          ? "Ingested, No Session"
                          : "Not Ingested"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      text={message.textLength}
                      {message.textTruncated ? " (truncated)" : ""} | html={message.htmlLength}
                      {message.htmlTruncated ? " (truncated)" : ""}
                    </p>
                    {message.parsedSessionDate ? (
                      <p className="mt-1 text-xs text-slate-400">
                        date={message.parsedSessionDate}
                        {message.sessionStatus ? ` | session=${message.sessionStatus}` : ""}
                      </p>
                    ) : null}
                    {message.parseError ? <p className="mt-1 text-xs text-rose-500">{message.parseError}</p> : null}
                    <details className="mt-3 min-w-0">
                      <summary className="cursor-pointer text-sm font-semibold">Text Body</summary>
                      <pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200/80 bg-slate-100 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                        {message.rawText ?? "(empty)"}
                      </pre>
                    </details>
                    <details className="mt-3 min-w-0">
                      <summary className="cursor-pointer text-sm font-semibold">HTML Body (raw)</summary>
                      <pre className="mt-2 max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200/80 bg-slate-100 p-3 text-xs dark:border-ink-700/60 dark:bg-ink-900/40">
                        {message.rawHtml ?? "(empty)"}
                      </pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
