export const MIN_BPM = 30;
export const MAX_BPM = 240;

export type Subdivision = 1 | 2 | 3 | 4 | 5 | 6;

export interface BeatPattern {
  subdivision: Subdivision;
  enabled: boolean[];
}

export interface BeatPosition {
  beatIndex: number;
  subdivisionIndex: number;
}

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function intervalMilliseconds(bpm: number, subdivision: Subdivision): number {
  return 60_000 / clampBpm(bpm) / subdivision;
}

export function createBeatPattern(subdivision: Subdivision = 1): BeatPattern {
  return {
    subdivision,
    enabled: Array.from({ length: subdivision }, () => true),
  };
}

export function createBarPattern(beatsPerBar: number): BeatPattern[] {
  return Array.from({ length: beatsPerBar }, () => createBeatPattern());
}

export function changeSubdivision(pattern: BeatPattern, subdivision: Subdivision): BeatPattern {
  if (pattern.subdivision === subdivision) return pattern;
  return createBeatPattern(subdivision);
}

export function resizeBarPattern(patterns: BeatPattern[], beatsPerBar: number): BeatPattern[] {
  return Array.from({ length: beatsPerBar }, (_, index) => patterns[index] ?? createBeatPattern());
}

export function advancePosition(patterns: BeatPattern[], position: BeatPosition): BeatPosition {
  const pattern = patterns[position.beatIndex] ?? createBeatPattern();
  const nextSubdivision = position.subdivisionIndex + 1;

  if (nextSubdivision < pattern.subdivision) {
    return { ...position, subdivisionIndex: nextSubdivision };
  }

  return {
    beatIndex: (position.beatIndex + 1) % Math.max(patterns.length, 1),
    subdivisionIndex: 0,
  };
}

export function bpmFromTapIntervals(intervals: number[]): number | null {
  const usefulIntervals = intervals.filter((value) => value >= 150 && value <= 2000).slice(-5);
  if (usefulIntervals.length === 0) return null;
  const average = usefulIntervals.reduce((sum, value) => sum + value, 0) / usefulIntervals.length;
  return clampBpm(60_000 / average);
}
