export type DeactivateGuardInput = {
  isSelf: boolean;
  targetCurrentlyActive: boolean;
  activeAdminCount: number;
};

export type DeactivateGuardResult =
  | { ok: true }
  | { ok: false; error: "cannot_deactivate_self" | "cannot_deactivate_last_active_admin" };

export function validateDeactivateAdminAccount(input: DeactivateGuardInput): DeactivateGuardResult {
  if (!input.targetCurrentlyActive) {
    return { ok: true };
  }
  if (input.isSelf) {
    return { ok: false, error: "cannot_deactivate_self" };
  }
  if (input.activeAdminCount <= 1) {
    return { ok: false, error: "cannot_deactivate_last_active_admin" };
  }
  return { ok: true };
}
