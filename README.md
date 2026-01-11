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
pnpm --filter api start:dev
pnpm --filter @app/worker-ai dev
pnpm --filter @app/worker-mautic dev
pnpm --filter @app/curator-admin-internal dev
```

## API Endpoints

### Health
- `GET /v1/health` - Health check endpoint

### Viewer Flow (curl examples)

1. **Claim a tag** - Create a viewer profile and session:
```bash
curl -X POST http://localhost:3001/v1/viewer/claim \
  -H "Content-Type: application/json" \
  -d '{"publicTagId": "tg_test123", "nickname": "Test User"}'
```

Response includes `sessionToken` - save this for subsequent requests.

2. **Activate an exhibition**:
```bash
curl -X POST http://localhost:3001/v1/viewer/exhibitions/exh_test123/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <sessionToken>" \
  -d '{"mode": "RESTART"}'
```

3. **Get entry** (with auth):
```bash
curl http://localhost:3001/v1/viewer/entry/tg_test123 \
  -H "Authorization: Bearer <sessionToken>"
```

Or without auth (returns requiresClaim):
```bash
curl http://localhost:3001/v1/viewer/entry/tg_test123
```

### Development

**Seed test data** (development only):
```bash
curl -X POST http://localhost:3001/v1/dev/seed
```

This creates:
- Exhibition `exh_test123`
- NFC tag `tg_test123` bound to the exhibition
- Placeholder exhibit for day 1

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