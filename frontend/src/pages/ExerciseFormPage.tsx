import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { createExercise, getExercise, updateExercise } from "../lib/api";
import { categoryLabels } from "../lib/constants";
import { categories, difficulties, type Exercise, type ExercisePayload } from "../types/exercise";

interface FormState {
  name: string;
  primary_category: ExercisePayload["primary_category"];
  difficulty: ExercisePayload["difficulty"];
  tags: string;
  summary: string;
  goal: string;
  steps: string;
  technique_notes: string;
  common_mistakes: string;
  min_bpm: string;
  max_bpm: string;
  target_duration_minutes: string;
  target_repetitions: string;
  source: string;
  external_video_url: string;
  image_url: string;
  tab_url: string;
}

const emptyForm: FormState = {
  name: "",
  primary_category: "rhythm",
  difficulty: "beginner",
  tags: "",
  summary: "",
  goal: "",
  steps: "",
  technique_notes: "",
  common_mistakes: "",
  min_bpm: "",
  max_bpm: "",
  target_duration_minutes: "",
  target_repetitions: "",
  source: "",
  external_video_url: "",
  image_url: "",
  tab_url: "",
};

function listFromLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function toPayload(form: FormState): ExercisePayload {
  return {
    name: form.name.trim(),
    primary_category: form.primary_category,
    difficulty: form.difficulty,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    summary: form.summary.trim(),
    goal: form.goal.trim(),
    steps: listFromLines(form.steps),
    technique_notes: listFromLines(form.technique_notes),
    common_mistakes: listFromLines(form.common_mistakes),
    min_bpm: nullableNumber(form.min_bpm),
    max_bpm: nullableNumber(form.max_bpm),
    target_duration_seconds: form.target_duration_minutes
      ? Number(form.target_duration_minutes) * 60
      : null,
    target_repetitions: nullableNumber(form.target_repetitions),
    source: form.source.trim() || null,
    external_video_url: form.external_video_url.trim() || null,
    image_url: form.image_url.trim() || null,
    tab_url: form.tab_url.trim() || null,
  };
}

function fromExercise(exercise: Exercise): FormState {
  return {
    name: exercise.name,
    primary_category: exercise.primary_category,
    difficulty: exercise.difficulty,
    tags: exercise.tags.join(", "),
    summary: exercise.summary,
    goal: exercise.goal,
    steps: exercise.steps.join("\n"),
    technique_notes: exercise.technique_notes.join("\n"),
    common_mistakes: exercise.common_mistakes.join("\n"),
    min_bpm: exercise.min_bpm?.toString() ?? "",
    max_bpm: exercise.max_bpm?.toString() ?? "",
    target_duration_minutes: exercise.target_duration_seconds
      ? (exercise.target_duration_seconds / 60).toString()
      : "",
    target_repetitions: exercise.target_repetitions?.toString() ?? "",
    source: exercise.source ?? "",
    external_video_url: exercise.external_video_url ?? "",
    image_url: exercise.image_url ?? "",
    tab_url: exercise.tab_url ?? "",
  };
}

