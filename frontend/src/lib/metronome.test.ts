import { describe, expect, it } from "vitest";
import { bpmFromTapIntervals, clampBpm, intervalMilliseconds } from "./metronome";

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
  });

  it("calculates BPM from recent valid taps", () => {
    expect(bpmFromTapIntervals([500, 500, 500])).toBe(120);
    expect(bpmFromTapIntervals([50, 3000])).toBeNull();
  });
});
