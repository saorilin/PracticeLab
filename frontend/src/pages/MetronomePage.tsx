import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import {
  MAX_BPM,
  MIN_BPM,
  type BeatPattern,
  type BeatPosition,
  type Subdivision,
  advancePosition,
  bpmFromTapIntervals,
  changeSubdivision,
  clampBpm,
  createBarPattern,
  intervalMilliseconds,
  resizeBarPattern,
} from "../lib/metronome";

const LOOKAHEAD_MILLISECONDS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const RESTART_LEAD_SECONDS = 0.05;
const subdivisionOptions: Subdivision[] = [1, 2, 3, 4, 5, 6];

const subdivisionLabels: Record<Subdivision, string> = {
  1: "Quarter",
  2: "Eighth",
  3: "Triplet",
  4: "Sixteenth",
  5: "Quintuplet",
  6: "Sextuplet",
};

type SoundPreset = "classic" | "wood" | "digital";
type ClickKind = "accent" | "beat" | "subdivision";

interface SoundProfile {
  wave: OscillatorType;
  frequencies: Record<ClickKind, number>;
  levels: Record<ClickKind, number>;
  duration: number;
}

const soundProfiles: Record<SoundPreset, SoundProfile> = {
  classic: {
    wave: "sine",
    frequencies: { accent: 1320, beat: 920, subdivision: 680 },
    levels: { accent: 1, beat: 0.82, subdivision: 0.58 },
    duration: 0.05,
  },
  wood: {
    wave: "triangle",
    frequencies: { accent: 1050, beat: 760, subdivision: 560 },
    levels: { accent: 1, beat: 0.82, subdivision: 0.62 },
    duration: 0.065,
  },
  digital: {
    wave: "square",
    frequencies: { accent: 1660, beat: 1220, subdivision: 880 },
    levels: { accent: 0.78, beat: 0.62, subdivision: 0.42 },
    duration: 0.035,
  },
};

const beatIds = ["beat-1", "beat-2", "beat-3", "beat-4", "beat-5", "beat-6", "beat-7"];
const pulseIds = ["pulse-1", "pulse-2", "pulse-3", "pulse-4", "pulse-5", "pulse-6"];

