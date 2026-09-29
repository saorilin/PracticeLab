from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import Difficulty, Exercise, ExerciseCategory
from app.repository import (
    create_exercise,
    delete_exercise,
    get_exercise,
    list_exercises,
    to_schema,
    update_exercise,
)
from app.schemas import ExerciseCreate, ExerciseList, ExerciseRead, ExerciseUpdate, HealthResponse

router = APIRouter()
SessionDependency = Annotated[Session, Depends(get_session)]


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="practicelab-api")


@router.get("/exercises", response_model=ExerciseList, tags=["exercises"])
def read_exercises(
    session: SessionDependency,
    category: ExerciseCategory | None = None,
    difficulty: Difficulty | None = None,
    query: Annotated[str | None, Query(max_length=120)] = None,
) -> ExerciseList:
    items, total = list_exercises(
        session,
        category=category.value if category else None,
        difficulty=difficulty.value if difficulty else None,
        query=query,
    )
    return ExerciseList(items=items, total=total)


@router.get("/exercises/{exercise_id}", response_model=ExerciseRead, tags=["exercises"])
def read_exercise(exercise_id: str, session: SessionDependency) -> ExerciseRead:
    exercise = get_exercise(session, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return to_schema(exercise)


@router.post(
    "/exercises",
    response_model=ExerciseRead,
    status_code=status.HTTP_201_CREATED,
    tags=["exercises"],
)
def add_exercise(payload: ExerciseCreate, session: SessionDependency) -> ExerciseRead:
    return create_exercise(session, payload)


def _get_editable_exercise(exercise_id: str, session: Session) -> Exercise:
    exercise = get_exercise(session, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    if not exercise.is_custom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Preset exercises cannot be changed",
        )
    return exercise


@router.put("/exercises/{exercise_id}", response_model=ExerciseRead, tags=["exercises"])
def replace_exercise(
    exercise_id: str, payload: ExerciseUpdate, session: SessionDependency
) -> ExerciseRead:
    exercise = _get_editable_exercise(exercise_id, session)
    return update_exercise(session, exercise, payload)


@router.delete(
    "/exercises/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["exercises"],
)
def remove_exercise(exercise_id: str, session: SessionDependency) -> Response:
    exercise = _get_editable_exercise(exercise_id, session)
    delete_exercise(session, exercise)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
