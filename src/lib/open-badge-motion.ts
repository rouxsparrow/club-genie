import type { CSSProperties } from "react";

type OpenBadgeMotionCssVars = CSSProperties & {
  "--open-flicker-delay": string;
  "--open-flicker-duration": string;
  "--open-glow-opacity": string;
};

const BASE_FLICKER_DURATION_SECONDS = 13.6;
const MIN_FLICKER_DURATION_SECONDS = 12.4;
const MAX_FLICKER_DURATION_SECONDS = 15.8;
const MIN_GLOW_OPACITY = 0.8;
const MAX_GLOW_OPACITY = 0.94;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeToUnit(value: number) {
  return value / 0xffffffff;
}

function interpolate(min: number, max: number, unitValue: number) {
  return min + (max - min) * unitValue;
}

export function hashStringToUint(value: string) {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getOpenBadgeMotionVars(sessionId: string): OpenBadgeMotionCssVars {
  const source = sessionId.trim();
  const delaySeed = hashStringToUint(`${source}:delay`);
  const durationSeed = hashStringToUint(`${source}:duration`);
  const glowSeed = hashStringToUint(`${source}:glow`);

  const delaySeconds = clamp(
    interpolate(0, BASE_FLICKER_DURATION_SECONDS, normalizeToUnit(delaySeed)),
    0,
    BASE_FLICKER_DURATION_SECONDS
  );
  const durationSeconds = clamp(
    interpolate(MIN_FLICKER_DURATION_SECONDS, MAX_FLICKER_DURATION_SECONDS, normalizeToUnit(durationSeed)),
    MIN_FLICKER_DURATION_SECONDS,
    MAX_FLICKER_DURATION_SECONDS
  );
  const glowOpacity = clamp(
    interpolate(MIN_GLOW_OPACITY, MAX_GLOW_OPACITY, normalizeToUnit(glowSeed)),
    MIN_GLOW_OPACITY,
    MAX_GLOW_OPACITY
  );

  return {
    "--open-flicker-delay": `-${delaySeconds.toFixed(3)}s`,
    "--open-flicker-duration": `${durationSeconds.toFixed(3)}s`,
    "--open-glow-opacity": glowOpacity.toFixed(3)
  };
}
