# Complete API / Event / Queue Contract

**Product:** L-OSIRIS NFC Exhibition Platform
**Version:** vNext (Contract Draft)
**Scope:** App + OpenAI LLM integration + core exhibition/run/version/day + governance + admin security
**Out of scope:** Stripe/Mautic (disabled), external monetization flows

---

## 0) Global Conventions

### 0.1 Base URLs

* Public Viewer: `https://{web}/`
* API Gateway (public): `https://{api}/v1`
* Internal Admin (VPN only): `https://{admin}/v1` *(private ingress / internal DNS)*

### 0.2 Headers

* `X-Request-Id: <uuid>` (optional but recommended)
* `X-Idempotency-Key: <string>` (required for write actions that must be deduped)
* `Authorization: Bearer <jwt>` (Curator/Super/Admin)
* Viewer session: cookie `viewer_session_id` (httpOnly) or header `X-Viewer-Session: <id>` (fallback)

### 0.3 Time Rules

* “Day mapping” uses backend canonical timezone (UTC recommended).
* “Viewer Activate date -> Day 1” mapping is computed in backend only.

### 0.4 Version / Run Rules

* `Activate` creates a **Run** bound to a **Version** (immutable snapshot).
* Restart creates a **new Run** (optionally binds to latest version if allowed by rules).

---

## 1) Microservice Ownership & Table Ownership (Hard Rule)

> ✅ **禁止跨 DB 直讀**：任何 service 不可直接連別人的 DB。
> ✅ 所有跨域資料讀取必須走 **Internal API** 或 **Events + Read Model**。

### 1.1 Services

1. **svc-identity**

   * owns: Curator auth, roles, sessions (curator side), admin accounts, OTP audit binding
2. **svc-nfc**

   * owns: NfcTag lifecycle, binding, fixed URL resolver decision inputs
3. **svc-exhibition**

   * owns: Exhibition, Version, Run, Day mapping logic, visibility/type rules
4. **svc-content**

   * owns: Exhibit (Day content), render mode, HTML sanitization record, asset references
5. **svc-reaction**

   * owns: Emoji reactions, aggregation counters
6. **svc-ai-orchestrator**

   * owns: AI generation pipeline jobs, prompt history, generation traces (not raw secrets)
7. **svc-governance-admin**

   * owns: curator tier permissions, lockdown policy, masking schedules, high-risk actions workflows
8. **svc-audit**

   * owns: AuditLog, AdminAction, immutable trails
9. **svc-media**

   * owns: asset metadata, R2/S3 key mapping, signed upload URLs

### 1.2 Data Boundary Summary

* `svc-exhibition` is the single source of truth for:

  * Day mapping
  * Run/Version immutability
  * Activation rules
* `svc-content` is the single source of truth for:

  * Day page HTML/CSS blocks
  * Sanitized content records + CSP policy version tag
* `svc-governance-admin` is the single source of truth for:

  * Curator tier & permissions (ONE_TO_ONE only vs ONE_TO_MANY enabled)
  * Curator lockdown policy
  * Masking layers scheduling

---

## 2) OpenAPI (External API) – Draft

> 下方是 **OpenAPI 3.1 YAML 草案**（可直接落地）。
> 我會列出核心 endpoints；你若要「全量 endpoints」我可以再加上 tags、examples、securitySchemes 逐一補齊。

### 2.1 Public Viewer APIs (No login required)

