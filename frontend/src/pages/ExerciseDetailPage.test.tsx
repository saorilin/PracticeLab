import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteExercise,
  getExercise,
  getPracticeSessions,
  updateExerciseProgress,
} from "../lib/api";
import type { Exercise } from "../types/exercise";
import { ExerciseDetailPage } from "./ExerciseDetailPage";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ApiError: actual.ApiError,
    deleteExercise: vi.fn(),
    getExercise: vi.fn(),
    updateExerciseProgress: vi.fn(),
    // Used by PracticeLogSection, which the detail page renders (F1).
    getPracticeSessions: vi.fn(),
    createPracticeSession: vi.fn(),
  };
});

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "preset-1",
    slug: "subdivision-ladder",
    name: "Subdivision Ladder",
    primary_category: "rhythm",
    difficulty: "beginner",
    tags: ["timing"],
    summary: "Move between subdivisions.",
    goal: "Keep the pulse stable.",
    steps: ["Set the metronome."],
    technique_notes: [],
    common_mistakes: [],
    target_bpm: null,
    current_bpm: null,
    target_duration_seconds: null,
    target_repetitions: null,
    source: null,
    external_video_url: null,
    image_url: null,
    tab_url: null,
    is_custom: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderDetail(exercise: Exercise) {
  vi.mocked(getExercise).mockResolvedValue(exercise);
  // Reset by vi.resetAllMocks() after each test, so set the default here.
  vi.mocked(getPracticeSessions).mockResolvedValue({ items: [], total: 0 });
  render(
    <MemoryRouter initialEntries={[`/exercises/${exercise.id}`]}>
      <Routes>
        <Route path="/exercises/:exerciseId" element={<ExerciseDetailPage />} />
        <Route path="/exercises" element={<p>Exercise list</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { level: 1, name: exercise.name });
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("ExerciseDetailPage", () => {
  it("shows Edit and Delete for a preset exercise", async () => {
    await renderDetail(makeExercise({ is_custom: false }));

    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/exercises/preset-1/edit",
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("warns that a deleted preset is not restored and deletes it after confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteExercise).mockResolvedValue(undefined);
    await renderDetail(makeExercise({ is_custom: false }));

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("not be restored automatically"));
    expect(deleteExercise).toHaveBeenCalledWith("preset-1");
    expect(await screen.findByText("Exercise list")).toBeInTheDocument();
  });

  it("hides the goal and steps sections when they are empty", async () => {
    await renderDetail(makeExercise({ goal: "", steps: [] }));

    expect(screen.queryByText("Training goal")).not.toBeInTheDocument();
    expect(screen.queryByText("Steps")).not.toBeInTheDocument();
  });

  it("shows the goal and steps sections when they have content", async () => {
    await renderDetail(makeExercise());

    expect(screen.getByText("Keep the pulse stable.")).toBeInTheDocument();
    expect(screen.getByText("Set the metronome.")).toBeInTheDocument();
  });

  it("shows Not set when there is no target or current BPM", async () => {
    await renderDetail(makeExercise());

    expect(screen.getByText("Target BPM").nextElementSibling).toHaveTextContent("Not set");
    expect(screen.getByTestId("current-bpm")).toHaveTextContent("Not set");
  });

  it("compares current and target BPM when both are set", async () => {
    await renderDetail(makeExercise({ current_bpm: 85, target_bpm: 120 }));

    expect(screen.getByTestId("current-bpm")).toHaveTextContent("85 / 120 BPM");
  });

  it("saves a new current BPM with Enter and shows the returned value", async () => {
    const user = userEvent.setup();
    const exercise = makeExercise({ current_bpm: 80, target_bpm: 120 });
    vi.mocked(updateExerciseProgress).mockResolvedValue({ ...exercise, current_bpm: 92 });
    await renderDetail(exercise);

    await user.click(screen.getByRole("button", { name: "Change current BPM" }));
    const input = screen.getByLabelText(/new current bpm/i);
    expect(input).toHaveValue(80);
    expect(input).toHaveAttribute("min", "20");
    expect(input).toHaveAttribute("max", "400");
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "92{Enter}");

    expect(updateExerciseProgress).toHaveBeenCalledWith("preset-1", 92);
    expect(await screen.findByTestId("current-bpm")).toHaveTextContent("92 / 120 BPM");
    expect(screen.queryByLabelText(/new current bpm/i)).not.toBeInTheDocument();
  });

  it("clears the current BPM when the input is left empty", async () => {
    const user = userEvent.setup();
    const exercise = makeExercise({ current_bpm: 80 });
    vi.mocked(updateExerciseProgress).mockResolvedValue({ ...exercise, current_bpm: null });
    await renderDetail(exercise);

    await user.click(screen.getByRole("button", { name: "Change current BPM" }));
    await user.clear(screen.getByLabelText(/new current bpm/i));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateExerciseProgress).toHaveBeenCalledWith("preset-1", null);
    expect(await screen.findByTestId("current-bpm")).toHaveTextContent("Not set");
  });

  it("disables the buttons while saving", async () => {
    const user = userEvent.setup();
    let resolveSave: (value: Exercise) => void = () => undefined;
    vi.mocked(updateExerciseProgress).mockReturnValue(
      new Promise<Exercise>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const exercise = makeExercise();
    await renderDetail(exercise);

    await user.click(screen.getByRole("button", { name: "Change current BPM" }));
    await user.type(screen.getByLabelText(/new current bpm/i), "90");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    resolveSave({ ...exercise, current_bpm: 90 });
    expect(await screen.findByTestId("current-bpm")).toHaveTextContent("90 BPM");
  });

  it("keeps the input and shows the error when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(updateExerciseProgress).mockRejectedValue(
      new ApiError("Request failed with status 500", 500),
    );
    await renderDetail(makeExercise({ current_bpm: 80 }));

    await user.click(screen.getByRole("button", { name: "Change current BPM" }));
    const input = screen.getByLabelText(/new current bpm/i);
    await user.clear(input);
    await user.type(input, "95{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Request failed with status 500");
    expect(screen.getByLabelText(/new current bpm/i)).toHaveValue(95);
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("cancels the quick edit with Escape without saving", async () => {
    const user = userEvent.setup();
    await renderDetail(makeExercise({ current_bpm: 80 }));

    await user.click(screen.getByRole("button", { name: "Change current BPM" }));
    await user.type(screen.getByLabelText(/new current bpm/i), "5{Escape}");

    expect(screen.queryByLabelText(/new current bpm/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("current-bpm")).toHaveTextContent("80 BPM");
    expect(updateExerciseProgress).not.toHaveBeenCalled();
  });

  it("renders the practice log for this exercise", async () => {
    await renderDetail(makeExercise({ current_bpm: 85 }));

    expect(screen.getByRole("heading", { name: "Record what you played" })).toBeInTheDocument();
    expect(getPracticeSessions).toHaveBeenCalledWith("preset-1");
    expect(await screen.findByText("No sessions logged yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("BPM")).toHaveAttribute("placeholder", "85");
  });
});
