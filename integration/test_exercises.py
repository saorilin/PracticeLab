from collections.abc import Callable
from typing import Any

import httpx

EXERCISES_PATH = "/api/v1/exercises"
JsonDict = dict[str, Any]


def test_exercise_crud_through_nginx(
    client: httpx.Client,
    create_exercise: Callable[..., JsonDict],
    exercise_payload: Callable[..., JsonDict],
) -> None:
    created = create_exercise(name="Integration CRUD exercise")
    exercise_url = f"{EXERCISES_PATH}/{created['id']}"
    assert created["name"] == "Integration CRUD exercise"
    assert created["is_custom"] is True

    read = client.get(exercise_url)
    assert read.status_code == 200
    assert read.json()["id"] == created["id"]
    assert read.json()["summary"] == "Created by the Docker integration suite."

    updated = client.put(exercise_url, json=exercise_payload(name="Integration CRUD updated"))
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Integration CRUD updated"
    assert client.get(exercise_url).json()["name"] == "Integration CRUD updated"

    deleted = client.delete(exercise_url)
    assert deleted.status_code == 204

    assert client.get(exercise_url).status_code == 404


def test_create_without_name_is_rejected(
    client: httpx.Client, exercise_payload: Callable[..., JsonDict]
) -> None:
    payload = exercise_payload()
    del payload["name"]

    response = client.post(EXERCISES_PATH, json=payload)

    assert response.status_code == 422
    missing = [error["loc"] for error in response.json()["detail"]]
    assert ["body", "name"] in missing
