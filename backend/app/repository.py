import json
import re
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Exercise
from app.schemas import ExerciseCreate, ExerciseRead, ExerciseUpdate


def make_slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "exercise"
    return f"{base}-{uuid4().hex[:6]}"


def _json_list(value: str) -> list[str]:
    loaded = json.loads(value)
    return [str(item) for item in loaded]


def to_schema(exercise: Exercise) -> ExerciseRead:
    return ExerciseRead(
        id=exercise.id,
        slug=exercise.slug,
        name=exercise.name,
        primary_category=exercise.primary_category,
        difficulty=exercise.difficulty,
        tags=_json_list(exercise.tags_json),
        summary=exercise.summary,
        goal=exercise.goal,
        steps=_json_list(exercise.steps_json),
        technique_notes=_json_list(exercise.technique_notes_json),
        common_mistakes=_json_list(exercise.common_mistakes_json),
        min_bpm=exercise.min_bpm,
        max_bpm=exercise.max_bpm,
        target_duration_seconds=exercise.target_duration_seconds,
        target_repetitions=exercise.target_repetitions,
        source=exercise.source,
        external_video_url=exercise.external_video_url,
        image_url=exercise.image_url,
        tab_url=exercise.tab_url,
        is_custom=exercise.is_custom,
        created_at=exercise.created_at,
        updated_at=exercise.updated_at,
    )


def _apply_payload(exercise: Exercise, payload: ExerciseCreate | ExerciseUpdate) -> None:
    data = payload.model_dump(mode="json")
    exercise.name = data["name"]
    exercise.primary_category = data["primary_category"]
    exercise.difficulty = data["difficulty"]
    exercise.tags_json = json.dumps(data["tags"])
    exercise.summary = data["summary"]
    exercise.goal = data["goal"]
    exercise.steps_json = json.dumps(data["steps"])
    exercise.technique_notes_json = json.dumps(data["technique_notes"])
    exercise.common_mistakes_json = json.dumps(data["common_mistakes"])
    exercise.min_bpm = data["min_bpm"]
    exercise.max_bpm = data["max_bpm"]
    exercise.target_duration_seconds = data["target_duration_seconds"]
    exercise.target_repetitions = data["target_repetitions"]
    exercise.source = data["source"]
    exercise.external_video_url = data["external_video_url"]
    exercise.image_url = data["image_url"]
    exercise.tab_url = data["tab_url"]


def list_exercises(
    session: Session,
    *,
    category: str | None = None,
    difficulty: str | None = None,
    query: str | None = None,
) -> tuple[list[ExerciseRead], int]:
    statement = select(Exercise)
    if category:
        statement = statement.where(Exercise.primary_category == category)
    if difficulty:
        statement = statement.where(Exercise.difficulty == difficulty)
    if query:
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                Exercise.name.ilike(pattern),
                Exercise.summary.ilike(pattern),
                Exercise.tags_json.ilike(pattern),
            )
        )
    statement = statement.order_by(Exercise.is_custom, Exercise.name)
    rows = list(session.scalars(statement))
    return [to_schema(row) for row in rows], len(rows)


def get_exercise(session: Session, exercise_id: str) -> Exercise | None:
    return session.get(Exercise, exercise_id)


def create_exercise(session: Session, payload: ExerciseCreate) -> ExerciseRead:
    exercise = Exercise(slug=make_slug(payload.name), is_custom=True)
    _apply_payload(exercise, payload)
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return to_schema(exercise)


def update_exercise(session: Session, exercise: Exercise, payload: ExerciseUpdate) -> ExerciseRead:
    _apply_payload(exercise, payload)
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return to_schema(exercise)


def delete_exercise(session: Session, exercise: Exercise) -> None:
    session.delete(exercise)
    session.commit()


def exercise_count(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(Exercise)) or 0
