import { describe, expect, it } from "vitest";
import {
  MAX_AVATAR_FILE_SIZE_BYTES,
  avatarPathToPublicUrl,
  getInitials,
  validateAvatarFile
} from "../src/lib/player-avatar";

describe("player avatar helpers", () => {
  it("builds initials from names", () => {
    expect(getInitials("Bo")).toBe("BO");
    expect(getInitials("  Trung Tran  ")).toBe("TT");
    expect(getInitials("")).toBe("?");
    expect(getInitials("Ánh")).toBe("ÁN");
  });

  it("validates allowed mime types and max file size", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 1200 }).ok).toBe(true);
    expect(validateAvatarFile({ type: "image/png", size: MAX_AVATAR_FILE_SIZE_BYTES }).ok).toBe(true);
    expect(validateAvatarFile({ type: "application/pdf", size: 200 }).ok).toBe(false);
    expect(validateAvatarFile({ type: "image/webp", size: MAX_AVATAR_FILE_SIZE_BYTES + 1 }).ok).toBe(false);
  });

  it("builds public URL from avatar path", () => {
    expect(avatarPathToPublicUrl("https://example.supabase.co", "player-1/hello world.jpg")).toBe(
      "https://example.supabase.co/storage/v1/object/public/player-avatars/player-1/hello%20world.jpg"
    );
    expect(avatarPathToPublicUrl(undefined, "player-1/a.jpg")).toBeNull();
    expect(avatarPathToPublicUrl("https://example.supabase.co", null)).toBeNull();
  });
});