```yaml
openapi: 3.1.0
info:
  title: L-OSIRIS Public API
  version: "1.0.0-draft"
servers:
  - url: https://{api}/v1
paths:
  /t/{publicTagId}/resolve:
    get:
      summary: Resolve NFC fixed URL to viewer entry decision
      description: NFC tags store a fixed URL. Backend resolves routing + access decisions.
      parameters:
        - name: publicTagId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Resolve result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ResolveResponse"

  /viewer/activate:
    post:
      summary: Activate an Exhibition (create Run + bind Version)
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ActivateRequest" }
      responses:
        "200":
          description: Activated
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ActivateResponse" }

  /viewer/run/{runId}:
    get:
      summary: Get viewer run state (what day, completion, gating)
      parameters:
        - name: runId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Run state
          content:
            application/json:
              schema: { $ref: "#/components/schemas/RunStateResponse" }

  /viewer/run/{runId}/day:
    get:
      summary: Fetch today's rendered day content pointer (HTML/CSS or blocks)
      parameters:
        - name: runId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Day content reference
          content:
            application/json:
              schema: { $ref: "#/components/schemas/DayContentResponse" }

  /viewer/run/{runId}/reaction:
    post:
      summary: Submit emoji reaction for current day
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ReactionRequest" }
      responses:
        "200":
          description: Accepted
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ReactionResponse" }

components:
  schemas:
    ResolveResponse:
      type: object
      required: [publicTagId, decision, viewerSessionId]
      properties:
        publicTagId: { type: string }
        viewerSessionId: { type: string, description: "Anonymous viewer session identity" }
        decision:
          type: object
          required: [mode]
          properties:
            mode:
              type: string
              enum: [RESUME_RUN, SHOW_ENTRY, REDIRECT_GALLERY, DENY]
            runId: { type: string, nullable: true }
            exhibitionId: { type: string, nullable: true }
            reason: { type: string, nullable: true }

    ActivateRequest:
      type: object
      required: [exhibitionId, source]
      properties:
        exhibitionId: { type: string }
        source:
          type: object
          required: [type]
          properties:
            type:
              type: string
              enum: [NFC, GALLERY]
            publicTagId: { type: string, nullable: true }

    ActivateResponse:
      type: object
      required: [runId, versionId, startedAt, totalDays]
      properties:
        runId: { type: string }
        versionId: { type: string }
        startedAt: { type: string, format: date-time }
        totalDays: { type: integer }
        currentDayIndex: { type: integer, description: "1-based day index" }

    RunStateResponse:
      type: object
      required: [runId, status, totalDays, currentDayIndex]
      properties:
        runId: { type: string }
        status:
          type: string
          enum: [ACTIVE, PAUSED, COMPLETED]
        totalDays: { type: integer }
        currentDayIndex: { type: integer }
        canRestart: { type: boolean }
        canPause: { type: boolean }

    DayContentResponse:
      type: object
      required: [runId, dayIndex, renderMode, contentRef]
      properties:
        runId: { type: string }
        dayIndex: { type: integer }
        renderMode:
          type: string
          enum: [HTML, BLOCKS]
        contentRef:
          type: object
          required: [type]
          properties:
            type:
              type: string
              enum: [INLINE_HTML, SIGNED_URL]
            html: { type: string, nullable: true }
            signedUrl: { type: string, nullable: true }
            cspPolicyId: { type: string, nullable: true }

    ReactionRequest:
      type: object
      required: [runId, dayIndex, emoji]
      properties:
        runId: { type: string }
        dayIndex: { type: integer }
        emoji:
          type: string
          enum: ["❤️","👍","🕊️","🔥","✨"]

    ReactionResponse:
      type: object
      required: [accepted]
      properties:
        accepted: { type: boolean }
```

---

### 2.2 Curator APIs (Email/Google Auth login)

**Goals:**

* Create exhibitions
* Draft days content
* AI generate (async)
* Publish -> create Version
* View reactions analytics

```yaml
paths:
  /curator/auth/login:
    post:
      summary: Curator login (email+password) - Google auth handled separately
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string }
      responses:
        "200":
          description: JWT issued
          content:
            application/json:
              schema:
                type: object
                required: [accessToken]
                properties:
                  accessToken: { type: string }

  /curator/exhibitions:
    get:
      summary: List curator exhibitions
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: List
    post:
      summary: Create exhibition (Draft)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [type, totalDays]
              properties:
                type: { type: string, enum: [ONE_TO_ONE, ONE_TO_MANY] }
                totalDays: { type: integer, minimum: 1, maximum: 3650 }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                type: object
                required: [exhibitionId]
                properties:
                  exhibitionId: { type: string }

  /curator/exhibitions/{exhibitionId}:
    get:
      summary: Get exhibition detail
      security: [{ bearerAuth: [] }]
      parameters:
        - name: exhibitionId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200": { description: OK }

  /curator/exhibitions/{exhibitionId}/days/{dayIndex}:
    put:
      summary: Upsert day content (manual editor)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: exhibitionId
          in: path
          required: true
          schema: { type: string }
        - name: dayIndex
          in: path
          required: true
          schema: { type: integer }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [renderMode]
              properties:
                renderMode: { type: string, enum: [HTML, BLOCKS] }
                html: { type: string, nullable: true }
                blocks: { type: array, nullable: true, items: { type: object } }
      responses:
        "200": { description: Saved }

  /curator/exhibitions/{exhibitionId}/ai/generate:
    post:
      summary: Trigger AI generation for N days (async job)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [prompt]
              properties:
                prompt: { type: string }
                startDay: { type: integer, default: 1 }
                endDay: { type: integer }
                stylePreset: { type: string, nullable: true }
      responses:
        "202":
          description: Job accepted
          content:
            application/json:
              schema:
                type: object
                required: [jobId]
                properties:
                  jobId: { type: string }

  /curator/exhibitions/{exhibitionId}/publish:
    post:
      summary: Publish exhibition -> create immutable Version snapshot
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Published
          content:
            application/json:
              schema:
                type: object
                required: [versionId]
                properties:
                  versionId: { type: string }

  /curator/exhibitions/{exhibitionId}/analytics/reactions:
    get:
      summary: Reaction analytics (day-level counters)
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: Stats
```

