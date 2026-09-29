# PracticeLab Architecture

## Runtime view

```text
Browser
  |
  | React routes and Web Audio API
  | REST requests under /api/v1
  v
FastAPI
  |
  | SQLAlchemy session
  v
SQLite in local development
```

The frontend and backend are separate applications so the delivery pipeline can test, build, and deploy them independently. Vite proxies `/api` requests to FastAPI during local development.

## Frontend responsibilities

- Render Home, Tools, Exercise Library, detail, and editor routes.
- Run the metronome and interval trainer in the browser with the Web Audio API.
- Validate required HTML form fields and present API failures.
- Keep calculation logic in `src/lib` so it can be tested without the UI.

## Backend responsibilities

- Validate exercise payloads with Pydantic.
- Enforce the rule that preset exercises cannot be edited or deleted.
- Search and filter exercises.
- Persist custom exercises.
- Expose a lightweight health endpoint for future deployment checks.

## Database choice

SQLite keeps the first development stage easy to run. `DATABASE_URL` is configuration rather than hard-coded infrastructure, so a later stage can introduce PostgreSQL and integration tests without changing the frontend contract.

The database file is runtime state and is excluded from Git. Preset exercises are idempotently inserted by slug during application startup.

## CI/CD contract

The application exposes commands that a future pipeline can orchestrate:

```text
frontend: format -> lint -> typecheck -> test -> build
backend:  format -> lint -> typecheck -> test
runtime:  start API -> call /api/v1/health
```

No workflow, container image, registry, or deployment configuration is included yet. Those remain the learning deliverables of the CI/CD project.

