import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExercise, getExercise, updateExercise } from "../lib/api";
import type { Exercise } from "../types/exercise";
import { ExerciseFormPage } from "./ExerciseFormPage";

vi.mock("../lib/api");

const preset: Exercise = {
  id: "preset-1",
  slug: "subdivision-ladder",
  name: "Subdivision Ladder",
  primary_category: "rhythm",
  difficulty: "beginner",
  tags: ["timing"],
  summary: "Move between subdivisions.",
  goal: "Keep the pulse stable.",
  steps: ["Set the metronome."],
  technique_notes: ["Count aloud."],
  common_mistakes: ["Rushing triplets"],
  target_bpm: 100,
  current_bpm: 80,
  target_duration_seconds: 300,
  target_repetitions: null,
  source: "PracticeLab preset",
  external_video_url: null,
  image_url: null,
  tab_url: null,
  is_custom: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exercises/new" element={<ExerciseFormPage />} />
        <Route path="/exercises/:exerciseId/edit" element={<ExerciseFormPage />} />
        <Route path="/exercises/:exerciseId" element={<p>Detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("ExerciseFormPage", () => {
  it("only offers the agreed instruction and target fields", () => {
    renderAt("/exercises/new");

    expect(screen.queryByLabelText(/training goal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^steps/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/minimum bpm/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/maximum bpm/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^technique notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^common mistakes/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Target BPM")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration in minutes")).toBeInTheDocument();
    expect(screen.getByLabelText("Repetitions")).toBeInTheDocument();
  });

  it("submits target_bpm without goal, steps or the old BPM range", async () => {
    const user = userEvent.setup();
    vi.mocked(createExercise).mockResolvedValue({ ...preset, id: "new-1", is_custom: true });
    renderAt("/exercises/new");

    await user.type(screen.getByLabelText("Name"), "Legato runs");
    await user.type(screen.getByLabelText("Short summary"), "Even hammer-ons and pull-offs.");
    await user.type(screen.getByLabelText("Target BPM"), "120");
    await user.click(screen.getByRole("button", { name: "Create exercise" }));

    expect(await screen.findByText("Detail page")).toBeInTheDocument();
    expect(createExercise).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(createExercise).mock.calls[0]?.[0];
    expect(payload).toMatchObject({ name: "Legato runs", target_bpm: 120 });
    expect(payload).not.toHaveProperty("goal");
    expect(payload).not.toHaveProperty("steps");
    expect(payload).not.toHaveProperty("min_bpm");
    expect(payload).not.toHaveProperty("max_bpm");
  });

  it("loads a preset exercise into the edit form and saves it", async () => {
    const user = userEvent.setup();
    vi.mocked(getExercise).mockResolvedValue(preset);
    vi.mocked(updateExercise).mockResolvedValue(preset);
    renderAt("/exercises/preset-1/edit");

    expect(await screen.findByLabelText("Name")).toHaveValue("Subdivision Ladder");
    expect(screen.getByLabelText("Target BPM")).toHaveValue(100);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Detail page")).toBeInTheDocument();
    expect(updateExercise).toHaveBeenCalledWith(
      "preset-1",
      expect.objectContaining({ name: "Subdivision Ladder", target_bpm: 100 }),
    );
  });
});