---

### 2.3 Super Admin + Curator Admin APIs (VPN / OTP / Whitelist)

**Access Model**

* Must be behind internal private ingress
* Must enforce:

  * VPN cert
  * OTP
  * whitelist policy
  * full audit for every action

Key endpoints:

* Curator permission tier (ONE_TO_MANY enable)
* Curator lockdown governance toggle
* Masking layer schedule
* NFC inventory & binding verification
* Audit logs

```yaml
paths:
  /admin/curators:
    get:
      summary: List curators
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: OK }

  /admin/curators/{curatorId}/permissions:
    put:
      summary: Set curator tier permissions
      description: Enable/disable ONE_TO_MANY capability (Creator account).
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [allowOneToMany]
              properties:
                allowOneToMany: { type: boolean }
                note: { type: string, nullable: true }
      responses:
        "200": { description: Updated }

  /admin/curators/{curatorId}/governance/lockdown:
    put:
      summary: Toggle curator NFC scope lockdown
      security: [{ bearerAuth: [] }]
      parameters:
        - name: X-Idempotency-Key
          in: header
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [enabled]
              properties:
                enabled: { type: boolean }
                reason: { type: string }
      responses:
        "200": { description: Updated }

  /admin/exhibitions/{exhibitionId}/masking:
    post:
      summary: Create masking layer schedule (priority content)
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [startsAt, endsAt, maskContent]
              properties:
                startsAt: { type: string, format: date-time }
                endsAt: { type: string, format: date-time }
                maskContent:
                  type: object
                  required: [renderMode]
                  properties:
                    renderMode: { type: string, enum: [HTML, BLOCKS] }
                    html: { type: string, nullable: true }
      responses:
        "201": { description: Created }

  /admin/audit/logs:
    get:
      summary: Query audit logs
      security: [{ bearerAuth: [] }]
      parameters:
        - name: actorId
          in: query
          schema: { type: string }
        - name: actionType
          in: query
          schema: { type: string }
      responses:
        "200": { description: OK }
```

---

## 3) Internal Events Contract (Event Bus)

> 事件是服務間同步狀態的主要方式。
> 事件命名：`domain.eventName.v1`
> 事件 envelope 統一，payload domain-specific。

### 3.1 Standard Event Envelope

```json
{
  "eventId": "uuid",
  "eventName": "exhibition.runActivated.v1",
  "occurredAt": "2026-01-11T14:49:42.920Z",
  "producer": "svc-exhibition",
  "trace": { "requestId": "uuid", "idempotencyKey": "string" },
  "payload": {}
}
```

### 3.2 Core Events (Must Implement)

#### A) Viewer Session + Activation + Day Mapping

1. `viewer.sessionCreated.v1` (producer: svc-exhibition or gateway)

```json
{
  "viewerSessionId": "vs_123",
  "createdAt": "2026-01-11T00:00:00Z",
  "source": { "type": "NFC", "publicTagId": "tag_x" }
}
```

2. `exhibition.runActivated.v1` (producer: svc-exhibition)

```json
{
  "runId": "run_123",
  "exhibitionId": "exh_123",
  "versionId": "ver_123",
  "viewerSessionId": "vs_123",
  "activatedAt": "2026-01-11T14:49:42.920Z",
  "totalDays": 365,
  "day1Date": "2026-01-11",
  "mapping": {
    "timezone": "UTC",
    "rule": "activatedDate->day1"
  },
  "source": { "type": "NFC", "publicTagId": "tag_x" }
}
```

3. `exhibition.runCompleted.v1` (producer: svc-exhibition)

