import { Link } from "react-router-dom";
import { categoryLabels } from "../lib/constants";
import type { Exercise } from "../types/exercise";

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <article className="exercise-card">
      <div className="card-meta">
        <span>{categoryLabels[exercise.primary_category]}</span>
        <span>{exercise.difficulty}</span>
        {exercise.is_custom ? <span className="custom-badge">Custom</span> : null}
      </div>
      <h2>{exercise.name}</h2>
      <p>{exercise.summary}</p>
      <ul className="tag-list" aria-label="Tags">
        {exercise.tags.slice(0, 4).map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <Link className="text-link" to={`/exercises/${exercise.id}`}>
        Open exercise <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
