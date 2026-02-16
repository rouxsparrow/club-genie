export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AdminSessionPayload = {
  uid: string | null;
  un: string;
  sv: number;
  iat: number;
  exp: number;
  bg: boolean;
};
