import httpx


def _assert_spa_index(response: httpx.Response) -> None:
    assert response.status_code == 200, response.text[:300]
    assert response.headers["content-type"].startswith("text/html")
    body = response.text.lower()
    assert "<!doctype html" in body
    assert '<div id="root">' in body


def test_frontend_serves_index_html(client: httpx.Client) -> None:
    _assert_spa_index(client.get("/"))


def test_backend_health_through_nginx(client: httpx.Client) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json()["status"] == "ok"


def test_unknown_spa_path_falls_back_to_index_html(client: httpx.Client) -> None:
    # Covers `try_files $uri $uri/ /index.html` in frontend/nginx.conf: client-side routes
    # must load the SPA instead of returning an Nginx 404.
    _assert_spa_index(client.get("/exercises/does-not-exist"))
