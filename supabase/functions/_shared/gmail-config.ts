export type GmailOauthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type GmailOauthConfigRow = {
  client_id?: unknown;
  client_secret?: unknown;
  refresh_token?: unknown;
} | null | undefined;

function readRequired(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function resolveGmailOauthConfig(
  row: GmailOauthConfigRow,
  env: Pick<Record<string, string | undefined>, "GMAIL_CLIENT_ID" | "GMAIL_CLIENT_SECRET" | "GMAIL_REFRESH_TOKEN">
): GmailOauthConfig | null {
  const rowClientId = readRequired(row?.client_id);
  const rowClientSecret = readRequired(row?.client_secret);
  const rowRefreshToken = readRequired(row?.refresh_token);
  if (rowClientId && rowClientSecret && rowRefreshToken) {
    return {
      clientId: rowClientId,
      clientSecret: rowClientSecret,
      refreshToken: rowRefreshToken
    };
  }

  const envClientId = readRequired(env.GMAIL_CLIENT_ID);
  const envClientSecret = readRequired(env.GMAIL_CLIENT_SECRET);
  const envRefreshToken = readRequired(env.GMAIL_REFRESH_TOKEN);
  if (envClientId && envClientSecret && envRefreshToken) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      refreshToken: envRefreshToken
    };
  }

  return null;
}
