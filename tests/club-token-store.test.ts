import { beforeEach, describe, expect, it } from "vitest";
import {
  addClubTokenToStorage,
  CLUB_TOKENS_STORAGE_KEY,
  readClubTokensFromStorage,
  removeClubTokenFromStorage,
  writeClubTokensToStorage
} from "../src/lib/club-token-store";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = { localStorage: storage };
  process.env.NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY = "club_token";
});

describe("club token store", () => {
  it("writes and reads unique tokens", () => {
    writeClubTokensToStorage(["a", "b", "a", "  b  "]);
    expect(readClubTokensFromStorage()).toEqual(["a", "b"]);
  });

  it("migrates legacy club_token into club_tokens list", () => {
    (window as unknown as { localStorage: MemoryStorage }).localStorage.setItem("club_token", "legacy123");
    expect(readClubTokensFromStorage()).toEqual(["legacy123"]);
    expect(JSON.parse((window as unknown as { localStorage: MemoryStorage }).localStorage.getItem(CLUB_TOKENS_STORAGE_KEY) ?? "null")).toEqual(["legacy123"]);
  });

  it("adds and removes tokens", () => {
    expect(addClubTokenToStorage("t1")).toEqual(["t1"]);
    expect(addClubTokenToStorage("t2")).toEqual(["t1", "t2"]);
    expect(addClubTokenToStorage("t1")).toEqual(["t1", "t2"]);
    expect(removeClubTokenFromStorage("t1")).toEqual(["t2"]);
  });
});
