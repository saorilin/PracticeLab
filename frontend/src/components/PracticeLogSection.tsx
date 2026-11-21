import { type FormEvent, useEffect, useState } from "react";
import { createPracticeSession, getPracticeSessions } from "../lib/api";
import type { PracticeSession } from "../types/practiceSession";
import { StatusMessage } from "./StatusMessage";

interface PracticeLogSectionProps {
  exerciseId: string;
  currentBpm: number | null;
}

interface LogForm {
  minutes: string;
  bpm: string;
  notes: string;
}

const emptyForm: LogForm = { minutes: "", bpm: "", notes: "" };

// The server sends UTC timestamps; toLocaleString shows them in the browser's time zone.
const practicedAtFormat: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function PracticeLogSection({ exerciseId, currentBpm }: PracticeLogSectionProps) {
  const [sessions, setSessions] = useState<PracticeSession[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<LogForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setSessions(null);
    setLoadError(null);
    getPracticeSessions(exerciseId)
      .then((response) => {
        if (isCurrent) setSessions(response.items);
      })
      .catch((caught: unknown) => {
        if (isCurrent) setLoadError(errorMessage(caught, "Could not load practice sessions"));
      });
    return () => {
      isCurrent = false;
    };
  }, [exerciseId]);

  function update<K extends keyof LogForm>(name: K, value: LogForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSaving(true);
    try {
      const created = await createPracticeSession(exerciseId, {
        duration_minutes: Number(form.minutes),
        bpm: form.bpm.trim() ? Number(form.bpm) : null,
        notes: form.notes.trim() || null,
      });
      setSessions((current) => [created, ...(current ?? [])]);
      setForm(emptyForm);
    } catch (caught) {
      setSubmitError(errorMessage(caught, "Could not log practice session"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="practice-log" aria-labelledby="practice-log-title">
      <p className="eyebrow">Practice log</p>
      <h2 id="practice-log-title">Record what you played</h2>
      <form className="practice-log-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              required
              min="1"
              max="600"
              value={form.minutes}
              onChange={(event) => update("minutes", event.target.value)}
            />
          </label>
          <label className="field">
            <span>BPM</span>
            <input
              type="number"
              min="20"
              max="400"
              placeholder={currentBpm?.toString() ?? ""}
              value={form.bpm}
              onChange={(event) => update("bpm", event.target.value)}
            />
          </label>
          <label className="field full-span">
            <span>Notes</span>
            <textarea
              rows={2}
              maxLength={1000}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
        </div>
        {submitError ? <StatusMessage kind="error">{submitError}</StatusMessage> : null}
        <button className="button button-primary" type="submit" disabled={isSaving}>
          {isSaving ? "Logging…" : "Log session"}
        </button>
      </form>

      {loadError ? <StatusMessage kind="error">{loadError}</StatusMessage> : null}
      {sessions === null && !loadError ? <p>Loading practice sessions…</p> : null}
      {sessions !== null && sessions.length === 0 ? (
        <p className="practice-log-empty">No sessions logged yet.</p>
      ) : null}
      {sessions !== null && sessions.length > 0 ? (
        <ol className="practice-log-list" aria-label="Logged sessions">
          {sessions.map((item) => (
            <li key={item.id}>
              <div className="practice-log-meta">
                <time dateTime={item.practiced_at}>
                  {new Date(item.practiced_at).toLocaleString(undefined, practicedAtFormat)}
                </time>
                <span>{item.duration_minutes} min</span>
                {item.bpm !== null ? <span>{item.bpm} BPM</span> : null}
              </div>
              {item.notes ? <p className="practice-log-notes">{item.notes}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
