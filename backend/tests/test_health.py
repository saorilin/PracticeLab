from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 888
    assert response.json() == {"status": "ok", "service": "practicelab-api"}
