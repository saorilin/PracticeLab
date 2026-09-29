import { describe, expect, it } from "vitest";
import { createIntervalQuestion, midiToFrequency } from "./intervals";

describe("interval trainer", () => {
  it("creates a question from the enabled interval set", () => {
    const question = createIntervalQuestion([7], () => 0.75);
    expect(question.interval.semitones).toBe(7);
    expect(question.direction).toBe(1);
  });

  it("falls back to a basic interval set and can descend", () => {
    const question = createIntervalQuestion([], () => 0.1);
    expect(question.interval.semitones).toBe(1);
    expect(question.direction).toBe(-1);
    expect(question.rootMidi).toBeGreaterThanOrEqual(56);
  });

  it("converts concert A to 440 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
  });
});
