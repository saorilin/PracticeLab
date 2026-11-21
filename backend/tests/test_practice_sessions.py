from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import get_session
from app.main import app
from app.models import PracticeSession


@contextmanager
def db_session() -> Iterator[Session]:
    # The session the client fixture installed, used read/write here without changing
    # the fixture itself.
    sessions = app.dependency_overrides[get_session]()
    try:
        yield next(sessions)
    finally:
        sessions.close()


def _preset(client: TestClient) -> dict[str, Any]:
    items = client.get("/api/v1/exercises").json()["items"]
    preset: dict[str, Any] = next(item for item in items if not item["is_custom"])
    return preset


def _custom(client: TestClient, name: str = "Practice log custom") -> dict[str, Any]:
    response = client.post(
        "/api/v1/exercises",
        json={"name": name, "primary_category": "rhythm", "summary": "A custom exercise."},
    )
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


def _log(client: TestClient, exercise_id: str, **body: Any) -> dict[str, Any]:
    response = client.post(f"/api/v1/exercises/{exercise_id}/sessions", json=body)
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


def _session_rows(exercise_id: str) -> int:
    with db_session() as session:
        statement = (
            select(func.count())
            .select_from(PracticeSession)
            .where(PracticeSession.exercise_id == exercise_id)
        )
        return session.scalar(statement) or 0


def test_logs_session_for_preset_exercise(client: TestClient) -> None:
    preset = _preset(client)
    before = datetime.now(UTC)

    created = _log(client, preset["id"], duration_minutes=15, bpm=90, notes="Clean at 90.")

    assert set(created) == {
        "id",
        "exercise_id",
        "duration_minutes",
        "bpm",
        "notes",
        "practiced_at",
    }
    assert created["exercise_id"] == preset["id"]
    assert created["duration_minutes"] == 15
    assert created["bpm"] == 90
    assert created["notes"] == "Clean at 90."
    practiced_at = datetime.fromisoformat(created["practiced_at"])
    assert practiced_at.tzinfo is not None
    assert before - timedelta(seconds=5) <= practiced_at <= datetime.now(UTC) + timedelta(seconds=5)


def test_logs_session_for_custom_exercise_with_only_minutes(client: TestClient) -> None:
    custom = _custom(client)

    created = _log(client, custom["id"], duration_minutes=10)

    assert created["exercise_id"] == custom["id"]
    assert created["bpm"] is None
    assert created["notes"] is None


def test_lists_only_own_sessions_newest_first(client: TestClient) -> None:
    preset = _preset(client)
    other = _custom(client, name="Other exercise")
    first = _log(client, preset["id"], duration_minutes=5)
    second = _log(client, preset["id"], duration_minutes=10)
    third = _log(client, preset["id"], duration_minutes=20)
    _log(client, other["id"], duration_minutes=30)
    # Requests in quick succession can share a timestamp, so pin distinct times to make the
    # expected order deterministic.
    base = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    with db_session() as session:
        for offset, item in enumerate((first, second, third)):
            session.execute(
                update(PracticeSession)
                .where(PracticeSession.id == item["id"])
                .values(practiced_at=base + timedelta(hours=offset))
            )
        session.commit()

    response = client.get(f"/api/v1/exercises/{preset['id']}/sessions")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert [item["id"] for item in body["items"]] == [third["id"], second["id"], first["id"]]
    assert {item["exercise_id"] for item in body["items"]} == {preset["id"]}
    assert datetime.fromisoformat(body["items"][0]["practiced_at"]) == base + timedelta(hours=2)


def test_empty_list_for_exercise_without_sessions(client: TestClient) -> None:
    custom = _custom(client)

    response = client.get(f"/api/v1/exercises/{custom['id']}/sessions")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_missing_exercise_returns_404(client: TestClient) -> None:
    post = client.post("/api/v1/exercises/does-not-exist/sessions", json={"duration_minutes": 5})
    get = client.get("/api/v1/exercises/does-not-exist/sessions")

    assert post.status_code == 404
    assert post.json()["detail"] == "Exercise not found"
    assert get.status_code == 404
    assert get.json()["detail"] == "Exercise not found"


def test_rejects_invalid_values(client: TestClient) -> None:
    preset = _preset(client)
    url = f"/api/v1/exercises/{preset['id']}/sessions"
    invalid_bodies: list[dict[str, Any]] = [
        {},
        {"duration_minutes": 0},
        {"duration_minutes": 601},
        {"duration_minutes": 10, "bpm": 19},
        {"duration_minutes": 10, "bpm": 401},
        {"duration_minutes": 10, "notes": "x" * 1001},
    ]

    for body in invalid_bodies:
        assert client.post(url, json=body).status_code == 422, body

    # Boundary values are accepted.
    _log(client, preset["id"], duration_minutes=1, bpm=20, notes="x" * 1000)
    _log(client, preset["id"], duration_minutes=600, bpm=400)
    assert _session_rows(preset["id"]) == 2


def test_deleting_exercise_deletes_its_sessions(client: TestClient) -> None:
    custom = _custom(client)
    keep = _custom(client, name="Kept exercise")
    _log(client, custom["id"], duration_minutes=5)
    _log(client, custom["id"], duration_minutes=6)
    _log(client, keep["id"], duration_minutes=7)
    assert _session_rows(custom["id"]) == 2

    assert client.delete(f"/api/v1/exercises/{custom['id']}").status_code == 204

    assert _session_rows(custom["id"]) == 0
    assert _session_rows(keep["id"]) == 1