export function MetronomePage() {
  const [bpm, setBpm] = useState(80);
  const [beatPatterns, setBeatPatterns] = useState<BeatPattern[]>(() => createBarPattern(4));
  const [volume, setVolume] = useState(0.65);
  const [soundPreset, setSoundPreset] = useState<SoundPreset>("classic");
  const [accentBarStart, setAccentBarStart] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<BeatPosition>({
    beatIndex: 0,
    subdivisionIndex: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const scheduledOscillatorsRef = useRef<Set<OscillatorNode>>(new Set());
  const schedulerTimerRef = useRef<number | null>(null);
  const uiTimerRefs = useRef<number[]>([]);
  const startRequestRef = useRef(0);
  const startingRef = useRef(false);
  const playingRef = useRef(false);
  const mountedRef = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const positionRef = useRef<BeatPosition>({ beatIndex: 0, subdivisionIndex: 0 });
  const beatPatternsRef = useRef(beatPatterns);
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const soundPresetRef = useRef(soundPreset);
  const accentBarStartRef = useRef(accentBarStart);
  const tapTimesRef = useRef<number[]>([]);

  const clearUiTimers = useCallback(() => {
    for (const timerId of uiTimerRefs.current) window.clearTimeout(timerId);
    uiTimerRefs.current = [];
  }, []);

  const clearScheduler = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      window.clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    clearUiTimers();
  }, [clearUiTimers]);

  const silenceScheduledClicks = useCallback(() => {
    const context = audioContextRef.current;
    if (!context) return;

    outputGainRef.current?.gain.setValueAtTime(0, context.currentTime);
    for (const oscillator of scheduledOscillatorsRef.current) {
      oscillator.stop(context.currentTime);
    }
    scheduledOscillatorsRef.current.clear();
  }, []);

  const scheduleClick = useCallback((atTime: number, kind: ClickKind) => {
    const context = audioContextRef.current;
    const outputGain = outputGainRef.current;
    if (!context || !outputGain || volumeRef.current <= 0) return;

    const profile = soundProfiles[soundPresetRef.current];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const clickVolume = volumeRef.current * profile.levels[kind];

    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.frequencies[kind], atTime);
    gain.gain.setValueAtTime(Math.max(clickVolume, 0.0001), atTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + profile.duration);
    oscillator.connect(gain);
    gain.connect(outputGain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      scheduledOscillatorsRef.current.delete(oscillator);
    };
    scheduledOscillatorsRef.current.add(oscillator);
    oscillator.start(atTime);
    oscillator.stop(atTime + profile.duration);
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const context = audioContextRef.current;
    if (!context) return undefined;

    const scheduleUpcomingPulses = () => {
      if (nextNoteTimeRef.current < context.currentTime) {
        // A delayed browser timer must not replay missed pulses in a burst.
        nextNoteTimeRef.current = context.currentTime + RESTART_LEAD_SECONDS;
        clearUiTimers();
      }

      while (nextNoteTimeRef.current < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
        const patterns = beatPatternsRef.current;
        const position = positionRef.current;
        const pattern = patterns[position.beatIndex];
        if (!pattern) return;

        const isBeatStart = position.subdivisionIndex === 0;
        const isBarStart = position.beatIndex === 0 && isBeatStart;
        const kind: ClickKind =
          isBarStart && accentBarStartRef.current ? "accent" : isBeatStart ? "beat" : "subdivision";

        if (pattern.enabled[position.subdivisionIndex]) {
          scheduleClick(nextNoteTimeRef.current, kind);
        }

        const delay = Math.max(0, (nextNoteTimeRef.current - context.currentTime) * 1000);
        const displayedPosition = { ...position };
        const timerId = window.setTimeout(() => {
          setCurrentPosition(displayedPosition);
          uiTimerRefs.current = uiTimerRefs.current.filter((id) => id !== timerId);
        }, delay);
        uiTimerRefs.current.push(timerId);

        nextNoteTimeRef.current += intervalMilliseconds(bpmRef.current, pattern.subdivision) / 1000;
        positionRef.current = advancePosition(patterns, position);
      }
    };

    scheduleUpcomingPulses();
    schedulerTimerRef.current = window.setInterval(scheduleUpcomingPulses, LOOKAHEAD_MILLISECONDS);

    return clearScheduler;
  }, [clearScheduler, clearUiTimers, isPlaying, scheduleClick]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startRequestRef.current += 1;
      clearScheduler();
      silenceScheduledClicks();
      void audioContextRef.current?.close();
    };
  }, [clearScheduler, silenceScheduledClicks]);

  function commitBeatPatterns(nextPatterns: BeatPattern[]) {
    beatPatternsRef.current = nextPatterns;
    setBeatPatterns(nextPatterns);
  }

  function stopPlayback() {
    startRequestRef.current += 1;
    startingRef.current = false;
    playingRef.current = false;
    setIsStarting(false);
    setIsPlaying(false);
    clearScheduler();
    silenceScheduledClicks();
  }

  async function togglePlayback() {
    if (playingRef.current) {
      stopPlayback();
      return;
    }
    if (startingRef.current) return;

    const request = ++startRequestRef.current;
    startingRef.current = true;
    setIsStarting(true);
    setPlaybackError(null);

    try {
      let context = audioContextRef.current;
      if (!context || context.state === "closed") {
        context = new AudioContext();
        audioContextRef.current = context;
        const outputGain = context.createGain();
        outputGain.gain.value = 0;
        outputGain.connect(context.destination);
        outputGainRef.current = outputGain;
      }

      await context.resume();
      if (request !== startRequestRef.current || !mountedRef.current) return;

      outputGainRef.current?.gain.setValueAtTime(1, context.currentTime);
      const firstPosition = { beatIndex: 0, subdivisionIndex: 0 };
      positionRef.current = firstPosition;
      setCurrentPosition(firstPosition);
      nextNoteTimeRef.current = context.currentTime + RESTART_LEAD_SECONDS;
      playingRef.current = true;
      setIsPlaying(true);
    } catch {
      if (request === startRequestRef.current && mountedRef.current) {
        setPlaybackError("Audio could not start. Check browser audio permissions and try again.");
      }
    } finally {
      if (request === startRequestRef.current && mountedRef.current) {
        startingRef.current = false;
        setIsStarting(false);
      }
    }
  }

  function updateBpm(nextBpm: number) {
    const clamped = clampBpm(nextBpm);
    bpmRef.current = clamped;
    setBpm(clamped);
  }

  function updateBeatsPerBar(beatsPerBar: number) {
    const nextPatterns = resizeBarPattern(beatPatternsRef.current, beatsPerBar);
    commitBeatPatterns(nextPatterns);
    if (positionRef.current.beatIndex >= beatsPerBar) {
      positionRef.current = { beatIndex: 0, subdivisionIndex: 0 };
      setCurrentPosition(positionRef.current);
    }
  }

  function updateBeatSubdivision(beatIndex: number, subdivision: Subdivision) {
    const nextPatterns = beatPatternsRef.current.map((pattern, index) =>
      index === beatIndex ? changeSubdivision(pattern, subdivision) : pattern,
    );
    commitBeatPatterns(nextPatterns);
    if (
      positionRef.current.beatIndex === beatIndex &&
      positionRef.current.subdivisionIndex >= subdivision
    ) {
      positionRef.current = { beatIndex, subdivisionIndex: 0 };
    }
  }

  function togglePulse(beatIndex: number, subdivisionIndex: number) {
    const nextPatterns = beatPatternsRef.current.map((pattern, index) =>
      index === beatIndex
        ? {
            ...pattern,
            enabled: pattern.enabled.map((enabled, pulseIndex) =>
              pulseIndex === subdivisionIndex ? !enabled : enabled,
            ),
          }
        : pattern,
    );
    commitBeatPatterns(nextPatterns);
  }

  function updateVolume(nextVolume: number) {
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
  }

  function updateSoundPreset(nextPreset: SoundPreset) {
    soundPresetRef.current = nextPreset;
    setSoundPreset(nextPreset);
  }

  function updateAccentBarStart(enabled: boolean) {
    accentBarStartRef.current = enabled;
    setAccentBarStart(enabled);
  }

  function reset() {
    stopPlayback();
    setPlaybackError(null);
    updateBpm(80);
    commitBeatPatterns(createBarPattern(4));
    updateVolume(0.65);
    updateSoundPreset("classic");
    updateAccentBarStart(true);
    const firstPosition = { beatIndex: 0, subdivisionIndex: 0 };
    positionRef.current = firstPosition;
    setCurrentPosition(firstPosition);
    tapTimesRef.current = [];
  }

  function tapTempo() {
    const now = performance.now();
    const previous = tapTimesRef.current.at(-1);
    if (previous && now - previous > 2000) tapTimesRef.current = [];
    tapTimesRef.current.push(now);
    tapTimesRef.current = tapTimesRef.current.slice(-6);
    const intervals = tapTimesRef.current.slice(1).map((time, index) => {
      const before = tapTimesRef.current[index];
      return before === undefined ? 0 : time - before;
    });
    const nextBpm = bpmFromTapIntervals(intervals);
    if (nextBpm) updateBpm(nextBpm);
  }

  return (
    <div className="page section-frame">
      <PageHeader
        eyebrow="Rhythm & speed"
        title="Metronome"
        description="Build a different rhythmic grid inside every beat, then choose exactly which pulses should sound."
      />
      <div className="tool-workspace metronome-workspace">
        <section className="metronome-display" aria-live="polite">
          <div className={`tempo-orb ${isPlaying ? "playing" : ""}`}>
            <strong>{bpm}</strong>
            <span>BPM</span>
          </div>
          <div
            className="beat-row"
            role="status"
            aria-label={`Beat ${currentPosition.beatIndex + 1} of ${beatPatterns.length}`}
          >
            {beatIds.slice(0, beatPatterns.length).map((beatId, index) => (
              <span
                key={beatId}
                className={index === currentPosition.beatIndex && isPlaying ? "active" : ""}
              />
            ))}
          </div>
          <div className="button-row centered">
            <button
              className="button button-primary"
              type="button"
              disabled={isStarting}
              onClick={() => void togglePlayback()}
            >
              {isStarting ? "Starting…" : isPlaying ? "Stop" : "Start"}
            </button>
            <button className="button button-secondary" type="button" onClick={tapTempo}>
              Tap tempo
            </button>
            <button className="button button-quiet" type="button" onClick={reset}>
              Reset
            </button>
          </div>
          {playbackError ? <StatusMessage kind="error">{playbackError}</StatusMessage> : null}
        </section>

        <section className="control-panel" aria-label="Metronome settings">
          <label className="field range-field">
            <span>
              Tempo <output>{bpm} BPM</output>
            </span>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(event) => updateBpm(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Time signature</span>
            <select
              value={beatPatterns.length}
              onChange={(event) => updateBeatsPerBar(Number(event.target.value))}
            >
              {[2, 3, 4, 5, 6, 7].map((beat) => (
                <option key={beat} value={beat}>
                  {beat}/4
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sound</span>
            <select
              value={soundPreset}
              onChange={(event) => updateSoundPreset(event.target.value as SoundPreset)}
            >
              <option value="classic">Classic click</option>
              <option value="wood">Wood block</option>
              <option value="digital">Digital</option>
            </select>
          </label>
          <label className="field range-field">
            <span>
              Volume <output>{Math.round(volume * 100)}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => updateVolume(Number(event.target.value))}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={accentBarStart}
              onChange={(event) => updateAccentBarStart(event.target.checked)}
            />
            <span>
              <strong>Accent bar start</strong>
              <small>Use a higher click on beat one.</small>
            </span>
          </label>
        </section>

        <section className="beat-pattern-editor" aria-labelledby="beat-pattern-heading">
          <div className="pattern-editor-heading">
            <div>
              <p className="eyebrow">Per-beat control</p>
              <h2 id="beat-pattern-heading">Subdivision pattern</h2>
            </div>
            <p>
              Choose a subdivision for each beat. Filled pulses sound; outlined pulses stay silent.
            </p>
          </div>

          <div className="beat-pattern-grid">
            {beatPatterns.map((pattern, beatIndex) => (
              <article
                key={beatIds[beatIndex]}
                className={`beat-pattern-card ${
                  isPlaying && currentPosition.beatIndex === beatIndex ? "current" : ""
                }`}
              >
                <div className="beat-pattern-header">
                  <strong>Beat {beatIndex + 1}</strong>
                  <label>
                    <span className="visually-hidden">Subdivision for beat {beatIndex + 1}</span>
                    <select
                      value={pattern.subdivision}
                      onChange={(event) =>
                        updateBeatSubdivision(beatIndex, Number(event.target.value) as Subdivision)
                      }
                    >
                      {subdivisionOptions.map((value) => (
                        <option key={value} value={value}>
                          {subdivisionLabels[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  className="pulse-grid"
                  style={{ gridTemplateColumns: `repeat(${pattern.subdivision}, minmax(0, 1fr))` }}
                >
                  {pulseIds.slice(0, pattern.subdivision).map((pulseId, subdivisionIndex) => {
                    const enabled = pattern.enabled[subdivisionIndex] ?? false;
                    const isCurrent =
                      isPlaying &&
                      currentPosition.beatIndex === beatIndex &&
                      currentPosition.subdivisionIndex === subdivisionIndex;
                    return (
                      <button
                        key={`${beatIds[beatIndex]}-${pulseId}`}
                        type="button"
                        className={`${enabled ? "enabled" : ""} ${isCurrent ? "current" : ""}`}
                        aria-pressed={enabled}
                        aria-label={`Beat ${beatIndex + 1}, pulse ${subdivisionIndex + 1}: ${
                          enabled ? "on" : "off"
                        }`}
                        onClick={() => togglePulse(beatIndex, subdivisionIndex)}
                      >
                        <span>{subdivisionIndex + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