```json
{
  "runId": "run_123",
  "exhibitionId": "exh_123",
  "versionId": "ver_123",
  "viewerSessionId": "vs_123",
  "completedAt": "2026-12-31T00:00:01Z"
}
```

#### B) Content Draft/Publish/Version Snapshot

4. `content.dayUpserted.v1` (producer: svc-content)

```json
{
  "exhibitionId": "exh_123",
  "dayIndex": 12,
  "renderMode": "HTML",
  "contentHash": "sha256...",
  "updatedAt": "2026-01-11T10:00:00Z"
}
```

5. `exhibition.published.v1` (producer: svc-exhibition)

```json
{
  "exhibitionId": "exh_123",
  "versionId": "ver_123",
  "publishedAt": "2026-01-11T11:00:00Z",
  "visibility": "PUBLIC",
  "type": "ONE_TO_MANY"
}
```

#### C) Reactions

6. `reaction.emojiSubmitted.v1` (producer: svc-reaction)

```json
{
  "reactionId": "r_123",
  "runId": "run_123",
  "exhibitionId": "exh_123",
  "versionId": "ver_123",
  "dayIndex": 12,
  "emoji": "❤️",
  "viewerSessionId": "vs_123",
  "submittedAt": "2026-01-11T14:55:00Z"
}
```

7. `reaction.dayAggregateUpdated.v1` (producer: svc-reaction)

```json
{
  "exhibitionId": "exh_123",
  "versionId": "ver_123",
  "dayIndex": 12,
  "emoji": "❤️",
  "count": 42,
  "updatedAt": "2026-01-11T15:00:00Z"
}
```

#### D) Governance / Lockdown / Masking

8. `governance.curatorLockdownChanged.v1` (producer: svc-governance-admin)

```json
{
  "curatorId": "cur_123",
  "enabled": true,
  "changedAt": "2026-01-11T09:00:00Z",
  "reason": "Policy update",
  "actor": { "adminId": "admin_1" }
}
```

9. `governance.maskingScheduled.v1` (producer: svc-governance-admin)

```json
{
  "exhibitionId": "exh_123",
  "maskId": "mask_123",
  "startsAt": "2026-02-01T00:00:00Z",
  "endsAt": "2026-02-02T00:00:00Z",
  "priority": 100
}
```

#### E) AI Generation

10. `ai.generationRequested.v1` (producer: svc-ai-orchestrator)

```json
{
  "jobId": "job_123",
  "exhibitionId": "exh_123",
  "requestedByCuratorId": "cur_123",
  "prompt": "Write 365 days...",
  "range": { "startDay": 1, "endDay": 365 },
  "requestedAt": "2026-01-11T10:00:00Z"
}
```

11. `ai.dayGenerated.v1` (producer: svc-ai-orchestrator)

```json
{
  "jobId": "job_123",
  "exhibitionId": "exh_123",
  "dayIndex": 12,
  "renderMode": "HTML",
  "html": "<html>...</html>",
  "contentHash": "sha256...",
  "generatedAt": "2026-01-11T10:00:05Z"
}
```

12. `ai.generationCompleted.v1` (producer: svc-ai-orchestrator)

```json
{
  "jobId": "job_123",
  "exhibitionId": "exh_123",
  "completedAt": "2026-01-11T10:30:00Z",
  "successDays": 365,
  "failedDays": 0
}
```

---

## 4) Queue Contract (BullMQ)

> Queue 是 **非同步 pipeline** 的唯一允許方式（避免 request 阻塞）。
> Queue name 規則：`svcName.queueName`
> Job name 規則：`jobName.v1`

### 4.1 Queues List

* `svc-ai-orchestrator.generateExhibitDays`
* `svc-content.sanitizeHtml`
* `svc-media.processUpload`
* `svc-reaction.aggregateReactions`
* `svc-audit.persistAuditLog` *(可選，通常 audit 也可同步寫 DB，但高流量建議 async)*

### 4.2 Job Envelope (Standard)

```json
{
  "jobName": "generateExhibitDays.v1",
  "jobId": "job_123",
  "trace": { "requestId": "uuid", "idempotencyKey": "string" },
  "payload": {}
}
```

### 4.3 AI Generation Job: `generateExhibitDays.v1`

**Queue:** `svc-ai-orchestrator.generateExhibitDays`
**Producer:** svc-ai-orchestrator
**Consumer:** svc-ai-orchestrator worker

