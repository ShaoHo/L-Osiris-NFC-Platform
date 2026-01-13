# NEXT STEPS EXECUTION PLAN

## Mandatory Repo State Review (Summary)

Reviewed the following files and current behaviors:

- `apps/api/prisma/schema.prisma`: Core models for NFC tags, Curator, CuratorPolicy, Exhibition, ExhibitionVersion/Run, ViewerSession/Profile, AccessGrant, AdminAction, AuditLog, AI jobs, marketing outbox, etc. Soft-delete fields and governance fields are present.
- `apps/api/src/viewer/viewer.controller.ts`: Viewer claim/upgrade/activate flows; activation creates versions/runs for RESTART and CONTINUE.
- `apps/api/src/viewer/viewer-entry.controller.ts` + `viewer-entry.service.ts`: Fixed URL entry resolution, day index computation, render flow.
- `apps/api/src/access/access-policy.service.ts` + `access-grant.service.ts`: Governance lockdown checks, grant-required logic for monetized or non-public exhibitions.
- `apps/worker-ai/src/index.js`: BullMQ worker uses PrismaPg adapter, creates DRAFT day content with sanitize-html, marks AI job status.
- `apps/worker-mautic/src/index.js`: BullMQ worker syncs marketing outbox to Mautic; strict env validation.
- `docs/ARCHITECTURE.md` and `README.md`: baseline architecture and local setup.

## Execution Plan (Immediate, PRD-Driven)

1. **CI + Toolchain**: Verify CI Node version (>=20.19), .npmrc token handling, Prisma adapter consistency and env errors.
2. **Curator Auth**: Add curator login/forgot/reset/logout endpoints, validation, and tests.
3. **Curator Permissions**: Enforce STANDARD vs CREATOR tier restrictions with guards/validators; add tests.
4. **Exhibition CRUD + Versioning**: Create/update/publish/archive with immutable versions and audit logs.
5. **Gallery**: Public gallery list/detail with lockdown enforcement and tests.
6. **Payments/Access Grants**: Stripe Connect checkout + webhook handling, grant issuance/expiry enforcement, tests.
7. **Governance/AdminAction**: Super account governance, AdminAction request-confirm-execute + audits, curator suspension enforcement.
8. **Retention/Purge**: Soft-delete helpers and purge job with exemptions for audit/financial records; document policy.
9. **AI Generation Pipeline**: Curator-triggered asset upload + job enqueue, worker-ai batch handling, sanitization/CSP documentation.
10. **Internal Admin Skeleton**: Internal admin guards, lifecycle management, ownership transfer, security docs.
11. **Docs/Test Quality Gates**: Update README and docs; add endpoint inventory; ensure tests for every new endpoint.

## Assumptions

- Curator authentication is initially sessionless (login returns identity only); a token-backed session model will be added when curator-facing UI is integrated.
- Stripe Connect integration requires new environment variables and webhook endpoints that are not yet wired in the current codebase.
- AI generation output remains sanitized static HTML/CSS only, with CSP enforcement handled on the frontend viewer app (to be confirmed).

## PRD Comparison Table (Sections 1–9)

| PRD Area | Status | Notes |
| --- | --- | --- |
| 1. Purpose & Core Principles | Partial | Architecture aligns; platform-wide enforcement incomplete. |
| 2. Core Design Principles | Partial | Version immutability partially present; governance enforcement partial. |
| 3. Glossary & Concepts | Partial | Models exist; not fully enforced across flows. |
| 4. Roles & Access Tiers | Partial | Curator tier field exists; enforcement incomplete. |
| 4.1 Viewer | Partial | Viewer session/upgrade implemented; payments/subscriptions missing. |
| 4.2 Curator | Partial | Tiered capabilities not fully enforced; auth incomplete. |
| 4.3 Super Account | Partial | AdminAction + curator policy endpoints exist; coverage incomplete. |
| 4.4 Curator Admin (Internal) | Not Started | Placeholder app only. |
| 5. Viewer × Exhibition Model | Partial | Activate/run/version flow exists; grant enforcement partial. |
| 6. Exhibition Structure & Time | Partial | Models exist; curator CRUD/versioning incomplete. |
| 7. AI-Generated Content | Partial | Worker generates drafts; curator-triggered flow incomplete. |
| 8. NFC Governance Policies | Partial | Lockdown checks implemented in access policy. |
| 9. Gallery | Partial | List endpoint exists; detail/preview missing; lockdown enforcement present. |
| 10. Payment/Subscription | Not Started | No Stripe or AccessGrant issuance on payment. |
| 11. Governance/High-Risk Actions | Partial | AdminAction flow exists; safeguards not fully wired. |
| 12. Data Retention/Deletion | Partial | Soft delete in Prisma; purge job incomplete. |
| 13. Technical Architecture | Partial | Matches but missing payment/AI orchestration. |
| 14. Out of Scope | Complete | No conflicting scope observed. |
| 15. Closing Statement | Partial | Governance + audit goals not fully implemented. |
