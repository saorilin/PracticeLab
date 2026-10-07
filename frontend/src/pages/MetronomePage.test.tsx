import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetronomePage } from "./MetronomePage";

class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new MockAudioParam();
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

const contexts: MockAudioContext[] = [];
let resumeBehavior: () => Promise<void>;

class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = "suspended";
  destination = {};
  gains: MockGainNode[] = [];
  oscillators: MockOscillatorNode[] = [];

  constructor() {
    contexts.push(this);
  }

  createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.gains.push(gain);
    return gain;
  });

  createOscillator = vi.fn(() => {
    const oscillator = new MockOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  });

  resume = vi.fn(async () => {
    await resumeBehavior();
    this.state = "running";
  });

  close = vi.fn(async () => {
    this.state = "closed";
  });
}

async function startPlayback() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
  });
}

describe("metronome playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    contexts.length = 0;
    resumeBehavior = async () => {};
    vi.stubGlobal("AudioContext", MockAudioContext);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("stops sounds already scheduled ahead when playback stops", async () => {
    render(<MetronomePage />);
    await startPlayback();

    const context = contexts[0];
    expect(context?.oscillators).toHaveLength(1);
    expect(context?.oscillators[0]?.start).toHaveBeenCalledWith(0.05);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(context?.oscillators[0]?.stop).toHaveBeenLastCalledWith(0);
    expect(context?.gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();

    await startPlayback();
    expect(context?.oscillators).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(context?.oscillators[1]?.stop).toHaveBeenLastCalledWith(0);
  });

  it("drops missed pulses after a long timer delay", async () => {
    render(<MetronomePage />);
    await startPlayback();

    const context = contexts[0];
    if (!context) throw new Error("Audio context was not created");
    context.currentTime = 60;

    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators[1]?.start).toHaveBeenCalledWith(60.05);
  });

  it("does not start after Reset cancels a pending audio resume", async () => {
    let finishResume: (() => void) | undefined;
    resumeBehavior = () =>
      new Promise<void>((resolve) => {
        finishResume = resolve;
      });

    render(<MetronomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "Starting…" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await act(async () => {
      finishResume?.();
    });

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(contexts[0]?.oscillators).toHaveLength(0);
  });

  it("explains audio startup failure and allows a retry", async () => {
    resumeBehavior = async () => {
      throw new Error("Audio unavailable");
    };

    render(<MetronomePage />);
    await startPlayback();
    expect(screen.getByRole("alert")).toHaveTextContent("Audio could not start");

    resumeBehavior = async () => {};
    await startPlayback();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });
});
