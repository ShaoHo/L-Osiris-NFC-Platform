# 🧩 L-OSIRIS Platform – Executable System Specification (ESS)

## A. System Decomposition Overview

整個系統分為 **三大可獨立交付的執行域**：

```
┌───────────────┐
│   Frontend    │  ← Viewer / Curator / Super Account UX
└───────▲───────┘
        │ API / Events
┌───────┴───────┐
│    Backend    │  ← Business rules, governance, NFC routing
└───────▲───────┘
        │ Jobs / Prompts / State
┌───────┴───────┐
│   AI Agents   │  ← Generation, validation, orchestration
└───────────────┘
```

---

# B. Frontend Executable Specification (Next.js App)

## B1. Frontend Apps Split

| App                | Audience                       | Domain                 |
| ------------------ | ------------------------------ | ---------------------- |
| Viewer App         | Anonymous / Viewer             | Exhibition consumption |
| Curator Dashboard  | Curator / Creator              | Exhibition authoring   |
| Super Admin Portal | Super Account / Internal Admin | Governance             |
| Shared UI System   | All                            | Design system          |

---

## B2. Viewer App (Core Experience)

### Entry Points

| Path                 | Source                 |
| -------------------- | ---------------------- |
| `/t/{public_tag_id}` | NFC scan               |
| `/gallery`           | Public browsing        |
| `/run/{run_id}`      | Active viewing session |

---

### Viewer State Machine (Frontend)

```ts
ViewerState =
  | ANONYMOUS
  | ACTIVATED
  | PAUSED
  | COMPLETED
```

* State is driven by **backend run status**
* Frontend **never computes day index itself**

---

### Page Types

#### 1. Exhibition Day Viewer

**Responsibilities**

* Render static HTML + CSS safely
* No JS execution from content
* CSP enforced via iframe / sandbox

**UI Requirements**

* Full-screen mobile-first
* Scroll-based progression
* Subtle day indicator (non-intrusive)
* Emoji reaction bar (❤️ 👍 🕊️ etc.)

**Forbidden**

* Editing
* External script execution
* Cross-day navigation skipping

---

#### 2. Viewer Controls Overlay

* Pause
* Resume
* Restart from Day 1
* Exit to Gallery (if allowed)

---

## B3. Curator Dashboard

### Core Sections

```
Dashboard
├─ Exhibitions
│  ├─ Draft
│  ├─ Published
│  └─ Archived
├─ AI Studio
├─ Media Library
├─ Analytics (read-only)
└─ Account / Payout (Creator only)
```

---

### Exhibition Editor Modes

#### Mode A: AI Agent Mode

* Prompt input
* Asset selection
* Preview generated days
* Accept / regenerate / edit

#### Mode B: Manual Mode

* Day list editor
* HTML + CSS upload
* CSV bulk import (Day, HTML, CSS refs)

> ⚠️ Both modes always end as **static HTML + CSS**

---

### Curator Analytics (Allowed)

* Total Runs
* Emoji reactions per Day
* Completion ratio

❌ No viewer personal data exposed

---

## B4. Super Admin Portal

### Security Constraints

* Private domain / internal routing
* VPN required
* OTP mandatory
* Whitelist enforced (IP + identity)

---

### Capabilities

* Curator tier management
* NFC ownership & reassignment
* Governance policy toggles
* Forced publish / unpublish
* Audit log viewer (append-only)

---

# C. Backend Executable Specification (NestJS)

## C1. Domain Services (Bounded Contexts)

| Service          | Owns                 |
| ---------------- | -------------------- |
| Identity         | Viewer sessions      |
| Exhibition       | Structure, versions  |
| Run Engine       | Day progression      |
| NFC Router       | `/t/{id}` resolution |
| Governance       | Overrides & lockdown |
| Gallery          | Public discovery     |
| Audit            | Immutable logs       |
| AI Orchestration | Job dispatch         |

---

## C2. Core Domain Rules (Hard Rules)

* Viewer **cannot skip days**
* Version **immutable once activated**
* Payment ≠ ownership
* Governance overrides everything
* NFC routing always server-side

---

## C3. NFC Routing Flow

```mermaid
sequenceDiagram
NFC → Backend: /t/{public_tag_id}
Backend → Governance: policy check
Backend → Exhibition: resolve allowed exhibitions
Backend → Run Engine: activate or resume
Backend → Frontend: redirect /run/{run_id}
```

---

## C4. Exhibition Run Engine

**Responsibilities**

* Map `activated_at → day_index`
* Freeze exhibition version
* Enforce end-of-exhibition behavior

**Day Calculation**

```
day = floor((now - activated_at) / 24h) + 1
```

Clamped to `[1, total_days]`

---

## C5. Storage Rules

* HTML/CSS stored as blobs (object storage)
* DB stores references + hashes only
* No executable content persisted

---

# D. AI Agent System Specification

## D1. Agent Roles

### 1. Curator Intent Agent

* Parses curator prompt
* Determines tone, structure, pacing

### 2. Day Content Generator Agent

* Generates Day-N HTML + CSS
* No JS
* No external links

### 3. Compliance & Sanitization Agent

* CSP safe
* HTML allowlist
* CSS safety check

### 4. Version Packaging Agent

* Locks draft into immutable version
* Emits version hash

---

## D2. Agent Orchestration Flow

```mermaid
graph TD
Prompt → IntentAgent
IntentAgent → DayGenerator
DayGenerator → Sanitizer
Sanitizer → DraftStore
DraftStore → CuratorReview
CuratorPublish → VersionAgent
```

---

## D3. Failure Handling

* Each day = independent job
* Retryable
* Partial success allowed
* Final publish requires 100% completion

---

## D4. OpenAI Integration Policy

* API key stored server-side only
* No key exposure to frontend
* Per-job token budget enforced
* Prompt + output logged for audit

---

# E. What Codex / Cursor Should Read

When using this system:

* **PRD.md** → *what must exist*
* **ESS (this document)** → *how to build it*
* Any code violating PRD rules = invalid
只要回覆：
**「下一步做 X」**
