import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function validateAdminPassword(password: string) {
  const value = password ?? "";
  if (value.length < 10) {
    return { ok: false as const, error: "Password must be at least 10 characters." };
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return { ok: false as const, error: "Password must include at least one letter and one number." };
  }
  return { ok: true as const };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scryptCb(
      password,
      salt,
      KEY_LEN,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result as Buffer);
      }
    );
  });

  return `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const params = parts[1].split(",").reduce<Record<string, number>>((acc, item) => {
      const [key, value] = item.split("=");
      const parsed = Number(value);
      if (!key || !Number.isInteger(parsed) || parsed <= 0) return acc;
      acc[key] = parsed;
      return acc;
    }, {});
    const salt = Buffer.from(parts[2], "base64");
    const expected = Buffer.from(parts[3], "base64");
    if (!params.N || !params.r || !params.p || salt.length === 0 || expected.length === 0) return false;

    const derived = await new Promise<Buffer>((resolve, reject) => {
      scryptCb(
        password,
        salt,
        expected.length,
        {
          N: params.N,
          r: params.r,
          p: params.p
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result as Buffer);
        }
      );
    });

    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
