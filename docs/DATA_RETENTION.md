# Data Retention & Soft Deletes

## Overview
- Core records are soft-deleted by setting `deletedAt` and scheduling `purgeAfter`.
- A BullMQ worker (`SoftDeletePurgeService`) runs hourly to purge records whose
  `purgeAfter` has passed.
- Some categories are explicitly excluded from purge to satisfy compliance
  and finance requirements.

## Soft Delete Helpers
Use the shared helpers in `apps/api/src/utils/soft-delete.ts` to:
- Create consistent `deletedAt`/`purgeAfter` values.
- Apply a default retention window (30 days) unless a custom window is provided.

## Purge Worker Exclusions
The purge worker skips the following records:
- `AuditLog` entries (must be retained for compliance and auditability).
- Financial records (currently `AccessGrant`, since it is tied to paid access).

If additional financial models are introduced, add them to the excluded list
in `SoftDeletePurgeService`.
