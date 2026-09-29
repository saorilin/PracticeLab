# PracticeLab MVP Implementation Status

## Implemented

- Responsive navigation and jazz-inspired visual system.
- Home page with entry points to both product modules.
- Metronome with BPM, tap tempo, time signature, subdivisions, first-beat accent, volume, start, stop, and reset.
- Interval trainer with configurable interval set, replay, next, reset, score, and accuracy.
- Five exercise categories and five preset exercises.
- Exercise search and category or difficulty filtering.
- Exercise detail page with goal, steps, notes, mistakes, targets, tags, and reference link.
- Create, edit, and delete for custom exercises.
- FastAPI health check at `/api/v1/health`.
- Local SQLite persistence with configurable `DATABASE_URL`.
- Automated frontend and backend tests with an 80 percent coverage gate for testable domain logic.
- Formatter, linter, strict type checking, and production build commands.

## Deliberately deferred

- Accounts and multiple users.
- Daily practice plans, sessions, history, and analytics.
- Audio or video upload.
- AI evaluation.
- Dockerfiles and Docker Compose.
- GitHub Actions workflows, registry publishing, and deployment.

## Next student-owned delivery steps

1. Run every documented check locally and understand what failure each check prevents.
2. Create the first pull-request workflow without deployment.
3. Add Docker only after the non-container build is reproducible.
4. Decide when to introduce PostgreSQL as an integration-test service.

