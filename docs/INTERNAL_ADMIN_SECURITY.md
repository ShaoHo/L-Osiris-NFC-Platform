# Internal Admin Security

This document describes the internal-only admin endpoints protected by an IP allowlist and an OTP placeholder.

## Guarding model

The internal endpoints are protected by `InternalAdminGuard` and expect two layers of defense:

1. **IP allowlist**
   - `INTERNAL_ADMIN_IP_ALLOWLIST` is a comma-separated list of IP addresses.
   - If the variable is **unset**, the guard defaults to `127.0.0.1` and `::1` only.
   - Requests must originate from one of these IPs (the first value from `x-forwarded-for` is used when present).

2. **OTP placeholder**
   - The guard requires an `x-internal-otp` header.
   - If `INTERNAL_ADMIN_OTP` is set, the header must match exactly.
   - If `INTERNAL_ADMIN_OTP` is unset, any non-empty value is accepted (placeholder behavior).

> These controls are intentionally minimal; replace the OTP placeholder with real OTP validation before exposing these endpoints.

## Internal admin endpoints

All endpoints are under `/internal/admin` and create `AdminAction` rows plus `AuditLog` entries. Use the normal `/admin/actions/:id/confirm` and `/admin/actions/:id/execute` flow to finalize actions.

### Curator suspension

- `POST /internal/admin/curators/:curatorId/suspend`
  - Body: `{ "requestedBy": "email@domain", "reason": "..." }`
  - Admin action: `SUSPEND_CURATOR`

- `POST /internal/admin/curators/:curatorId/unsuspend`
  - Body: `{ "requestedBy": "email@domain" }`
  - Admin action: `UNSUSPEND_CURATOR`

### Exhibition ownership transfer

- `POST /internal/admin/exhibitions/:exhibitionId/transfer`
  - Body: `{ "requestedBy": "email@domain", "toCuratorId": "curator_id", "reason": "..." }`
  - Admin action: `TRANSFER_EXHIBITION_OWNERSHIP`

## Admin UI

The internal admin UI is now provided by the Next.js app in `apps/curator-admin-internal`.
It authenticates against the main admin API (not these internal endpoints), so keep the
internal-only routes gated behind `InternalAdminGuard` for ops workflows.
