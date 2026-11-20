# CLAUDE.md — PracticeLab

PracticeLab is a web app for organising guitar practice (exercises, metronome, interval trainer).
The maintainer uses it for real practice, so features should solve real practice needs.

This repository has a second purpose: it is the test subject for its own CI/CD pipeline.
Every feature is delivered through a pull request so that the pipeline is exercised on real changes.

## Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy, SQLite, pydantic-settings — `backend/`
- Frontend: React, TypeScript, Vite, Vitest, Biome — `frontend/`
- Containers: `backend/Dockerfile`, `frontend/Dockerfile` (multi-stage, Nginx), `docker-compose.yml`
- CI: GitHub Actions in `.github/workflows/` (PR CI and Main CI), images published to GHCR

API routes live under `/api/v1`. The frontend always calls the API with the **relative** path `/api/v1`
(Vite proxies it in development, Nginx in containers). Never introduce an absolute API URL:
the same image must run in every environment.

## Commands

Backend (run from `backend/`):

```bash
python -m pip install --require-hashes -r requirements-dev.lock
python -m pip install --no-deps .
python -m ruff format --check .
python -m ruff check .
python -m mypy app
python -m pytest            # coverage must stay >= 80 %
python -m uvicorn app.main:app --reload   # dev server on :8000
```

Frontend (run from `frontend/`):

```bash
npm ci
npm run format:check        # Biome
npm run lint                # Biome
npm run typecheck
npm run test:coverage       # Vitest
npm run build
npm run dev                 # dev server on :5173, proxies /api to :8000
```

Whole app in containers (repo root):

```bash
docker compose up --build -d --wait   # http://localhost:8080
docker compose down -v
```

Integration tests (repo root). The suite in `integration/` is black-box and talks HTTP through
Nginx only. Run it against an isolated Compose project so the maintainer's own stack, data volume
and `:local` images are never touched; compare `docker images` IDs of `practicelab-*:local`
before and after:

```bash
export COMPOSE_PROJECT_NAME=practicelab-it
export BACKEND_IMAGE=practicelab-backend:it-test
export FRONTEND_IMAGE=practicelab-frontend:it-test
export FRONTEND_PORT=8082
docker compose up --build -d --wait
BASE_URL=http://localhost:8082 python -m pytest integration
docker compose down -v          # only practicelab-it
docker image rm practicelab-backend:it-test practicelab-frontend:it-test
```

Before saying a task is done, run every check for the part you changed and report the results.

## Definition of done for a feature

1. **Unit tests are mandatory** for every new or changed behaviour.
   - Backend: pure logic gets plain pytest tests without the `client` fixture.
   - Frontend: colocated `*.test.ts` / `*.test.tsx` next to the code, using Vitest.
2. **Integration tests when the change crosses a boundary**:
   - a new or changed API endpoint, request/response schema or database model →
     a pytest test using the `client` fixture (`backend/tests/conftest.py` gives a TestClient
     with a temporary, seeded SQLite database);
   - a change in how the frontend talks to the API → a test in `frontend/src/lib/api.test.ts`
     style that checks the request and the response handling;
   - a change that affects container start-up, Nginx routing, Compose or runtime configuration →
     add or update a test in `integration/`, which runs in the Docker integration check in CI.
3. Every test must be able to fail. When you add a test, state what change in the code would
   make it fail.
4. Frontend coverage thresholds only apply to files listed in `coverage.include` in
   `frontend/vite.config.ts`. When you add a new module with logic under `src/lib/`, add it there.
5. All checks above pass locally.

## Git and pull requests

- Never commit to or push to `main`. `main` is protected; the only required check is
  `All required checks passed`.
- One feature or fix per branch and per PR. Branch names: `feat/…`, `fix/…`, `test/…`, `refactor/…`.
- Conventional commit messages (`feat: …`, `fix: …`, `test: …`).
- Do not merge pull requests. The maintainer reviews and merges.
- PR description must contain: what changed, which tests were added (unit / integration),
  how to verify by hand, and a **CI observations** section (see below).

## Files that need explicit permission

The pipeline is the system under test, so these files are not changed as a side effect of a feature.
Ask first, and put such changes in a separate `ci/…` or `build/…` PR:

- `.github/workflows/*`, `.github/dependabot.yml`
- `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml`
- `backend/requirements.lock`, `backend/requirements-dev.lock` (never edit by hand; the maintainer
  regenerates them with pip-tools and hashes)
- dependency lists in `backend/pyproject.toml` and `frontend/package.json`

Never read, print or change `.env`, `.env.deploy` or any other secret file.

## Never weaken the checks

Do not skip or delete failing tests, lower coverage thresholds, add `# noqa`, `# type: ignore`,
`biome-ignore` or `continue-on-error` to get a green result. If a check seems wrong, stop and explain
why instead of working around it.

## CI observations

When CI fails or behaves unexpectedly on a PR, do not change the workflow to make it pass.
Record in the PR description:

- the job and step that failed, with a short log excerpt;
- whether the failure was expected (the code was wrong) or unexpected (possible pipeline problem);
- the commit SHA.

Unexpected pipeline behaviour is useful data for the maintainer; report it instead of hiding it.

## Code style

- Python: Ruff (line length 100), mypy in strict mode, type hints everywhere.
- TypeScript: strict mode, Biome formatting and linting.
- Keep Python 3.11 and Node.js 24 in sync between the workflows and the Dockerfiles.
- Configuration comes from environment variables with defaults in code; no hard-coded ports or URLs.
