# PracticeLab

PracticeLab is a guitar practice application with two focused modules:

- **Practice Tools:** a metronome and interval ear trainer.
- **Exercise Library:** searchable exercises plus CRUD operations for custom exercises.

The application is intentionally prepared for a student-owned CI/CD pipeline. This repository does not include Dockerfiles or GitHub Actions workflows yet.

Project documentation:

- [Architecture](docs/ARCHITECTURE.md)
- [MVP implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Code quality requirements](CODE_QUALITY.md)

## Architecture

```text
React + TypeScript frontend
          |
          | REST / JSON
          v
FastAPI backend
          |
          v
SQLite locally (DATABASE_URL is configurable)
```

## Local development

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

Depedencies in 'pyproject.toml'

Backend: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/api/v1/health`

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Verification commands

### Backend

```powershell
cd backend
ruff format --check .
ruff check .
mypy app
pytest
```

### Frontend

```powershell
cd frontend
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

These commands are deliberately independent so they can later become CI jobs or steps.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./data/practicelab.db` | Backend database connection |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed browser origins |
| `VITE_API_BASE_URL` | `/api/v1` | Frontend API base URL |

## Scope boundaries

Not included in MVP: accounts, daily plans, practice history, media uploads, AI feedback, Docker, deployment, or CI/CD configuration.
