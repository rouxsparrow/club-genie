import { describe, expect, it } from "vitest";
import { getOpenBadgeMotionVars, hashStringToUint } from "../src/lib/open-badge-motion";

const MIN_DURATION = 12.4;
const MAX_DURATION = 15.8;
const MAX_DELAY_MAGNITUDE = 13.6;
const MIN_GLOW_OPACITY = 0.8;
const MAX_GLOW_OPACITY = 0.94;

function readSeconds(value: string) {
  return Number(value.replace("s", ""));
}

describe("open badge motion hash", () => {
  it("returns stable uint hash for identical inputs", () => {
    expect(hashStringToUint("session-1")).toBe(hashStringToUint("session-1"));
    expect(hashStringToUint("session-1")).not.toBe(hashStringToUint("session-2"));
  });
});

describe("open badge motion vars", () => {
  it("returns deterministic CSS variables for same session id", () => {
    const first = getOpenBadgeMotionVars("session-1");
    const second = getOpenBadgeMotionVars("session-1");
    expect(first).toEqual(second);
  });

  it("usually returns distinct motion values for different session ids", () => {
    const first = getOpenBadgeMotionVars("session-1");
    const second = getOpenBadgeMotionVars("session-2");
    expect(first["--open-flicker-delay"]).not.toBe(second["--open-flicker-delay"]);
    expect(first["--open-flicker-duration"]).not.toBe(second["--open-flicker-duration"]);
  });

  it("keeps generated values inside configured bounds", () => {
    const vars = getOpenBadgeMotionVars("session-range-check");
    const delaySeconds = Math.abs(readSeconds(vars["--open-flicker-delay"]));
    const durationSeconds = readSeconds(vars["--open-flicker-duration"]);
    const glowOpacity = Number(vars["--open-glow-opacity"]);

    expect(delaySeconds).toBeGreaterThanOrEqual(0);
    expect(delaySeconds).toBeLessThanOrEqual(MAX_DELAY_MAGNITUDE);
    expect(durationSeconds).toBeGreaterThanOrEqual(MIN_DURATION);
    expect(durationSeconds).toBeLessThanOrEqual(MAX_DURATION);
    expect(glowOpacity).toBeGreaterThanOrEqual(MIN_GLOW_OPACITY);
    expect(glowOpacity).toBeLessThanOrEqual(MAX_GLOW_OPACITY);
  });

  it("returns valid CSS-friendly string values", () => {
    const vars = getOpenBadgeMotionVars("session-css");
    expect(vars["--open-flicker-delay"]).toMatch(/^-\d+\.\d{3}s$/);
    expect(vars["--open-flicker-duration"]).toMatch(/^\d+\.\d{3}s$/);
    expect(vars["--open-glow-opacity"]).toMatch(/^0\.\d{3}$/);
  });
});
