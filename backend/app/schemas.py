from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

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


class HealthResponse(BaseModel):
    status: str
    service: str
