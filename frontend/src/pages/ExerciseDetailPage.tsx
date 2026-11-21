import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { PracticeLogSection } from "../components/PracticeLogSection";
import { StatusMessage } from "../components/StatusMessage";
import { deleteExercise, getExercise, updateExerciseProgress } from "../lib/api";
import { categoryLabels } from "../lib/constants";
import type { Exercise } from "../types/exercise";

function currentBpmLabel(exercise: Exercise): string {
  if (exercise.current_bpm === null) return "Not set";
  if (exercise.target_bpm !== null) {
    return `${exercise.current_bpm} / ${exercise.target_bpm} BPM`;
  }
  return `${exercise.current_bpm} BPM`;
}

export function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [bpmDraft, setBpmDraft] = useState("");
  const [isSavingBpm, setIsSavingBpm] = useState(false);
  const [bpmError, setBpmError] = useState<string | null>(null);
  const bpmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingBpm) bpmInputRef.current?.focus();
  }, [isEditingBpm]);

  useEffect(() => {
    if (!exerciseId) return;
    getExercise(exerciseId)
      .then(setExercise)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load exercise"),
      );
  }, [exerciseId]);

  async function removeExercise() {
    if (!exercise) return;
    const message = exercise.is_custom
      ? `Delete “${exercise.name}”? This cannot be undone.`
      : `Delete the preset “${exercise.name}”? It will not be restored automatically. This cannot be undone.`;
    if (!window.confirm(message)) return;
    setIsDeleting(true);
    try {
      await deleteExercise(exercise.id);
      navigate("/exercises");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete exercise");
      setIsDeleting(false);
    }
  }

  function startBpmEdit() {
    if (!exercise) return;
    setBpmDraft(exercise.current_bpm?.toString() ?? "");
    setBpmError(null);
    setIsEditingBpm(true);
  }

  function cancelBpmEdit() {
    setIsEditingBpm(false);
    setBpmError(null);
  }

  async function saveBpm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exercise) return;
    const value = bpmDraft.trim() ? Number(bpmDraft) : null;
    setIsSavingBpm(true);
    setBpmError(null);
    try {
      const updated = await updateExerciseProgress(exercise.id, value);
      setExercise(updated);
      setIsEditingBpm(false);
    } catch (caught) {
      setBpmError(caught instanceof Error ? caught.message : "Could not save current BPM");
    } finally {
      setIsSavingBpm(false);
    }
  }

  function handleBpmKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelBpmEdit();
    }
  }

  if (error && !exercise) {
    return (
      <div className="page section-frame">
        <StatusMessage kind="error">{error}</StatusMessage>
        <Link className="text-link" to="/exercises">
          ← Back to exercises
        </Link>
      </div>
    );
  }
  if (!exercise) return <div className="page section-frame">Loading exercise…</div>;

  return (
    <div className="page section-frame">
      <Link className="back-link" to="/exercises">
        ← Exercise library
      </Link>
      <PageHeader
        eyebrow={`${categoryLabels[exercise.primary_category]} · ${exercise.difficulty}`}
        title={exercise.name}
        description={exercise.summary}
        actions={
          <div className="button-row">
            <Link className="button button-secondary" to={`/exercises/${exercise.id}/edit`}>
              Edit
            </Link>
            <button
              className="button button-danger"
              type="button"
              onClick={removeExercise}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      />
      {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
      <div className="detail-layout">
        <article className="detail-main">
          {exercise.goal.trim() ? (
            <section>
              <p className="eyebrow">Training goal</p>
              <h2>What clean progress looks like</h2>
              <p>{exercise.goal}</p>
            </section>
          ) : null}
          {exercise.steps.length > 0 ? (
            <section>
              <p className="eyebrow">Steps</p>
              <h2>How to practise it</h2>
              <ol className="instruction-list">
                {exercise.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null}
          {exercise.technique_notes.length > 0 ? (
            <section>
              <p className="eyebrow">Technique notes</p>
              <h2>Keep the motion economical</h2>
              <ul className="detail-list">
                {exercise.technique_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {exercise.common_mistakes.length > 0 ? (
            <section>
              <p className="eyebrow">Common mistakes</p>
              <h2>Stop and diagnose</h2>
              <ul className="detail-list warning-list">
                {exercise.common_mistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {exercise.source ||
          exercise.image_url ||
          exercise.external_video_url ||
          exercise.tab_url ? (
            <section>
              <p className="eyebrow">References</p>
              <h2>Supporting material</h2>
              {exercise.source ? <p>Source: {exercise.source}</p> : null}
              {exercise.image_url ? (
                <img
                  className="reference-image"
                  src={exercise.image_url}
                  alt={`${exercise.name} reference`}
                />
              ) : null}
              <div className="reference-links">
                {exercise.external_video_url ? (
                  <a
                    className="text-link"
                    href={exercise.external_video_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch reference video ↗
                  </a>
                ) : null}
                {exercise.tab_url ? (
                  <a className="text-link" href={exercise.tab_url} target="_blank" rel="noreferrer">
                    Open tab file ↗
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
          <PracticeLogSection exerciseId={exercise.id} currentBpm={exercise.current_bpm} />
        </article>
        <aside className="practice-card">
          <p className="eyebrow">Practice target</p>
          <dl>
            <div>
              <dt>Target BPM</dt>
              <dd>{exercise.target_bpm ?? "Not set"}</dd>
            </div>
            <div className={isEditingBpm ? "current-bpm-row is-editing" : "current-bpm-row"}>
              <dt>Current BPM</dt>
              <dd>
                {isEditingBpm ? (
                  <form className="current-bpm-form" onSubmit={saveBpm}>
                    <label className="field">
                      <span>New current BPM</span>
                      <input
                        ref={bpmInputRef}
                        type="number"
                        min="20"
                        max="400"
                        value={bpmDraft}
                        onChange={(event) => setBpmDraft(event.target.value)}
                        onKeyDown={handleBpmKeyDown}
                      />
                      <small>Leave empty to clear.</small>
                    </label>
                    {bpmError ? <StatusMessage kind="error">{bpmError}</StatusMessage> : null}
                    <div className="button-row">
                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={isSavingBpm}
                      >
                        {isSavingBpm ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="button button-quiet"
                        type="button"
                        onClick={cancelBpmEdit}
                        disabled={isSavingBpm}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span data-testid="current-bpm">{currentBpmLabel(exercise)}</span>
                    <button
                      className="bpm-edit-button"
                      type="button"
                      onClick={startBpmEdit}
                      aria-label="Change current BPM"
                    >
                      Change
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>
                {exercise.target_duration_seconds
                  ? `${Math.round(exercise.target_duration_seconds / 60)} min`
                  : "Not specified"}
              </dd>
            </div>
            <div>
              <dt>Repetitions</dt>
              <dd>{exercise.target_repetitions ?? "Not specified"}</dd>
            </div>
          </dl>
          <ul className="tag-list" aria-label="Tags">
            {exercise.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <Link className="button button-secondary full-width" to="/tools/metronome">
            Open metronome
          </Link>
        </aside>
      </div>
    </div>
  );
}
