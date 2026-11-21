export const categories = [
  "rhythm",
  "left-hand",
  "right-hand",
  "synchronization",
  "control",
] as const;

export const difficulties = ["beginner", "intermediate", "advanced"] as const;

export type ExerciseCategory = (typeof categories)[number];
export type Difficulty = (typeof difficulties)[number];

export interface ExercisePayload {
  name: string;
  primary_category: ExerciseCategory;
  difficulty: Difficulty;
  tags: string[];
  summary: string;
  technique_notes: string[];
  common_mistakes: string[];
  target_bpm: number | null;
  target_duration_seconds: number | null;
  target_repetitions: number | null;
  source: string | null;
  external_video_url: string | null;
  image_url: string | null;
  tab_url: string | null;
}

export interface Exercise extends ExercisePayload {
  id: string;
  slug: string;
  goal: string;
  steps: string[];
  current_bpm: number | null;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseListResponse {
  items: Exercise[];
  total: number;
}
