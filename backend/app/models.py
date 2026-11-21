from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class ExerciseCategory(StrEnum):
    RHYTHM = "rhythm"
    LEFT_HAND = "left-hand"
    RIGHT_HAND = "right-hand"
    SYNCHRONIZATION = "synchronization"
    CONTROL = "control"


class Difficulty(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    primary_category: Mapped[str] = mapped_column(String(32), index=True)
    difficulty: Mapped[str] = mapped_column(String(20), index=True)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    summary: Mapped[str] = mapped_column(String(240))
    goal: Mapped[str] = mapped_column(Text)
    steps_json: Mapped[str] = mapped_column(Text, default="[]")
    technique_notes_json: Mapped[str] = mapped_column(Text, default="[]")
    common_mistakes_json: Mapped[str] = mapped_column(Text, default="[]")
    min_bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_repetitions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str | None] = mapped_column(String(240), nullable=True)
    external_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tab_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    progress: Mapped["ExerciseProgress | None"] = relationship(
        back_populates="exercise", cascade="all, delete-orphan", uselist=False
    )


class ExerciseProgress(Base):
    __tablename__ = "exercise_progress"

    exercise_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exercises.id"), primary_key=True
    )
    current_bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    exercise: Mapped[Exercise] = relationship(back_populates="progress")


class AppMeta(Base):
    __tablename__ = "app_meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(255))