export function ExerciseFormPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(exerciseId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(exerciseId);

  useEffect(() => {
    if (!exerciseId) return;
    getExercise(exerciseId)
      .then((exercise) => {
        if (!exercise.is_custom) throw new Error("Preset exercises cannot be edited");
        setForm(fromExercise(exercise));
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load exercise"),
      )
      .finally(() => setIsLoading(false));
  }, [exerciseId]);

  function update<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = toPayload(form);
      const saved = exerciseId
        ? await updateExercise(exerciseId, payload)
        : await createExercise(payload);
      navigate(`/exercises/${saved.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save exercise");
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="page section-frame">Loading exercise…</div>;

  return (
    <div className="page section-frame narrow-page">
      <Link className="back-link" to={exerciseId ? `/exercises/${exerciseId}` : "/exercises"}>
        ← Cancel and return
      </Link>
      <PageHeader
        eyebrow="Custom exercise"
        title={isEditing ? "Edit the exercise" : "Add an exercise"}
        description="Write instructions that will still make sense when you return several weeks later."
      />
      {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
      <form className="exercise-form" onSubmit={submit}>
        <section className="form-section">
          <div className="section-number">01</div>
          <div className="form-section-content">
            <h2>Identity</h2>
            <div className="form-grid">
              <label className="field full-span">
                <span>Name</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={form.primary_category}
                  onChange={(event) =>
                    update("primary_category", event.target.value as FormState["primary_category"])
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Difficulty</span>
                <select
                  value={form.difficulty}
                  onChange={(event) =>
                    update("difficulty", event.target.value as FormState["difficulty"])
                  }
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full-span">
                <span>Tags</span>
                <input
                  value={form.tags}
                  placeholder="alternate picking, warm up, string crossing"
                  onChange={(event) => update("tags", event.target.value)}
                />
                <small>Separate tags with commas.</small>
              </label>
              <label className="field full-span">
                <span>Short summary</span>
                <textarea
                  required
                  minLength={5}
                  maxLength={240}
                  rows={2}
                  value={form.summary}
                  onChange={(event) => update("summary", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">02</div>
          <div className="form-section-content">
            <h2>Instructions</h2>
            <div className="form-grid">
              <label className="field full-span">
                <span>Training goal</span>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={form.goal}
                  onChange={(event) => update("goal", event.target.value)}
                />
              </label>
              <label className="field full-span">
                <span>Steps</span>
                <textarea
                  required
                  rows={5}
                  value={form.steps}
                  onChange={(event) => update("steps", event.target.value)}
                />
                <small>Write one step per line.</small>
              </label>
              <label className="field full-span">
                <span>Technique notes</span>
                <textarea
                  rows={4}
                  value={form.technique_notes}
                  onChange={(event) => update("technique_notes", event.target.value)}
                />
                <small>Write one note per line.</small>
              </label>
              <label className="field full-span">
                <span>Common mistakes</span>
                <textarea
                  rows={4}
                  value={form.common_mistakes}
                  onChange={(event) => update("common_mistakes", event.target.value)}
                />
                <small>Write one mistake per line.</small>
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">03</div>
          <div className="form-section-content">
            <h2>Practice target</h2>
            <div className="form-grid compact-grid">
              <label className="field">
                <span>Minimum BPM</span>
                <input
                  type="number"
                  min="20"
                  max="400"
                  value={form.min_bpm}
                  onChange={(event) => update("min_bpm", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Maximum BPM</span>
                <input
                  type="number"
                  min="20"
                  max="400"
                  value={form.max_bpm}
                  onChange={(event) => update("max_bpm", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Duration in minutes</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.target_duration_minutes}
                  onChange={(event) => update("target_duration_minutes", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Repetitions</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.target_repetitions}
                  onChange={(event) => update("target_repetitions", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">04</div>
          <div className="form-section-content">
            <h2>References</h2>
            <div className="form-grid">
              <label className="field full-span">
                <span>Source</span>
                <input
                  value={form.source}
                  placeholder="Book, teacher, or lesson name"
                  onChange={(event) => update("source", event.target.value)}
                />
              </label>
              <label className="field full-span">
                <span>External video URL</span>
                <input
                  type="url"
                  value={form.external_video_url}
                  onChange={(event) => update("external_video_url", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Image URL</span>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(event) => update("image_url", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Tab URL</span>
                <input
                  type="url"
                  value={form.tab_url}
                  onChange={(event) => update("tab_url", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Link
            className="button button-quiet"
            to={exerciseId ? `/exercises/${exerciseId}` : "/exercises"}
          >
            Cancel
          </Link>
          <button className="button button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create exercise"}
          </button>
        </div>
      </form>
    </div>
  );
}
