export const MIN_BPM = 30;
export const MAX_BPM = 240;

export type Subdivision = 1 | 2 | 3 | 4;

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function intervalMilliseconds(bpm: number, subdivision: Subdivision): number {
  return 60_000 / clampBpm(bpm) / subdivision;
}

export function bpmFromTapIntervals(intervals: number[]): number | null {
  const usefulIntervals = intervals.filter((value) => value >= 150 && value <= 2000).slice(-5);
  if (usefulIntervals.length === 0) return null;
  const average = usefulIntervals.reduce((sum, value) => sum + value, 0) / usefulIntervals.length;
  return clampBpm(60_000 / average);
}
