# Contributing

## Branching
- main: always runnable/deployable
- feat/*: feature branches
- fix/*: bugfix branches

## Commit Convention
Use Conventional Commits:
- feat(scope): ...
- fix(scope): ...
- chore(scope): ...
- docs: ...

## Local Dev
```bash
pnpm install
docker compose up -d
pnpm --dir apps/api start:dev
