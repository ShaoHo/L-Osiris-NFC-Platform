# L-Osiris NFC Platform

Monorepo for the **L-Osiris NFC-enabled leather goods platform**.

This repository contains the backend API, shared packages, and local infrastructure setup required to develop and run the platform.

---

## Tech Stack

- **API**: NestJS (`apps/api`)
- **Database**: PostgreSQL (via Docker Compose)
- **Cache / Queue**: Redis (via Docker Compose)
- **ORM**: Prisma
- **Package Manager**: pnpm
- **Runtime**: Node.js

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** (recommended ≥ 20)
- **pnpm**
- **Docker Desktop**

---

## Repository Structure
.
├── apps/
│ └── api/ # NestJS API
├── packages/ # Shared packages (contracts/utils, WIP)
├── docker-compose.yml # Local Postgres + Redis
└── README.md


---

## Local Development Setup

### 1. Install Dependencies

```bash
pnpm install

2. Start Infrastructure (Postgres + Redis)
docker compose up -d
docker compose ps


3. Environment Variables

Root env (optional): .env
API env: apps/api/.env

Example apps/api/.env:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/losiris?schema=public

4. Prisma (Generate & Migrate)
pnpm --filter ./apps/api prisma:generate
pnpm --filter ./apps/api db:migrate --name init_m1

5. Run API (Development Mode)
pnpm --dir apps/api start:dev

6. Health Check
Verify the API is running:
curl http://localhost:3001/v1/health

Expected response: OK

7. Useful Commands
Build API
pnpm --dir apps/api build

Run API (Production Mode)
pnpm --dir apps/api start:prod

Prisma Studio
pnpm --filter ./apps/api db:studio