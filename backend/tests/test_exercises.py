from fastapi.testclient import TestClient


def custom_payload() -> dict[str, object]:
    return {
        "name": "Clean chord changes",
        "primary_category": "control",
        "difficulty": "beginner",
        "tags": ["chords", "muting"],
        "summary": "Move between two chords without unwanted string noise.",
        "goal": "Keep every transition clean and relaxed.",
        "steps": ["Choose two chords.", "Change on every four beats."],
        "technique_notes": ["Release pressure without leaving the strings."],
        "common_mistakes": ["Rushing before the chord is ready."],
        "min_bpm": 50,
        "max_bpm": 90,
        "target_duration_seconds": 180,
        "target_repetitions": 12,
        "source": None,
        "external_video_url": None,
        "image_url": None,
        "tab_url": None,
    }


def test_lists_seeded_exercises_and_filters(client: TestClient) -> None:
    all_response = client.get("/api/v1/exercises")
    rhythm_response = client.get("/api/v1/exercises", params={"category": "rhythm"})
    search_response = client.get("/api/v1/exercises", params={"query": "muting"})

    assert all_response.status_code == 200
    assert all_response.json()["total"] == 5
    assert rhythm_response.json()["total"] == 1
    assert search_response.json()["total"] >= 1


def test_custom_exercise_crud(client: TestClient) -> None:
    create_response = client.post("/api/v1/exercises", json=custom_payload())
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["is_custom"] is True

    payload = custom_payload()
    payload["name"] = "Cleaner chord changes"
    update_response = client.put(f"/api/v1/exercises/{created['id']}", json=payload)
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Cleaner chord changes"

    delete_response = client.delete(f"/api/v1/exercises/{created['id']}")
    assert delete_response.status_code == 204
    assert client.get(f"/api/v1/exercises/{created['id']}").status_code == 404


def test_preset_exercise_cannot_be_modified(client: TestClient) -> None:
    preset = client.get("/api/v1/exercises").json()["items"][0]

    update_response = client.put(f"/api/v1/exercises/{preset['id']}", json=custom_payload())
    delete_response = client.delete(f"/api/v1/exercises/{preset['id']}")

    assert update_response.status_code == 403
    assert delete_response.status_code == 403


def test_rejects_invalid_bpm_range(client: TestClient) -> None:
    payload = custom_payload()
    payload["min_bpm"] = 140
    payload["max_bpm"] = 80

    response = client.post("/api/v1/exercises", json=payload)

    assert response.status_code == 422
