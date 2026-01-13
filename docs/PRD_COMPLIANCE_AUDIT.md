# PRD Compliance Audit Checklist

> **Status key:** PASS = fully implemented and validated; PARTIAL = implemented but missing enforcement/coverage; FAIL = not implemented.
>
> **Source of requirements:** This checklist is derived from the PRD section headings referenced in `docs/NEXT_STEPS_EXECUTION.md`, plus the execution plan and existing system documentation.

## 1. Purpose & Core Principles

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| NFC-driven exhibition platform supports time-bounded exhibitions | PASS | `README.md` overview; `apps/api/prisma/schema.prisma` Exhibition/Run/Version models | — |
| NFC tag binding to exhibitions | PASS | `apps/api/prisma/schema.prisma` (`NfcTag.boundExhibitionId`) | — |
| Governance masking/lockdown for restricted exhibitions | PARTIAL | `apps/api/src/access/access-policy.service.ts` (`canAccessExhibition`) | Enforce masking/lockdown consistently across all exhibition/viewer endpoints (not only access policy checks). |
| Auditability for critical actions | PARTIAL | `apps/api/prisma/schema.prisma` (`AuditLog`); `apps/api/src/admin/admin-action.controller.ts` writes audit logs | Expand audit logging coverage for curator actions, exhibition CRUD, and payments. |

## 2. Core Design Principles

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Immutable exhibition versions per activation/publish | PARTIAL | `apps/api/prisma/schema.prisma` (`ExhibitionVersion`); `apps/api/src/viewer/viewer.controller.ts` (create version on activate/restart) | Add curator-driven publish workflow that locks versions, enforce immutability on updates. |
| Separation of viewer sessions vs. viewer identity | PASS | `apps/api/prisma/schema.prisma` (`ViewerSession`, `ViewerProfile`) | — |
| Soft-delete and retention controls | PARTIAL | `apps/api/prisma/schema.prisma` (`deletedAt`, `purgeAfter`); `apps/api/src/jobs/soft-delete-purge.service.ts`; `docs/DATA_RETENTION.md` | Ensure soft-delete helpers are used across all mutations; finalize purge exclusions and retention windows. |

## 3. Glossary & Concepts

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Core domain models (Curator, Viewer, Exhibition, Tag, Grant) | PASS | `apps/api/prisma/schema.prisma` models | — |
| Concept definitions reflected in API docs | PARTIAL | `docs/API.md` exists but does not enumerate all core domain concepts | Add explicit glossary section and endpoint mapping in `docs/API.md`. |

## 4. Roles & Access Tiers

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Curator tiers (STANDARD vs CREATOR) present | PASS | `apps/api/prisma/schema.prisma` (`Curator.tier`) | — |
| Tier restrictions enforced in API | FAIL | No enforcement guard found in API controllers/services | Implement tier-based capability checks on curator endpoints. |
| Curator suspension enforcement | PARTIAL | `apps/api/src/auth/curator-auth.service.ts` blocks login when suspended | Enforce suspension in curator APIs beyond login (CRUD and publishing). |

### 4.1 Viewer Role

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Viewer claim/upgrade flow | PASS | `apps/api/src/viewer/viewer.controller.ts` (`claim`, `upgrade`) | — |
| Viewer activation flow for exhibitions | PASS | `apps/api/src/viewer/viewer.controller.ts` (`activate`) | — |
| Viewer payment/subscription entitlement | PARTIAL | `apps/api/src/payments/payments.service.ts` (mock checkout + grant issuance) | Integrate real Stripe checkout/session creation, webhook validation, and subscription lifecycle management. |

### 4.2 Curator Role

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Curator authentication (login/reset) | PARTIAL | `apps/api/src/auth/curator-auth.service.ts` provides validation/reset but no controller endpoints | Add HTTP endpoints for login/forgot/reset/logout and session handling. |
| Curator CRUD for exhibitions | PASS | `apps/api/src/curator/curator-exhibition.controller.ts`; `apps/api/src/curator/curator-exhibition.service.ts` | — |
| Curator AI generation initiation | PASS | `apps/api/src/curator/curator-exhibition-ai.controller.ts`; `apps/api/src/jobs/ai-generation.service.ts` | — |

### 4.3 Super Account Role

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Admin action request/confirm/execute flow | PARTIAL | `apps/api/src/admin/admin-action.controller.ts` | Add request endpoints, permission checks, and full execution coverage of admin actions. |
| Governance policy updates for curators | PARTIAL | `apps/api/prisma/schema.prisma` (`CuratorPolicy`) | Implement admin endpoints for policy updates and governance masking. |

### 4.4 Curator Admin (Internal)

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Internal admin app for curator ops | FAIL | `apps/curator-admin-internal` exists but no documented features | Build internal admin UI and API integration for lifecycle management. |

