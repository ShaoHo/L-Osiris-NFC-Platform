# API Endpoints (v1)

All routes are served with the global prefix `/v1`.

## Health

- `GET /v1/health` — service heartbeat.

## Viewer

- `POST /v1/viewer/claim` — claim a viewer session from an NFC tag.
- `POST /v1/viewer/upgrade` — attach a nickname to an existing viewer session.
- `POST /v1/viewer/exhibitions/:exhibitionId/activate` — start or continue an exhibition run.
- `GET /v1/viewer/entry/:publicTagId` — resolve NFC entry (viewer-aware when available).
- `GET /v1/t/:publicTagId/resolve` — resolve NFC entry decision (NFC resolver contract).
- `GET /v1/t/:publicTagId` — legacy NFC entry resolver alias (kept for backward compatibility).

## Gallery

- `GET /v1/gallery` — list public gallery exhibitions.
- `GET /v1/gallery/:id` — gallery exhibition detail + viewer subscription status.

## Curator

> Requires `x-curator-id` header from the curator auth flow.

- `POST /v1/curator/auth/login` — curator login.
- `POST /v1/curator/auth/logout` — curator logout.
- `POST /v1/curator/auth/forgot` — request password reset.
- `POST /v1/curator/auth/reset` — reset password with token.

- `POST /v1/curator/exhibitions` — create an exhibition.
- `PATCH /v1/curator/exhibitions/:exhibitionId` — update exhibition metadata.
- `POST /v1/curator/exhibitions/:exhibitionId/publish` — publish an exhibition.
- `POST /v1/curator/exhibitions/:exhibitionId/archive` — archive an exhibition.

- `PUT /v1/curator/exhibitions/:exhibitionId/days/:dayIndex/draft` — save day draft content.
- `POST /v1/curator/exhibitions/:exhibitionId/days/:dayIndex/publish` — publish day content.
- `POST /v1/curator/exhibitions/:exhibitionId/days/:dayIndex/assets` — add asset metadata.
- `GET /v1/curator/exhibitions/:exhibitionId/versions/:versionId/days` — list day content for a version.

- `POST /v1/curator/exhibitions/:exhibitionId/ai/generate` — queue AI draft generation.

## Admin

> Requires admin basic auth (see `AdminAuthGuard`).

- `POST /v1/admin/exhibitions/:exhibitionId/force-unpublish` — queue force-unpublish action.
- `POST /v1/admin/curators/:curatorId/suspend` — queue curator suspension.
- `POST /v1/admin/exhibitions/:exhibitionId/governance/enable` — queue governance policy enablement.
- `POST /v1/admin/exhibitions/:exhibitionId/delete` — soft-delete exhibition.
- `POST /v1/admin/exhibitions/:exhibitionId/restore` — restore soft-deleted exhibition.
- `POST /v1/admin/exhibitions/:exhibitionId/purge` — purge exhibition after retention.

- `POST /v1/admin/actions/:actionId/confirm` — confirm an admin action.
- `POST /v1/admin/actions/:actionId/execute` — execute an admin action.
- `POST /v1/admin/actions/:actionId/cancel` — cancel an admin action.

- `POST /v1/admin/access-grants` — issue access grant.
- `POST /v1/admin/access-grants/:grantId/revoke` — revoke access grant.
- `POST /v1/admin/curators/:curatorId/policy` — queue curator NFC scope policy update.

- `POST /v1/admin/exhibitions/:exhibitionId/days/:dayIndex/drafts` — queue AI draft generation (admin).
- `PATCH /v1/admin/exhibitions/:exhibitionId/days/:dayIndex/draft` — edit day draft.
- `GET /v1/admin/exhibitions/:exhibitionId/days/:dayIndex/draft` — fetch day draft.
- `GET /v1/admin/exhibitions/:exhibitionId/days/:dayIndex/published` — fetch published day.
- `POST /v1/admin/exhibitions/:exhibitionId/days/:dayIndex/publish` — publish day (creates new version).

- `POST /v1/admin/exhibitions/:exhibitionId/ai/generate` — queue AI draft generation.

## Payments

- `POST /v1/payments/checkout-session` — create a checkout session.
- `POST /v1/payments/webhook` — Stripe webhook handler.

## Internal Admin (restricted)

> Requires allowlisted IP and `x-internal-otp` header.

- `POST /v1/internal/admin/curators/:curatorId/suspend` — queue curator suspension.
- `POST /v1/internal/admin/curators/:curatorId/unsuspend` — queue curator unsuspension.
- `POST /v1/internal/admin/exhibitions/:exhibitionId/transfer` — queue exhibition ownership transfer.

## Dev Utilities

> Only available in development (`APP_ENV=dev` or `NODE_ENV=development`).

- `POST /v1/dev/seed` — seed dev data.
