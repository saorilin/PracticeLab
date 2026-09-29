import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { deleteExercise, getExercise } from "../lib/api";
import { categoryLabels } from "../lib/constants";
import type { Exercise } from "../types/exercise";

export function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!exerciseId) return;
    getExercise(exerciseId)
      .then(setExercise)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load exercise"),
      );
  }, [exerciseId]);

  async function removeCustomExercise() {
    if (!exercise || !window.confirm(`Delete “${exercise.name}”? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteExercise(exercise.id);
      navigate("/exercises");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete exercise");
      setIsDeleting(false);
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
          exercise.is_custom ? (
            <div className="button-row">
              <Link className="button button-secondary" to={`/exercises/${exercise.id}/edit`}>
                Edit
              </Link>
              <button
                className="button button-danger"
                type="button"
                onClick={removeCustomExercise}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : undefined
        }
      />
      {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
      <div className="detail-layout">
        <article className="detail-main">
          <section>
            <p className="eyebrow">Training goal</p>
            <h2>What clean progress looks like</h2>
            <p>{exercise.goal}</p>
          </section>
          <section>
            <p className="eyebrow">Steps</p>
            <h2>How to practise it</h2>
            <ol className="instruction-list">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
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
        </article>
        <aside className="practice-card">
          <p className="eyebrow">Practice target</p>
          <dl>
            <div>
              <dt>BPM range</dt>
              <dd>
                {exercise.min_bpm && exercise.max_bpm
                  ? `${exercise.min_bpm}–${exercise.max_bpm}`
                  : "Use a clean tempo"}
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
