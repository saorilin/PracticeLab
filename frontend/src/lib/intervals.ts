export interface MusicalInterval {
  semitones: number;
  shortName: string;
  name: string;
}

export const intervals: MusicalInterval[] = [
  { semitones: 1, shortName: "m2", name: "Minor second" },
  { semitones: 2, shortName: "M2", name: "Major second" },
  { semitones: 3, shortName: "m3", name: "Minor third" },
  { semitones: 4, shortName: "M3", name: "Major third" },
  { semitones: 5, shortName: "P4", name: "Perfect fourth" },
  { semitones: 7, shortName: "P5", name: "Perfect fifth" },
  { semitones: 8, shortName: "m6", name: "Minor sixth" },
  { semitones: 9, shortName: "M6", name: "Major sixth" },
  { semitones: 10, shortName: "m7", name: "Minor seventh" },
  { semitones: 11, shortName: "M7", name: "Major seventh" },
  { semitones: 12, shortName: "P8", name: "Octave" },
];

export interface IntervalQuestion {
  rootMidi: number;
  direction: 1 | -1;
  interval: MusicalInterval;
}

export function createIntervalQuestion(
  enabledSemitones: number[],
  random: () => number = Math.random,
): IntervalQuestion {
  const available = intervals.filter((interval) => enabledSemitones.includes(interval.semitones));
  const pool = available.length > 0 ? available : intervals.slice(0, 5);
  const interval = pool[Math.floor(random() * pool.length)] ?? pool[0];
  if (!interval) throw new Error("No intervals are available");
  const direction: 1 | -1 = random() >= 0.5 ? 1 : -1;
  const lowerBound = 55 + (direction === -1 ? interval.semitones : 0);
  const upperBound = 72 - (direction === 1 ? interval.semitones : 0);
  const rootMidi = Math.floor(lowerBound + random() * (upperBound - lowerBound + 1));
  return { rootMidi, direction, interval };
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
