# 📘 L-OSIRIS NFC Exhibition Platform

## Product Requirements Document (PRD)

---

## 1. Purpose

This document defines an **NFC × Web Exhibition Platform** centered around the concept of **Exhibitions**, designed to:

* Use NFC-enabled leather goods as digital exhibition entrances
* Enable Curators to publish exhibitions with **clear beginnings and endings**
* Support **private (ONE_TO_ONE)** and **public (ONE_TO_MANY)** exhibitions
* Enable **Creator monetization, subscriptions, and revenue sharing**
* Provide **enterprise-grade governance, security, and auditability** via Super Accounts
* Support **AI-generated, multi-day exhibition content** in the form of **static HTML + CSS pages**

This PRD simultaneously serves as:

* Product Requirements Document (PRD)
* System Requirements Document (SRD)
* Platform Governance Specification

---

## 2. Core Design Principles

1. An **Exhibition is a work**, not a CMS
2. **Viewer experience comes first**; accounts are an upgrade, not a prerequisite
3. **One viewing session equals one immutable version**
4. **Payment grants access, not ownership**
5. **Platform governance overrides individual privileges**
6. **Deletion is a process, not an instant action**

---

## 3. Glossary & Core Concepts

| Real-world Concept | System Concept                      |
| ------------------ | ----------------------------------- |
| NFC leather item   | Exhibition Entrance                 |
| Exhibition         | A time-bounded curated work         |
| Day                | Day-N content within an Exhibition  |
| Activate           | Start a viewing session             |
| Run                | One complete viewing instance       |
| Version            | Immutable snapshot of an Exhibition |
| Gallery            | Collection of public Exhibitions    |
| Viewer             | Exhibition consumer                 |
| Curator            | Exhibition creator                  |
| Super Account      | Platform governor                   |

---

## 4. Roles & Access Tiers

### 4.1 Viewer

* No registration required; anonymous by default
* System automatically creates a **Viewer Session Identity**
* May optionally provide lightweight personal data (e.g. name)

**Capabilities:**

* Activate exhibitions
* Pause / resume
* Restart (replay)

**Upgrade Path:**

* May upgrade at any time to a full account (for payment / contact)

---

### 4.2 Curator

#### Curator – Standard

* Can only create **ONE_TO_ONE** exhibitions
* Cannot publish publicly
* Cannot monetize
* Intended for private, one-to-one exhibitions

#### Curator – Creator

* Enabled by Super Account
* Can create **ONE_TO_MANY** exhibitions
* Can publish publicly
* Can charge subscriptions and monetize
* Can use AI-generated exhibition content
* Must complete payout configuration (**Payout Profile**)

---

### 4.3 Super Account

* Manages Curator tiers and permissions
* Oversees Exhibitions and NFC assets
* Sets platform revenue share
* Enables governance policies (see Section 8)

⚠️ **All actions must be audited**

---

### 4.4 Curator Admin (Internal)

* Internal company role only
* Requires:

  * Company VPN
  * OTP
  * IP / identity whitelist

**Capabilities:**

* Account lifecycle management
* Exhibition ownership transfer
* Recovery and auditing

---

## 5. Viewer × Exhibition Interaction Model

### 5.1 Viewer Session Identity

* A `viewer_session_id` is automatically created on first access
* No login required

Used for:

* Day index tracking
* Personalized content rendering
* Pre-payment state retention

May later be linked to a registered user account (upgrade)

---

### 5.2 Activate, Run, and Version

* Each **Activate** action creates an **Exhibition Run**
* Each Run is bound to **a single Exhibition Version**
* Once created, a Version is **immutable**

Restarting from Day 1:

* Creates a new Run
* May bind to the latest Version

---

## 6. Exhibition Structure & Time Model

### 6.1 Exhibition Attributes

* `type`: ONE_TO_ONE / ONE_TO_MANY
* `visibility`: DRAFT / PUBLIC
* `total_days`
* `owner_curator_id`
* `status`: DRAFT / ACTIVE / ARCHIVED

---

### 6.2 Day Content

* Each Day corresponds to a **single content unit**
* Content format: **Static HTML + CSS**

