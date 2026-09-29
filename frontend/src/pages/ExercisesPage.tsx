import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { PageHeader } from "../components/PageHeader";
import { StatusMessage } from "../components/StatusMessage";
import { getExercises } from "../lib/api";
import { categoryLabels } from "../lib/constants";
import { categories, difficulties, type Exercise } from "../types/exercise";

export function ExercisesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    getExercises({ query, category, difficulty })
      .then((result) => setItems(result.items))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Could not load exercises");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [category, difficulty, query]);

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="page section-frame">
      <PageHeader
        eyebrow="Exercise library"
        title="Find the smallest useful exercise"
        description="Filter by movement problem, read the complete instructions, or add an exercise from your own practice."
        actions={
          <Link className="button button-primary" to="/exercises/new">
            Add exercise
          </Link>
        }
      />
      <section className="filter-bar" aria-label="Exercise filters">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            placeholder="Name, tag, or keyword"
            onChange={(event) => updateFilter("query", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => updateFilter("difficulty", event.target.value)}
          >
            <option value="">All levels</option>
            {difficulties.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-quiet" type="button" onClick={() => setSearchParams({})}>
          Clear
        </button>
      </section>

      <div className="results-heading">
        <p>{isLoading ? "Loading exercises…" : `${items.length} exercises`}</p>
      </div>
      {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
      {!isLoading && !error && items.length === 0 ? (
        <div className="empty-state">
          <h2>No matching exercises</h2>
          <p>Clear one filter or create a custom exercise for this practice problem.</p>
        </div>
      ) : null}
      <div className="exercise-grid">
        {items.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}
