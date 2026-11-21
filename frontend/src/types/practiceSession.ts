export interface PracticeSessionPayload {
  duration_minutes: number;
  bpm: number | null;
  notes: string | null;
}

export interface PracticeSession extends PracticeSessionPayload {
  id: string;
  exercise_id: string;
  /** ISO 8601 timestamp in UTC, set by the server. */
  practiced_at: string;
}

export interface PracticeSessionListResponse {
  items: PracticeSession[];
  total: number;
}
