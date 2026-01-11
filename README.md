# L-Osiris NFC Platform

Monorepo for L-Osiris NFC Platform using pnpm workspaces and Turborepo.

## Architecture

- **apps/api**: NestJS API with global prefix `/v1`
- **apps/worker-ai**: AI worker service
- **apps/worker-mautic**: Mautic integration worker service
- **apps/curator-admin-internal**: Internal admin/curator service
- **packages/contracts**: Shared contracts (OpenAPI specs, event schemas)

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start infrastructure services (PostgreSQL + Redis):
```bash
docker compose up -d
```

## Development

Run all apps in development mode:
```bash
pnpm dev
```

Run specific app:
```bash
pnpm --filter @app/api dev
pnpm --filter @app/worker-ai dev
pnpm --filter @app/worker-mautic dev
pnpm --filter @app/curator-admin-internal dev
```

## API Endpoints

- `GET /v1/health` - Health check endpoint
- `GET /v1/viewer/entry/:publicTagId` - Get viewer entry by public tag ID

## Build

```bash
pnpm build
```

## Testing

```bash
pnpm test
```

## Linting

```bash
pnpm lint
```