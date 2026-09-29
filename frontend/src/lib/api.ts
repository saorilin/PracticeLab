import type { Exercise, ExerciseListResponse, ExercisePayload } from "../types/exercise";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function readErrorDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) return null;
  const messages = detail
    .map((item) => {
      if (typeof item === "object" && item !== null && "msg" in item) {
        return String(item.msg);
      }
      return null;
    })
    .filter((message): message is string => message !== null);
  return messages.length > 0 ? messages.join("; ") : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      message = readErrorDetail(body.detail) ?? message;
    } catch {
      // The fallback message remains useful for an empty or non-JSON response.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface ExerciseFilters {
  query?: string;
  category?: string;
  difficulty?: string;
}

export function getExercises(filters: ExerciseFilters): Promise<ExerciseListResponse> {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  const suffix = params.size > 0 ? `?${params}` : "";
  return request<ExerciseListResponse>(`/exercises${suffix}`);
}

export function getExercise(id: string): Promise<Exercise> {
  return request<Exercise>(`/exercises/${id}`);
}

export function createExercise(payload: ExercisePayload): Promise<Exercise> {
  return request<Exercise>("/exercises", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExercise(id: string, payload: ExercisePayload): Promise<Exercise> {
  return request<Exercise>(`/exercises/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExercise(id: string): Promise<void> {
  return request<void>(`/exercises/${id}`, { method: "DELETE" });
}
