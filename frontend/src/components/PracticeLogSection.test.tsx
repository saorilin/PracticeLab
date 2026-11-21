import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPracticeSession, getPracticeSessions } from "../lib/api";
import type { PracticeSession } from "../types/practiceSession";
import { PracticeLogSection } from "./PracticeLogSection";

vi.mock("../lib/api");

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session-1",
    exercise_id: "exercise-1",
    duration_minutes: 15,
    bpm: 90,
    notes: "Clean at 90.",
    practiced_at: "2026-11-20T08:30:00+00:00",
    ...overrides,
  };
}

function localTime(iso: string): string {
  // Same formatting the component uses: the UTC instant shown in the test runner's zone.
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function renderSection(sessions: PracticeSession[], currentBpm: number | null = null) {
  vi.mocked(getPracticeSessions).mockResolvedValue({ items: sessions, total: sessions.length });
  render(<PracticeLogSection exerciseId="exercise-1" currentBpm={currentBpm} />);
  await screen.findByRole("heading", { name: "Record what you played" });
  if (sessions.length > 0) await screen.findByRole("list", { name: "Logged sessions" });
  else await screen.findByText("No sessions logged yet.");
}

function rows(): HTMLElement[] {
  return within(screen.getByRole("list", { name: "Logged sessions" })).getAllByRole("listitem");
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("PracticeLogSection", () => {
  it("lists logged sessions with local time, minutes, BPM and notes", async () => {
    const older = makeSession({
      id: "s-old",
      duration_minutes: 10,
      bpm: null,
      notes: null,
      practiced_at: "2026-11-19T18:05:00+00:00",
    });
    await renderSection([makeSession(), older]);

    expect(getPracticeSessions).toHaveBeenCalledWith("exercise-1");
    const [first, second] = rows();
    expect(first).toHaveTextContent(localTime("2026-11-20T08:30:00+00:00"));
    expect(first).toHaveTextContent("15 min");
    expect(first).toHaveTextContent("90 BPM");
    expect(first).toHaveTextContent("Clean at 90.");
    expect(within(first as HTMLElement).getByText(/./, { selector: "time" })).toHaveAttribute(
      "datetime",
      "2026-11-20T08:30:00+00:00",
    );
    expect(second).toHaveTextContent("10 min");
    expect(second).not.toHaveTextContent("BPM");
    expect(screen.queryByText("No sessions logged yet.")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing is logged", async () => {
    await renderSection([]);

    expect(screen.getByText("No sessions logged yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Logged sessions" })).not.toBeInTheDocument();
  });

  it("uses the current BPM as the BPM placeholder", async () => {
    await renderSection([], 85);

    expect(screen.getByLabelText("BPM")).toHaveAttribute("placeholder", "85");
  });

  it("shows an error when loading fails", async () => {
    vi.mocked(getPracticeSessions).mockRejectedValue(new Error("Request failed with status 502"));
    render(<PracticeLogSection exerciseId="exercise-1" currentBpm={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Request failed with status 502");
  });

  it("logs a session, puts it on top and clears the form", async () => {
    const user = userEvent.setup();
    const created = makeSession({
      id: "s-new",
      duration_minutes: 25,
      bpm: 100,
      notes: "Faster today.",
      practiced_at: "2026-11-21T07:00:00+00:00",
    });
    vi.mocked(createPracticeSession).mockResolvedValue(created);
    await renderSection([makeSession()]);

    await user.type(screen.getByLabelText("Minutes"), "25");
    await user.type(screen.getByLabelText("BPM"), "100");
    await user.type(screen.getByLabelText("Notes"), "  Faster today.  ");
    await user.click(screen.getByRole("button", { name: "Log session" }));

    expect(createPracticeSession).toHaveBeenCalledWith("exercise-1", {
      duration_minutes: 25,
      bpm: 100,
      notes: "Faster today.",
    });
    await screen.findByText("Faster today.");
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent("25 min");
    expect(rows()[1]).toHaveTextContent("15 min");
    expect(screen.getByLabelText("Minutes")).toHaveValue(null);
    expect(screen.getByLabelText("BPM")).toHaveValue(null);
    expect(screen.getByLabelText("Notes")).toHaveValue("");
    expect(getPracticeSessions).toHaveBeenCalledTimes(1);
  });

  it("sends null for an empty BPM and empty notes", async () => {
    const user = userEvent.setup();
    vi.mocked(createPracticeSession).mockResolvedValue(
      makeSession({ id: "s-min", bpm: null, notes: null }),
    );
    await renderSection([]);

    await user.type(screen.getByLabelText("Minutes"), "5");
    await user.click(screen.getByRole("button", { name: "Log session" }));

    expect(createPracticeSession).toHaveBeenCalledWith("exercise-1", {
      duration_minutes: 5,
      bpm: null,
      notes: null,
    });
    expect(await screen.findByRole("list", { name: "Logged sessions" })).toBeInTheDocument();
  });

  it("keeps the input and shows the error when logging fails", async () => {
    const user = userEvent.setup();
    vi.mocked(createPracticeSession).mockRejectedValue(
      new Error("Input should be less than or equal to 600"),
    );
    await renderSection([]);

    await user.type(screen.getByLabelText("Minutes"), "30");
    await user.type(screen.getByLabelText("BPM"), "95");
    await user.type(screen.getByLabelText("Notes"), "Keep me");
    await user.click(screen.getByRole("button", { name: "Log session" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Input should be less than or equal to 600",
    );
    expect(screen.getByLabelText("Minutes")).toHaveValue(30);
    expect(screen.getByLabelText("BPM")).toHaveValue(95);
    expect(screen.getByLabelText("Notes")).toHaveValue("Keep me");
    expect(screen.getByRole("button", { name: "Log session" })).toBeEnabled();
    expect(screen.getByText("No sessions logged yet.")).toBeInTheDocument();
  });

  it("disables the button while the session is being logged", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: PracticeSession) => void = () => undefined;
    vi.mocked(createPracticeSession).mockReturnValue(
      new Promise<PracticeSession>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    await renderSection([]);

    await user.type(screen.getByLabelText("Minutes"), "12");
    await user.click(screen.getByRole("button", { name: "Log session" }));

    const button = screen.getByRole("button", { name: "Logging…" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(createPracticeSession).toHaveBeenCalledTimes(1);

    resolveCreate(makeSession({ id: "s-12", duration_minutes: 12 }));
    expect(await screen.findByRole("button", { name: "Log session" })).toBeEnabled();
  });
});
