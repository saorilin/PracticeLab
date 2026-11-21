from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.database import get_session
from app.main import app
from app.models import ExerciseProgress


def minimal_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Slow legato runs",
        "primary_category": "left-hand",
        "difficulty": "intermediate",
        "summary": "Even hammer-ons and pull-offs across three strings.",
        "target_bpm": 120,
    }
    payload.update(overrides)
    return payload


def _create(client: TestClient, **overrides: Any) -> dict[str, Any]:
    response = client.post("/api/v1/exercises", json=minimal_payload(**overrides))
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


def _first_preset(client: TestClient) -> dict[str, Any]:
    items = client.get("/api/v1/exercises").json()["items"]
    preset: dict[str, Any] = next(item for item in items if not item["is_custom"])
    return preset


def _progress_rows(exercise_id: str) -> int:
    # Uses the session the client fixture installed, without changing that fixture.
    sessions = app.dependency_overrides[get_session]()
    session = next(sessions)
    try:
        statement = (
            select(func.count())
            .select_from(ExerciseProgress)
            .where(ExerciseProgress.exercise_id == exercise_id)
        )
        return session.scalar(statement) or 0
    finally:
        sessions.close()


def test_creates_exercise_without_goal_and_steps(client: TestClient) -> None:
    created = _create(client)

    assert created["goal"] == ""
    assert created["steps"] == []


def test_target_bpm_round_trip_without_legacy_range(client: TestClient) -> None:
    created = _create(client, target_bpm=132)

    fetched = client.get(f"/api/v1/exercises/{created['id']}").json()

    assert fetched["target_bpm"] == 132
    assert "min_bpm" not in fetched
    assert "max_bpm" not in fetched


def test_put_without_goal_and_steps_keeps_stored_values(client: TestClient) -> None:
    created = _create(client, goal="Keep every note even.", steps=["Play slowly.", "Speed up."])

    update = client.put(
        f"/api/v1/exercises/{created['id']}",
        json=minimal_payload(name="Renamed legato runs", target_bpm=140),
    )

    assert update.status_code == 200
    body = update.json()
    assert body["name"] == "Renamed legato runs"
    assert body["target_bpm"] == 140
    assert body["goal"] == "Keep every note even."
    assert body["steps"] == ["Play slowly.", "Speed up."]


def test_put_keeps_preset_goal_and_steps(client: TestClient) -> None:
    preset = _first_preset(client)
    assert preset["goal"] and preset["steps"]

    update = client.put(
        f"/api/v1/exercises/{preset['id']}",
        json=minimal_payload(name=preset["name"], summary=preset["summary"]),
    )

    assert update.status_code == 200
    assert update.json()["goal"] == preset["goal"]
    assert update.json()["steps"] == preset["steps"]


def test_sets_and_updates_current_bpm(client: TestClient) -> None:
    created = _create(client)
    assert created["current_bpm"] is None
    url = f"/api/v1/exercises/{created['id']}/progress"

    first = client.put(url, json={"current_bpm": 85})
    second = client.put(url, json={"current_bpm": 95})

    assert first.status_code == 200
    assert first.json()["current_bpm"] == 85
    assert first.json()["id"] == created["id"]
    assert first.json()["name"] == created["name"]
    assert second.json()["current_bpm"] == 95
    assert client.get(f"/api/v1/exercises/{created['id']}").json()["current_bpm"] == 95
    assert _progress_rows(created["id"]) == 1


def test_null_clears_current_bpm(client: TestClient) -> None:
    created = _create(client)
    url = f"/api/v1/exercises/{created['id']}/progress"
    client.put(url, json={"current_bpm": 85})

    cleared = client.put(url, json={"current_bpm": None})

    assert cleared.status_code == 200
    assert cleared.json()["current_bpm"] is None


def test_rejects_current_bpm_out_of_range(client: TestClient) -> None:
    created = _create(client)
    url = f"/api/v1/exercises/{created['id']}/progress"

    assert client.put(url, json={"current_bpm": 19}).status_code == 422
    assert client.put(url, json={"current_bpm": 401}).status_code == 422
    assert client.put(url, json={"current_bpm": 20}).status_code == 200
    assert client.put(url, json={"current_bpm": 400}).status_code == 200


def test_progress_for_missing_exercise_returns_404(client: TestClient) -> None:
    response = client.put("/api/v1/exercises/does-not-exist/progress", json={"current_bpm": 90})

    assert response.status_code == 404
    assert response.json()["detail"] == "Exercise not found"


def test_preset_progress_can_be_set_and_is_listed(client: TestClient) -> None:
    preset = _first_preset(client)

    response = client.put(f"/api/v1/exercises/{preset['id']}/progress", json={"current_bpm": 70})

    assert response.status_code == 200
    listed = {item["id"]: item for item in client.get("/api/v1/exercises").json()["items"]}
    assert listed[preset["id"]]["current_bpm"] == 70
    assert all("current_bpm" in item for item in listed.values())
    others = [item for item_id, item in listed.items() if item_id != preset["id"]]
    assert all(item["current_bpm"] is None for item in others)


def test_deleting_exercise_removes_its_progress(client: TestClient) -> None:
    created = _create(client)
    client.put(f"/api/v1/exercises/{created['id']}/progress", json={"current_bpm": 88})
    assert _progress_rows(created["id"]) == 1

    assert client.delete(f"/api/v1/exercises/{created['id']}").status_code == 204

    assert _progress_rows(created["id"]) == 0
