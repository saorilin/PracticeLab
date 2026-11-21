"""Fixtures for the Docker integration suite.

The suite is black-box: it never imports from ``backend/app`` and sends every request
through Nginx (``BASE_URL``), exactly like the browser does.
"""

import os
import time
import uuid
from collections.abc import Callable, Iterator
from typing import Any

import httpx
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
REQUEST_TIMEOUT_SECONDS = 10.0
READY_TIMEOUT_SECONDS = 30.0
READY_POLL_INTERVAL_SECONDS = 1.0
HEALTH_PATH = "/api/v1/health"
EXERCISES_PATH = "/api/v1/exercises"

JsonDict = dict[str, Any]


@pytest.fixture(scope="session")
def client() -> Iterator[httpx.Client]:
    # Explicit timeout: a hung request fails after 10 s instead of the 15-minute job timeout.
    with httpx.Client(base_url=BASE_URL, timeout=REQUEST_TIMEOUT_SECONDS) as http_client:
        yield http_client


@pytest.fixture(scope="session", autouse=True)
def stack_is_ready(client: httpx.Client) -> None:
    """Wait once, before the first test, until the API answers through Nginx.

    Individual tests never retry. If the stack does not become healthy, every test errors
    with the same message instead of each one waiting again.
    """
    deadline = time.monotonic() + READY_TIMEOUT_SECONDS
    last_problem = "no response yet"
    while True:
        try:
            response = client.get(HEALTH_PATH, timeout=min(3.0, REQUEST_TIMEOUT_SECONDS))
            if response.status_code == 200 and response.json().get("status") == "ok":
                return
            last_problem = f"HTTP {response.status_code}: {response.text[:200]!r}"
        except (httpx.HTTPError, ValueError) as error:
            last_problem = f"{type(error).__name__}: {error}"
        if time.monotonic() >= deadline:
            pytest.fail(
                f"Stack at BASE_URL={BASE_URL} did not become healthy within "
                f"{READY_TIMEOUT_SECONDS:.0f} s (GET {HEALTH_PATH} through Nginx). "
                f"Last result: {last_problem}",
                pytrace=False,
            )
        time.sleep(READY_POLL_INTERVAL_SECONDS)


def build_exercise_payload(**overrides: Any) -> JsonDict:
    """A payload that is valid both on main and after PR #61 (F2).

    Only fields accepted by both schemas are used; no BPM fields are sent.
    """
    payload: JsonDict = {
        "name": f"Integration exercise {uuid.uuid4().hex[:8]}",
        "primary_category": "control",
        "difficulty": "beginner",
        "tags": ["integration-test"],
        "summary": "Created by the Docker integration suite.",
        "goal": "Prove the API works through Nginx.",
        "steps": ["Send one request."],
        "technique_notes": ["Delete it afterwards."],
        "common_mistakes": ["Leaving test data behind."],
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def exercise_payload() -> Callable[..., JsonDict]:
    return build_exercise_payload


@pytest.fixture
def create_exercise(client: httpx.Client) -> Iterator[Callable[..., JsonDict]]:
    """Create exercises via the API and delete them in teardown, even if the test fails.

    A 404 on teardown is fine: the test may already have deleted the exercise.
    """
    created_ids: list[str] = []

    def _create(**overrides: Any) -> JsonDict:
        response = client.post(EXERCISES_PATH, json=build_exercise_payload(**overrides))
        assert response.status_code == 201, response.text
        created: JsonDict = response.json()
        created_ids.append(created["id"])
        return created

    yield _create

    problems: list[str] = []
    for exercise_id in created_ids:
        try:
            response = client.delete(f"{EXERCISES_PATH}/{exercise_id}")
        except httpx.HTTPError as error:
            problems.append(f"{exercise_id}: {type(error).__name__}: {error}")
            continue
        if response.status_code not in (204, 404):
            problems.append(f"{exercise_id}: HTTP {response.status_code} {response.text[:200]}")
    if problems:
        pytest.fail("Cleanup of test exercises failed: " + "; ".join(problems), pytrace=False)
