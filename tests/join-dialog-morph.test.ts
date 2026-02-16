import { describe, expect, it } from "vitest";
import { computeMorphTransform } from "../src/lib/join-dialog-morph";

describe("join dialog morph helper", () => {
  it("computes valid translate/scale for normal source and target", () => {
    const result = computeMorphTransform(
      { left: 120, top: 400, width: 180, height: 44 },
      { left: 80, top: 160, width: 640, height: 520 }
    );

    expect(result.valid).toBe(true);
    expect(result.translateX).toBeLessThan(0);
    expect(result.translateY).toBeGreaterThan(0);
    expect(result.scaleX).toBeGreaterThan(0);
    expect(result.scaleX).toBeLessThan(1);
    expect(result.scaleY).toBeGreaterThan(0);
    expect(result.scaleY).toBeLessThan(1);
  });

  it("clamps tiny source sizes safely", () => {
    const result = computeMorphTransform(
      { left: 100, top: 100, width: 1, height: 1 },
      { left: 50, top: 50, width: 400, height: 300 }
    );

    expect(result.valid).toBe(true);
    expect(result.scaleX).toBeGreaterThanOrEqual(0.08);
    expect(result.scaleY).toBeGreaterThanOrEqual(0.08);
  });

  it("returns neutral transform for invalid or zero rectangles", () => {
    expect(computeMorphTransform(null, { left: 0, top: 0, width: 100, height: 100 })).toEqual({
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      valid: false
    });

    expect(
      computeMorphTransform(
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 0, top: 0, width: 0, height: 100 }
      )
    ).toEqual({
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      valid: false
    });
  });
});
