import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import {
  MAX_BPM,
  MIN_BPM,
  type Subdivision,
  bpmFromTapIntervals,
  clampBpm,
  intervalMilliseconds,
} from "../lib/metronome";

const subdivisionLabels: Record<Subdivision, string> = {
  1: "Quarter",
  2: "Eighth",
  3: "Triplet",
  4: "Sixteenth",
};

const beatIds = ["beat-1", "beat-2", "beat-3", "beat-4", "beat-5", "beat-6", "beat-7"];

export function MetronomePage() {
  const [bpm, setBpm] = useState(80);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [volume, setVolume] = useState(0.65);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);

  const playClick = useCallback(
    (accent: boolean) => {
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = accent ? 1120 : 760;
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.045);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.05);
    },
    [volume],
  );

  useEffect(() => {
    if (!isPlaying) return undefined;
    const runTick = () => {
      const beatIndex = Math.floor(tickRef.current / subdivision) % beatsPerBar;
      const isMainBeat = tickRef.current % subdivision === 0;
      playClick(isMainBeat && beatIndex === 0);
      if (isMainBeat) setCurrentBeat(beatIndex);
      tickRef.current += 1;
    };
    runTick();
    timerRef.current = window.setInterval(runTick, intervalMilliseconds(bpm, subdivision));
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [beatsPerBar, bpm, isPlaying, playClick, subdivision]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      void audioContextRef.current?.close();
    },
    [],
  );

  function togglePlayback() {
    if (!isPlaying) {
      tickRef.current = 0;
      setCurrentBeat(0);
    }
    setIsPlaying((value) => !value);
  }

  function reset() {
    setIsPlaying(false);
    setBpm(80);
    setBeatsPerBar(4);
    setSubdivision(1);
    setVolume(0.65);
    setCurrentBeat(0);
    tickRef.current = 0;
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
    if (nextBpm) setBpm(nextBpm);
  }

  return (
    <div className="page section-frame">
      <PageHeader
        eyebrow="Rhythm & speed"
        title="Metronome"
        description="Start slowly, listen for uneven attacks, and increase tempo only when the phrase stays relaxed."
      />
      <div className="tool-workspace">
        <section className="metronome-display" aria-live="polite">
          <div className={`tempo-orb ${isPlaying ? "playing" : ""}`}>
            <strong>{bpm}</strong>
            <span>BPM</span>
          </div>
          <div
            className="beat-row"
            role="status"
            aria-label={`Beat ${currentBeat + 1} of ${beatsPerBar}`}
          >
            {beatIds.slice(0, beatsPerBar).map((beatId, index) => (
              <span key={beatId} className={index === currentBeat && isPlaying ? "active" : ""} />
            ))}
          </div>
          <div className="button-row centered">
            <button className="button button-primary" type="button" onClick={togglePlayback}>
              {isPlaying ? "Stop" : "Start"}
            </button>
            <button className="button button-secondary" type="button" onClick={tapTempo}>
              Tap tempo
            </button>
            <button className="button button-quiet" type="button" onClick={reset}>
              Reset
            </button>
          </div>
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
              onChange={(event) => setBpm(clampBpm(Number(event.target.value)))}
            />
          </label>
          <label className="field">
            <span>Beats per bar</span>
            <select
              value={beatsPerBar}
              onChange={(event) => setBeatsPerBar(Number(event.target.value))}
            >
              {[2, 3, 4, 5, 6, 7].map((beat) => (
                <option key={beat} value={beat}>
                  {beat}/4
                </option>
              ))}
            </select>
          </label>
          <fieldset className="field option-group">
            <legend>Subdivision</legend>
            <div className="segmented-control">
              {([1, 2, 3, 4] as Subdivision[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={subdivision === value ? "selected" : ""}
                  onClick={() => setSubdivision(value)}
                >
                  {subdivisionLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>
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
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </section>
      </div>
    </div>
  );
}
