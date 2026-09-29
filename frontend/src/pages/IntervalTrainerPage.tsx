import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import {
  type IntervalQuestion,
  createIntervalQuestion,
  intervals,
  midiToFrequency,
} from "../lib/intervals";

type AnswerState = "waiting" | "correct" | "incorrect";

export function IntervalTrainerPage() {
  const [enabled, setEnabled] = useState<number[]>([1, 2, 3, 4, 5, 7]);
  const [question, setQuestion] = useState<IntervalQuestion>(() => createIntervalQuestion(enabled));
  const [answerState, setAnswerState] = useState<AnswerState>("waiting");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    [],
  );

  const choices = useMemo(
    () => intervals.filter((interval) => enabled.includes(interval.semitones)),
    [enabled],
  );

  const playQuestion = useCallback(() => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    const notes = [
      question.rootMidi,
      question.rootMidi + question.direction * question.interval.semitones,
    ];
    notes.forEach((midi, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.72;
      oscillator.type = "sine";
      oscillator.frequency.value = midiToFrequency(midi);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.32, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.58);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.62);
    });
  }, [question]);

  function answer(semitones: number) {
    if (answerState !== "waiting") return;
    const isCorrect = semitones === question.interval.semitones;
    setSelectedAnswer(semitones);
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setAnswered((value) => value + 1);
    if (isCorrect) setCorrect((value) => value + 1);
  }

  function nextQuestion(nextEnabled = enabled) {
    setQuestion(createIntervalQuestion(nextEnabled));
    setAnswerState("waiting");
    setSelectedAnswer(null);
  }

  function toggleInterval(semitones: number) {
    const next = enabled.includes(semitones)
      ? enabled.filter((value) => value !== semitones)
      : [...enabled, semitones];
    if (next.length < 2) return;
    setEnabled(next);
    nextQuestion(next);
  }

  function reset() {
    setAnswered(0);
    setCorrect(0);
    nextQuestion();
  }

  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);

  return (
    <div className="page section-frame">
      <PageHeader
        eyebrow="Ear training"
        title="Interval trainer"
        description="Listen to two consecutive notes. Name the distance before replaying it."
      />
      <div className="trainer-layout">
        <section className="trainer-stage">
          <dl className="score-strip" aria-label="Current score">
            <div>
              <dt>Questions</dt>
              <dd>{answered}</dd>
            </div>
            <div>
              <dt>Correct</dt>
              <dd>{correct}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{accuracy}%</dd>
            </div>
          </dl>
          <button className="listen-button" type="button" onClick={playQuestion}>
            <span aria-hidden="true">▶</span>
            Play interval
          </button>
          <fieldset className="answer-fieldset">
            <legend>Choose an interval</legend>
            <div className="answer-grid">
              {choices.map((interval) => {
                const isSelected = selectedAnswer === interval.semitones;
                const isCorrectAnswer =
                  answerState !== "waiting" && interval.semitones === question.interval.semitones;
                return (
                  <button
                    key={interval.semitones}
                    type="button"
                    className={`${isSelected ? "selected" : ""} ${isCorrectAnswer ? "correct" : ""}`}
                    onClick={() => answer(interval.semitones)}
                    disabled={answerState !== "waiting"}
                  >
                    <strong>{interval.shortName}</strong>
                    <span>{interval.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {answerState === "correct" ? (
            <StatusMessage kind="success">
              Correct. Listen once more before moving on.
            </StatusMessage>
          ) : null}
          {answerState === "incorrect" ? (
            <StatusMessage kind="error">
              Not this time. The answer is {question.interval.name}.
            </StatusMessage>
          ) : null}
          <div className="button-row centered">
            <button className="button button-secondary" type="button" onClick={playQuestion}>
              Replay
            </button>
            <button className="button button-primary" type="button" onClick={() => nextQuestion()}>
              Next
            </button>
            <button className="button button-quiet" type="button" onClick={reset}>
              Reset score
            </button>
          </div>
        </section>

        <aside className="control-panel">
          <fieldset className="field checkbox-list">
            <legend>Intervals in this session</legend>
            <p>Select at least two choices.</p>
            {intervals.map((interval) => (
              <label key={interval.semitones}>
                <input
                  type="checkbox"
                  checked={enabled.includes(interval.semitones)}
                  onChange={() => toggleInterval(interval.semitones)}
                />
                <span>{interval.shortName}</span>
                {interval.name}
              </label>
            ))}
          </fieldset>
        </aside>
      </div>
    </div>
  );
}
