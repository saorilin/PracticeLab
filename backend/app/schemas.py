from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.models import Difficulty, ExerciseCategory


class ExerciseBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    primary_category: ExerciseCategory
    difficulty: Difficulty = Difficulty.BEGINNER
    tags: list[str] = Field(default_factory=list, max_length=12)
    summary: str = Field(min_length=5, max_length=240)
    goal: str = Field(default="", max_length=2000)
    steps: list[str] = Field(default_factory=list, max_length=20)
    technique_notes: list[str] = Field(default_factory=list, max_length=20)
    common_mistakes: list[str] = Field(default_factory=list, max_length=20)
    target_bpm: int | None = Field(default=None, ge=20, le=400)
    target_duration_seconds: int | None = Field(default=None, ge=10, le=7200)
    target_repetitions: int | None = Field(default=None, ge=1, le=1000)
    source: str | None = Field(default=None, max_length=240)
    external_video_url: HttpUrl | None = None
    image_url: HttpUrl | None = None
    tab_url: HttpUrl | None = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(ExerciseBase):
    pass


class ExerciseRead(ExerciseBase):
    id: str
    slug: str
    is_custom: bool
    current_bpm: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExerciseList(BaseModel):
    items: list[ExerciseRead]
    total: int


class ExerciseProgressUpdate(BaseModel):
    current_bpm: int | None = Field(ge=20, le=400)


class PracticeSessionCreate(BaseModel):
    duration_minutes: int = Field(ge=1, le=600)
    bpm: int | None = Field(default=None, ge=20, le=400)
    notes: str | None = Field(default=None, max_length=1000)


class PracticeSessionRead(BaseModel):
    id: str
    exercise_id: str
    duration_minutes: int
    bpm: int | None
    notes: str | None
    practiced_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("practiced_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        # SQLite drops the timezone of DateTime(timezone=True) columns. The value is always
        # written as UTC (utc_now), so mark it as UTC; otherwise the JSON has no offset and
        # browsers would read it as local time.
        return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


class PracticeSessionList(BaseModel):
    items: list[PracticeSessionRead]
    total: int


class HealthResponse(BaseModel):
    status: str
    service: str
