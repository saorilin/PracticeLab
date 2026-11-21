import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createExercise,
  createPracticeSession,
  deleteExercise,
  getExercise,
  getExercises,
  getPracticeSessions,
  updateExercise,
  updateExerciseProgress,
} from "./api";
import type { Exercise, ExercisePayload } from "../types/exercise";
import type { PracticeSession } from "../types/practiceSession";

const payload: ExercisePayload = {
  name: "Muted transitions",
  primary_category: "control",
  difficulty: "beginner",
  tags: ["muting"],
  summary: "Change positions without string noise.",
  technique_notes: [],
  common_mistakes: [],
  target_bpm: 90,
  target_duration_seconds: 180,
  target_repetitions: null,
  source: null,
  external_video_url: null,
  image_url: null,
  tab_url: null,
};

const exercise: Exercise = {
  ...payload,
  id: "exercise-1",
  slug: "muted-transitions",
  goal: "Keep unused strings silent.",
  steps: ["Play slowly."],
  current_bpm: null,
  is_custom: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("exercise API client", () => {
  it("builds list filters and reads an exercise", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [exercise], total: 1 }))
      .mockResolvedValueOnce(jsonResponse(exercise));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getExercises({ query: "muting", category: "control", difficulty: "beginner" }),
    ).resolves.toEqual({ items: [exercise], total: 1 });
    await expect(getExercise("exercise-1")).resolves.toEqual(exercise);

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/exercises?query=muting&category=control&difficulty=beginner",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/exercises/exercise-1");
  });

  it("sends create and update payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(exercise, 201))
      .mockResolvedValueOnce(jsonResponse({ ...exercise, name: "Updated" }));
    vi.stubGlobal("fetch", fetchMock);

    await createExercise(payload);
    await updateExercise("exercise-1", { ...payload, name: "Updated" });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
  });

  it("sends the current BPM to the progress endpoint and returns the exercise", async () => {
    const updated = { ...exercise, current_bpm: 85 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(updated))
      .mockResolvedValueOnce(jsonResponse(exercise));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateExerciseProgress("exercise-1", 85)).resolves.toEqual(updated);
    await updateExerciseProgress("exercise-1", null);

    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/exercises\/exercise-1\/progress$/);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ current_bpm: 85 }),
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ current_bpm: null }),
    });
  });

  it("handles a successful empty delete response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteExercise("exercise-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/exercises/exercise-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uses the API detail for JSON failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Not editable" }, 403)),
    );

    await expect(deleteExercise("preset-1")).rejects.toEqual(
      expect.objectContaining({ message: "Not editable", status: 403 }),
    );
  });

  it("uses a status fallback for non-JSON failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 })));

    await expect(getExercises({})).rejects.toThrow("Request failed with status 502");
  });

  it("combines validation messages returned by FastAPI", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ detail: [{ msg: "Name is required" }, { msg: "Invalid BPM" }] }, 422),
        ),
    );

    await expect(createExercise(payload)).rejects.toThrow("Name is required; Invalid BPM");
  });
});

describe("practice session API client", () => {
  const practiceSession: PracticeSession = {
    id: "session-1",
    exercise_id: "exercise-1",
    duration_minutes: 15,
    bpm: 90,
    notes: "Clean at 90.",
    practiced_at: "2026-11-21T08:30:00+00:00",
  };

  it("reads the practice sessions of one exercise", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [practiceSession], total: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPracticeSessions("exercise-1")).resolves.toEqual({
      items: [practiceSession],
      total: 1,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/exercises\/exercise-1\/sessions$/);
    expect(fetchMock.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
  });

  it("posts a new practice session and returns the created record", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(practiceSession, 201));
    vi.stubGlobal("fetch", fetchMock);
    const body = { duration_minutes: 15, bpm: 90, notes: "Clean at 90." };

    await expect(createPracticeSession("exercise-1", body)).resolves.toEqual(practiceSession);

    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/v1\/exercises\/exercise-1\/sessions$/);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify(body),
    });
  });

  it("surfaces a 404 for a missing exercise", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Exercise not found" }, 404)),
    );

    await expect(getPracticeSessions("missing")).rejects.toEqual(
      expect.objectContaining({ message: "Exercise not found", status: 404 }),
    );
  });
});