## 5. Viewer × Exhibition Model

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Viewer session activation creates run + state | PASS | `apps/api/src/viewer/viewer.controller.ts` (`activate`) | — |
| Grant gating for monetized/non-public exhibitions | PASS | `apps/api/src/access/access-policy.service.ts` (`canAccessExhibition`) | — |
| Viewer resume/continue behavior | PASS | `apps/api/src/viewer/viewer.controller.ts` (`activate`, `pause`, `resume`) | — |
| Viewer state update endpoints | PASS | `apps/api/src/viewer/viewer.controller.ts` (`patchState`) | — |

## 6. Exhibition Structure & Time

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Day-indexed exhibition content models | PASS | `apps/api/prisma/schema.prisma` (`Exhibit`, `ExhibitionDayContent`) | — |
| Viewer entry/day resolution | PASS | `apps/api/src/viewer/viewer-entry.service.ts` (`resolveExhibitionEntry`) | — |
| Curator versioning/publishing workflow | FAIL | No curator publishing workflow found | Implement version creation on publish, immutable snapshots, and archive flow. |

## 7. AI-Generated Content

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| AI job processing pipeline | PARTIAL | `apps/worker-ai/src/worker.js` processes jobs and writes drafts | Add curator-triggered job creation, asset ingestion, and failure recovery flows. |
| Sanitization of generated HTML | PASS | `apps/worker-ai/src/worker.js` (`sanitizeExhibitionHtml`) | — |

## 8. NFC Governance Policies

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Curator NFC scope policy stored and enforced | PARTIAL | `apps/api/prisma/schema.prisma` (`CuratorPolicy`); `apps/api/src/access/access-policy.service.ts` | Apply policy checks across all viewer entry points and gallery detail/list consistently. |

## 9. Gallery

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Public gallery list/detail endpoints | PASS | `apps/api/src/viewer/gallery.controller.ts` | — |
| Gallery respects governance lockdown | PASS | `apps/api/src/viewer/gallery.controller.ts`; `apps/api/src/access/access-policy.service.ts` | — |
| Gallery preview for non-public exhibitions | FAIL | No preview endpoint or access grants for previews | Add preview detail endpoint with policy enforcement. |

## 10. Payment/Subscription

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Stripe checkout and webhook handling | PARTIAL | `apps/api/src/payments/payments.service.ts` (mock session + webhook logic) | Implement real Stripe SDK integration, signature validation, and payout logic. |
| Access grants issued on payment | PASS | `apps/api/src/payments/payments.service.ts` + `apps/api/src/access/access-grant.service.ts` | — |
| Revenue share configuration management | PASS | `apps/api/src/admin/revenue-share.controller.ts`; `apps/api/prisma/schema.prisma` (`RevenueShareConfig`) | — |

## 11. Governance/High-Risk Actions

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| AdminAction lifecycle (request→confirm→execute) | PARTIAL | `apps/api/src/admin/admin-action.controller.ts` | Add request endpoints, schedule/execute coverage, and policy-driven execution validation. |
| Curator suspension enforcement | PARTIAL | `apps/api/src/auth/curator-auth.service.ts` | Add enforcement checks in curator CRUD and viewer access where applicable. |

## 12. Data Retention/Deletion

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Soft delete fields on core models | PASS | `apps/api/prisma/schema.prisma` | — |
| Purge worker + exclusions | PASS | `apps/api/src/jobs/soft-delete-purge.service.ts`; `docs/DATA_RETENTION.md` | — |
| Retention policy documentation | PARTIAL | `docs/DATA_RETENTION.md` exists but lacks per-model retention durations | Add explicit retention timelines per model and legal rationale. |
| Access grant retention exclusions | PASS | `apps/api/src/jobs/soft-delete-purge.service.ts` (financial exclusion list); `docs/DATA_RETENTION.md` | — |

## 13. Technical Architecture

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| API + worker architecture documented | PASS | `docs/ARCHITECTURE.md`; `README.md` | — |
| Queue-based async jobs for AI/marketing | PASS | `apps/worker-ai/src/worker.js`; `apps/worker-mautic/src/index.js` | — |
| Production-ready environment config | PARTIAL | `README.md` lists env vars but no secrets management or deployment guidance | Add deployment/runbook and secret management docs. |

## 14. Out of Scope

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| No out-of-scope features introduced | PASS | No conflicting features detected in repo docs/code | — |

## 15. Closing Statement / Success Criteria

| Requirement | Status | Evidence (file/function) | Required fixes (if FAIL/PARTIAL) |
| --- | --- | --- | --- |
| Governance and auditability goals demonstrably enforced | PARTIAL | `apps/api/src/admin/admin-action.controller.ts`; `apps/api/src/access/access-policy.service.ts` | Expand audit log coverage and add governance checks on curator and admin workflows. |
| End-to-end viewer journey (claim → activate → day entry) | PARTIAL | Viewer claim/activate exist; viewer entry resolved in `apps/api/src/viewer/viewer-entry.service.ts` | Add missing UX flows (pause/resume, payments, curator publish) and tests. |

---

## Update Workflow

- Revisit this checklist after any feature landing in the execution plan or PRD sections.
- Update statuses to PASS when requirements are fully enforced with tests or documented verification.
- Add line-item references to new files as they are introduced.
