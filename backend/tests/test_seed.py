from collections.abc import Generator
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import AppMeta, Exercise
from app.seed import PRESET_EXERCISES, PRESETS_SEEDED_KEY, seed_database


@pytest.fixture
def session(tmp_path: Path) -> Generator[Session, None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'seed.db'}")
    Base.metadata.create_all(bind=engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as db_session:
        yield db_session
    engine.dispose()


def _preset_count(session: Session) -> int:
    statement = select(func.count()).select_from(Exercise).where(Exercise.is_custom.is_(False))
    return session.scalar(statement) or 0


def test_empty_database_gets_presets_and_marker(session: Session) -> None:
    seed_database(session)

    assert _preset_count(session) == len(PRESET_EXERCISES) == 5
    assert session.get(AppMeta, PRESETS_SEEDED_KEY) is not None


def test_upgraded_database_without_marker_is_not_duplicated(session: Session) -> None:
    # Simulates a database created before the marker existed: presets are present,
    # but app_meta is empty.
    seed_database(session)
    marker = session.get(AppMeta, PRESETS_SEEDED_KEY)
    assert marker is not None
    session.delete(marker)
    session.commit()

    seed_database(session)

    assert _preset_count(session) == 5
    assert session.get(AppMeta, PRESETS_SEEDED_KEY) is not None


def test_deleted_preset_is_not_restored(session: Session) -> None:
    seed_database(session)
    deleted_slug = PRESET_EXERCISES[0]["slug"]
    preset = session.scalars(select(Exercise).where(Exercise.slug == deleted_slug)).one()
    session.delete(preset)
    session.commit()

    seed_database(session)

    assert _preset_count(session) == 4
    remaining = set(session.scalars(select(Exercise.slug)))
    assert deleted_slug not in remaining
