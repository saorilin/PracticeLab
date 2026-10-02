import { describe, expect, it } from "vitest";
import {
  advancePosition,
  bpmFromTapIntervals,
  changeSubdivision,
  clampBpm,
  createBarPattern,
  createBeatPattern,
  intervalMilliseconds,
  resizeBarPattern,
} from "./metronome";

describe("metronome calculations", () => {
  it("clamps BPM to the supported range", () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(280)).toBe(240);
    expect(clampBpm(99.7)).toBe(100);
    expect(clampBpm(Number.NaN)).toBe(80);
  });

  it("calculates subdivision timing", () => {
    expect(intervalMilliseconds(120, 1)).toBe(500);
    expect(intervalMilliseconds(120, 4)).toBe(125);
    expect(intervalMilliseconds(60, 3)).toBeCloseTo(333.33, 1);
  });

  it("calculates BPM from recent valid taps", () => {
    expect(bpmFromTapIntervals([500, 500, 500])).toBe(120);
    expect(bpmFromTapIntervals([50, 3000])).toBeNull();
  });

  it("creates independent beat patterns", () => {
    const patterns = createBarPattern(2);

    patterns[0]?.enabled.splice(0, 1, false);

    expect(patterns[0]?.enabled).toEqual([false]);
    expect(patterns[1]?.enabled).toEqual([true]);
  });

  it("resets pulse switches when a beat subdivision changes", () => {
    const original = createBeatPattern(4);
    original.enabled[1] = false;

    expect(changeSubdivision(original, 4)).toBe(original);
    expect(changeSubdivision(original, 3)).toEqual({
      subdivision: 3,
      enabled: [true, true, true],
    });
  });

  it("preserves existing beats when the bar is resized", () => {
    const original = [createBeatPattern(4), createBeatPattern(3)];

    expect(resizeBarPattern(original, 3)).toEqual([original[0], original[1], createBeatPattern(1)]);
    expect(resizeBarPattern(original, 1)).toEqual([original[0]]);
  });

  it("advances through mixed subdivisions and then wraps the bar", () => {
    const patterns = [createBeatPattern(4), createBeatPattern(3)];

    expect(advancePosition(patterns, { beatIndex: 0, subdivisionIndex: 0 })).toEqual({
      beatIndex: 0,
      subdivisionIndex: 1,
    });
    expect(advancePosition(patterns, { beatIndex: 0, subdivisionIndex: 3 })).toEqual({
      beatIndex: 1,
      subdivisionIndex: 0,
    });
    expect(advancePosition(patterns, { beatIndex: 1, subdivisionIndex: 2 })).toEqual({
      beatIndex: 0,
      subdivisionIndex: 0,
    });
    expect(advancePosition([], { beatIndex: 0, subdivisionIndex: 0 })).toEqual({
      beatIndex: 0,
      subdivisionIndex: 0,
    });
  });
});
