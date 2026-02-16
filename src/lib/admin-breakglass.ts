export type BreakglassConfig = {
  enabled: boolean;
  username: string | null;
  password: string | null;
};

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export function getBreakglassConfig(): BreakglassConfig {
  const enabled = process.env.ENABLE_ADMIN_BREAKGLASS === "true";
  const usernameRaw = process.env.ADMIN_BREAKGLASS_USERNAME ?? "";
  const passwordRaw = process.env.ADMIN_BREAKGLASS_PASSWORD ?? "";
  const username = usernameRaw.trim() ? normalizeAdminUsername(usernameRaw) : null;
  const password = passwordRaw.trim() ? passwordRaw : null;
  return { enabled, username, password };
}

export function isBreakglassActive(config: BreakglassConfig) {
  return config.enabled && Boolean(config.username) && Boolean(config.password);
}
