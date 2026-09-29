import type { ExerciseCategory } from "../types/exercise";

export const categoryLabels: Record<ExerciseCategory, string> = {
  rhythm: "Rhythm",
  "left-hand": "Left hand",
  "right-hand": "Right hand",
  synchronization: "Synchronization",
  control: "Control & muting",
};

export const categoryDescriptions: Record<ExerciseCategory, string> = {
  rhythm: "Subdivision, accents, syncopation, and pulse stability.",
  "left-hand": "Independence, legato, stretching, and position shifts.",
  "right-hand": "Picking mechanics, string crossing, and articulation.",
  synchronization: "Precise coordination between fretting and picking hands.",
  control: "Muting, dynamics, relaxation, tone, and note duration.",
};
