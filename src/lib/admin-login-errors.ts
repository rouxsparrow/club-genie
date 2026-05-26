export type AdminLoginErrorCode = "1" | "db_schema" | "breakglass_config" | "server";

export function resolveAdminLoginErrorCode(input: {
  adminUsersTableMissing: boolean;
  breakglassEnabled: boolean;
  breakglassActive: boolean;
}): AdminLoginErrorCode {
  if (!input.adminUsersTableMissing) return "1";
  if (input.breakglassEnabled && !input.breakglassActive) return "breakglass_config";
  return "db_schema";
}
