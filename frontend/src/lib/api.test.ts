import { afterEach, describe, expect, it, vi } from "vitest";
import { createExercise, deleteExercise, getExercise, getExercises, updateExercise } from "./api";
import type { Exercise, ExercisePayload } from "../types/exercise";

const payload: ExercisePayload = {
  name: "Muted transitions",
  primary_category: "control",
  difficulty: "beginner",
  tags: ["muting"],
  summary: "Change positions without string noise.",
  goal: "Keep unused strings silent.",
  steps: ["Play slowly."],
  technique_notes: [],
  common_mistakes: [],
  min_bpm: 50,
  max_bpm: 90,
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
