# Architecture Overview

## Monorepo
- apps/api: NestJS REST API
- packages/: shared packages (contracts, utils) - WIP
- docker-compose.yml: local Postgres + Redis

## API
- Global prefix: `/v1`
- Healthcheck: `GET /v1/health`

## Data Layer
- PostgreSQL as primary database
- Prisma as ORM/migrations tool

## Near-term Roadmap
- M1: domain models + seed + viewer activation flow
- M2+: curator dashboard, super portal, billing/settlement, queue jobs