```json
{
  "jobName": "generateExhibitDays.v1",
  "payload": {
    "exhibitionId": "exh_123",
    "curatorId": "cur_123",
    "prompt": "Write 365 days...",
    "range": { "startDay": 1, "endDay": 365 },
    "dedupeKey": "exh_123:1-365:promptHash",
    "model": {
      "provider": "openai",
      "model": "gpt-4.1-mini",
      "temperature": 0.8
    }
  }
}
```

**Retry/Backoff**

* attempts: 5
* backoff: exponential (1s, 5s, 20s, 60s, 180s)
* dead-letter: `svc-ai-orchestrator.generateExhibitDays.DLQ`

**Idempotency**

* enforce `dedupeKey` at producer level
* consumer must check “already generated day contentHash exists” then skip

### 4.4 HTML Sanitization Job: `sanitizeHtml.v1`

**Queue:** `svc-content.sanitizeHtml`
**Producer:** svc-content / svc-ai-orchestrator
**Consumer:** svc-content worker

```json
{
  "jobName": "sanitizeHtml.v1",
  "payload": {
    "exhibitionId": "exh_123",
    "dayIndex": 12,
    "rawHtml": "<html>...</html>",
    "policyId": "csp_v1",
    "output": {
      "storeAs": "DB",
      "contentHash": "sha256..."
    }
  }
}
```

### 4.5 Reaction Aggregation Job: `aggregateReactions.v1`

**Queue:** `svc-reaction.aggregateReactions`
**Producer:** svc-reaction
**Consumer:** svc-reaction worker

```json
{
  "jobName": "aggregateReactions.v1",
  "payload": {
    "exhibitionId": "exh_123",
    "versionId": "ver_123",
    "dayIndex": 12,
    "emoji": "❤️",
    "window": "1m"
  }
}
```

---

## 5) Internal API Between Services (When Events Aren’t Enough)

> 只允許 **少數** internal API：
> 主要用於 *強一致* 查詢（例如 resolve 決策需要即時 governance）。

### 5.1 `svc-exhibition -> svc-governance-admin`

**GET** `/internal/curators/{curatorId}/governance`
Response:

```json
{
  "curatorId": "cur_123",
  "lockdownEnabled": true,
  "allowOneToMany": false
}
```

### 5.2 `svc-exhibition -> svc-content`

**GET** `/internal/versions/{versionId}/day/{dayIndex}`
Response:

```json
{
  "renderMode": "HTML",
  "contentRef": { "type": "INLINE_HTML", "html": "<html>...</html>" },
  "contentHash": "sha256...",
  "cspPolicyId": "csp_v1"
}
```

### 5.3 `svc-nfc -> svc-exhibition`

**GET** `/internal/nfc/{publicTagId}/bound-exhibition`
Response:

```json
{
  "publicTagId": "tag_x",
  "boundExhibitionId": "exh_123",
  "status": "ACTIVE"
}
```

---

## 6) Decision Engine Contract (NFC Resolve)

`/t/{publicTagId}/resolve` 的決策必須同時考慮：

1. NFC tag 是否 ACTIVE
2. 是否 bound exhibition
3. curator lockdown policy（禁止 gallery）
4. viewer 是否已有 active run（resume）
5. exhibition visibility/type
6. masking layer（若在時間窗內，優先顯示 mask layer content）

**Decision Output Contract** 已在 OpenAPI `ResolveResponse` 中定義（`mode: RESUME_RUN/SHOW_ENTRY/REDIRECT_GALLERY/DENY`）。

---

## 7) MVP Acceptance Hooks (Engineering Test Checklist)

### 7.1 API Contract Tests (must pass)

* `GET /t/{tag}/resolve` returns viewerSessionId + decision
* `POST /viewer/activate` creates run + locks version
* `GET /viewer/run/{runId}` returns consistent currentDayIndex
* `GET /viewer/run/{runId}/day` returns correct day content per mapping
* `POST /viewer/run/{runId}/reaction` writes reaction and updates aggregate asynchronously

### 7.2 Event/Queue Tests

* activation emits `exhibition.runActivated.v1`
* publish emits `exhibition.published.v1`
* AI generate enqueues job and emits `ai.*` events
* reaction emits `reaction.emojiSubmitted.v1` and eventually `reaction.dayAggregateUpdated.v1`

---

make this contract into the following files:

* `docs/contracts/openapi-public.yaml`
* `docs/contracts/openapi-curator.yaml`
* `docs/contracts/openapi-admin.yaml`
* `docs/contracts/events.md`
* `docs/contracts/queues.md`