May include:

* Scroll-based interactions
* Animations
* Frontend-only interactivity

🚫 No server-side execution allowed

---

## 7. AI-Generated Exhibition Content (NEW)

### 7.1 Feature Description

When creating an Exhibition and defining `total_days`, a Curator may:

* Upload a large set of media assets (images, videos, etc.)
* Provide a Prompt instruction

The system generates:

* N days of content
* Each day as a standalone HTML + CSS page

Generated content is stored as **Draft**

Curator may:

* Edit / refine drafts
* Publish drafts into an Exhibition Version

---

### 7.2 Technical & Security Requirements

* All HTML must be **sanitized**
* Strict **Content Security Policy (CSP)** enforced
* Assets referenced via Object Storage (e.g. S3 / Cloudflare R2)
* Generation pipeline must be **asynchronous (queue-based)**
* Partial failures must be **retryable**

---

## 8. NFC & Governance Policies (NEW)

### 8.1 Fixed NFC URL Strategy

* NFC tags store only a **fixed URL**
* Example:

  ```
  /t/{public_tag_id}
  ```

All routing, access control, and content decisions are resolved **server-side**

---

### 8.2 Curator NFC Scope Lockdown (Governance Feature)

Super Account may enable a **Curator-level governance policy**

#### When Enabled

All NFCs owned by the Curator:

* Can only access Exhibitions published by that Curator
* Can never access the public Gallery
* Cannot subscribe to or view Exhibitions from other Curators

#### When Disabled

NFC behaves normally:

* Public Gallery is accessible
* Subscriptions to other Curators’ public Exhibitions are allowed

⚠️ This policy **must be enforced at the backend access-decision layer**, not via frontend-only hiding.

---

## 9. Gallery (Public Exhibitions)

Displays only:

* ONE_TO_MANY
* PUBLIC
* Subscribable Exhibitions

Viewers may:

* Browse
* Subscribe
* Activate

If NFC belongs to a Curator under lockdown:

* Gallery must **not** be visible or accessible

---

## 10. Payment, Subscription & Revenue Sharing

### 10.1 Payment Rules

* Only ONE_TO_MANY Exhibitions may be monetized
* Payment grants **access rights only**
* Payment does **not** confer permanent ownership

---

### 10.2 Access Validation

Access must check:

* Payment / Subscription status
* Exhibition status
* Governance / Masking overrides
* Legal or platform-enforced interventions

---

## 11. Backend Administration & Governance

### 11.1 High-Risk Action Safeguards

The following actions require confirmation or delayed execution:

* Forced unpublishing of Exhibitions
* Creator suspension
* Governance policy enablement

All steps must be recorded in **Audit Logs**

---

### 11.2 Data Retention & Deletion

Deletion lifecycle:

1. Soft delete
2. Retention period (recoverable)
3. Hard delete after expiration

⚠️ Financial and audit records must be retained **indefinitely** (per regulation)

---

## 12. Technical Architecture (Summary)

* **Frontend**: Next.js
* **Backend**: NestJS
* **Database**: PostgreSQL + Prisma
* **Queue**: Redis + BullMQ
* **Storage**: S3 / Cloudflare R2
* **Security**: Cloudflare + VPN + OTP
* **Payment**: Stripe Connect
* **AI**: LLM APIs + Embeddings

---

## 13. Phase Plan (Summary)

* **Phase 0**: Foundation (identity, RBAC, NFC, audit)
* **Phase 1**: Exhibition Core (Run, Version, Day logic)
* **Phase 2**: Creator, Gallery, Subscription
* **Phase 3**: Payment, Governance, Enterprise Security
* **Phase 4 (Extension)**: AI optimization, recommendations, analytics

---

## 14. Out of Scope

* Real-time collaborative editing
* Server-side rendered exhibition content
* Viewer social features
* UGC marketplace functionality

---

## 15. Closing Statement

This PRD defines **not just a product, but a platform constitution**.

It establishes:

* Clear authority boundaries
* Long-term architectural stability
* A design that will not invalidate itself over time

Any implementation, review, or modification **must defer to this document as the single source of truth**.

你只要說「下一步做 X」。
