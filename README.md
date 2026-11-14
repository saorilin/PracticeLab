# PracticeLab

PracticeLab is a web application for organizing guitar practice exercises.

## Technology stack

- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI, SQLAlchemy
- Database: SQLite
- Runtime: Docker, Docker Compose, Nginx
- CI: GitHub Actions

## Run with Docker

```bash
docker compose up --build -d --wait

## CI/CD

Scope: continuous integration and publishing container images to GHCR.
Deployment is not automated in this project.

- `pr-ci.yml` – runs on pull requests to `main`; the single required check is `All required checks passed`
- `main-ci.yml` – runs on pushes to `main`; publishes images only after all checks pass
- `build-images.yml` – the only place images are built (build once); passes them on as a run-scoped artifact
- `backend-checks.yml`, `frontend-checks.yml` – source-level checks (format, lint, types, unit tests)
- `docker-integration-checks.yml` – starts the prebuilt images with Compose (`--no-build`) and runs smoke tests
- `publish-images.yml` – pushes the tested images to GHCR (`sha-<commit>` tags)

Dependency updates: Dependabot handles npm, Docker base images and GitHub Actions
(minor/patch/digest only). Python lock files are refreshed manually.