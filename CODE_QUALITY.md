# PracticeLab Code Quality Requirements

These requirements keep the application maintainable while leaving CI/CD ownership to the student.

## Required local checks

### Frontend

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

### Backend

- `ruff format --check .`
- `ruff check .`
- `mypy app`
- `pytest`

## Engineering rules

- Keep UI components, domain logic, and API access separate.
- Extract duplication only when the shared concept is stable and has a clear name.
- Use strict TypeScript and typed Python public interfaces.
- Validate API input at the boundary.
- Never commit secrets or environment-specific credentials.
- A bug fix must include a regression test when practical.
- Interactive UI must be usable by keyboard and expose visible focus states.
- Do not add inactive buttons for future features.

## Definition of Done

A change is done when:

1. The change has one clear purpose.
2. Relevant tests were added or updated.
3. Format, lint, type checking, tests, and production build pass.
4. API or configuration changes are documented.
5. No secret, generated build output, or local database is committed.

The future CI pipeline should execute these existing commands instead of inventing different CI-only behavior.

