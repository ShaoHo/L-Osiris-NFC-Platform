# L-Osiris NFC Exhibition Platform

The **L-Osiris NFC Exhibition Platform** is a monorepo that powers NFC-driven, time-bounded exhibitions. It includes a NestJS API, background workers for AI draft generation and marketing sync, and shared infra (Postgres + Redis) for local development.

---

## Contents

- [Repo Structure](#repo-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Database & Migrations](#database--migrations)
- [Queues & Workers](#queues--workers)
- [Testing](#testing)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Repo Structure

```
.
├── apps/
│   ├── api/                  # NestJS API (Prisma, BullMQ)
│   ├── worker-ai/            # AI generation worker
│   └── worker-mautic/        # Marketing outbox worker (Mautic sync)
├── packages/                 # Shared packages (contracts/utils, WIP)
├── docker-compose.yml        # Local Postgres + Redis
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Tech Stack

- **Backend**: NestJS (`apps/api`)
- **Database**: PostgreSQL (via Docker Compose)
- **Queue / Cache**: Redis (via Docker Compose)
- **ORM**: Prisma
- **Workers**: BullMQ
- **Package Manager**: pnpm

---

## Prerequisites

- **Node.js** (recommended ≥ 20)
- **pnpm** (≥ 8)
- **Docker Desktop**

---

## Environment Configuration

Create an API environment file at `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/losiris?schema=public
REDIS_URL=redis://localhost:6379
APP_ENV=development
```

Optional root `.env` is also supported.

---

## Local Development

### 1) Install dependencies

```bash
pnpm install
```

### 2) Start Postgres + Redis

```bash
docker compose up -d
docker compose ps
```

### 3) Generate Prisma client

```bash
pnpm --dir apps/api prisma:generate
```

### 4) Run migrations

```bash
pnpm --dir apps/api db:migrate
```

### 5) Start API

```bash
pnpm --dir apps/api start:dev
```

### 6) Health check

```bash
curl http://localhost:3001/v1/health
```

---

## Database & Migrations

- Prisma schema lives in `apps/api/prisma/schema.prisma`.
- Migrations live in `apps/api/prisma/migrations/`.

### Apply migrations (dev)

```bash
pnpm --dir apps/api db:migrate
```

### Apply migrations (deploy)

```bash
pnpm --dir apps/api db:deploy
```

---

## Queues & Workers

### AI Worker

```bash
pnpm --dir apps/worker-ai dev
```

### Marketing Outbox Worker

```bash
pnpm --dir apps/worker-mautic dev
```

Both workers require the same `DATABASE_URL` and `REDIS_URL` values as the API.

---

## Testing

### Run API tests

```bash
pnpm --dir apps/api test
```

### Run all workspace tests

```bash
pnpm test
```

---

## Common Tasks

### Build API

```bash
pnpm --dir apps/api build
```

### Run API (production)

```bash
pnpm --dir apps/api start:prod
```

### Prisma Studio

```bash
pnpm --dir apps/api db:studio
```

---

## Troubleshooting

- **Prisma client not generated**: run `pnpm --dir apps/api prisma:generate`.
- **Redis connection errors**: ensure `REDIS_URL` is set and `docker compose` is running.
- **Database connection errors**: confirm `DATABASE_URL` is correct and Postgres is running.

---

## License

UNLICENSED (internal use only).
