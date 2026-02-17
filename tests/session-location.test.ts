import { describe, expect, it } from "vitest";
import { formatSessionLocationForDisplay } from "../src/lib/session-location";

describe("formatSessionLocationForDisplay", () => {
  it("returns TBD for empty inputs", () => {
    expect(formatSessionLocationForDisplay(null)).toBe("TBD");
    expect(formatSessionLocationForDisplay(undefined)).toBe("TBD");
    expect(formatSessionLocationForDisplay("")).toBe("TBD");
    expect(formatSessionLocationForDisplay("   ")).toBe("TBD");
  });

  it("removes leading Club prefix from location", () => {
    expect(formatSessionLocationForDisplay("Club ABC")).toBe("ABC");
    expect(formatSessionLocationForDisplay("club ABC")).toBe("ABC");
    expect(formatSessionLocationForDisplay("Club   Sbh East Coast @ Expo")).toBe("Sbh East Coast @ Expo");
  });

  it("keeps location words that are not a Club prefix", () => {
    expect(formatSessionLocationForDisplay("Clubhouse Courts")).toBe("Clubhouse Courts");
  });
});
