# Bug Automation Contracts

API and payload contracts between **n8n** and the **local orchestrator** for this repository.

**Status:** Contract defined (Phase 2). Orchestrator **not implemented** (Phase 3+).  
**Contract version:** `1.0.0`  
**Planned base URL:** `http://127.0.0.1:4400`  
**Target repo:** `C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management`

---

## 1. Authentication

| Endpoint | Auth |
|----------|------|
| `GET /health` | None |
| All `/runs/*` | `Authorization: Bearer <ORCHESTRATOR_API_KEY>` |

---

## 2. Bug intake payload (n8n → orchestrator)

`POST /runs/start` body: **`BugIntakePayload`**

### 2.1 Schema (repo-specific example)

```json
{
  "contractVersion": "1.0.0",
  "source": "email",
  "messageId": "<unique@mail.example>",
  "receivedAt": "2026-06-18T14:30:00.000Z",
  "reporter": {
    "email": "claims.analyst@example.com",
    "name": "Jane Analyst"
  },
  "bug": {
    "title": "Notification type shows ClaimSubmitted without space",
    "description": "On /notifications, claim-submitted notifications display 'ClaimSubmitted' instead of 'Claim Submitted'.",
    "stepsToReproduce": [
      "Login as kousik.sen@pwc.com / admin123",
      "Navigate to http://localhost:5173/notifications",
      "Observe notification type chip for claim-submitted items"
    ],
    "expectedBehavior": "Label reads 'Claim Submitted'",
    "actualBehavior": "Label reads 'ClaimSubmitted'",
    "severity": "low",
    "component": "frontend",
    "affectedArea": "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx",
    "environment": "local-dev"
  },
  "metadata": {
    "emailSubject": "[BUG] Notification type shows ClaimSubmitted without space",
    "rawEmailSnippet": "Optional plain-text excerpt",
    "labels": ["demo", "notifications"],
    "externalTicketId": null
  }
}
```

### 2.2 Field requirements

| Field | Required | Validation |
|-------|----------|------------|
| `contractVersion` | Yes | Must be `"1.0.0"` |
| `source` | Yes | `"email"` or `"chat"` |
| `messageId` | Yes | Unique; idempotency key |
| `receivedAt` | Yes | ISO-8601 UTC |
| `reporter.email` | Yes | Valid email format |
| `bug.title` | Yes | 1–200 chars |
| `bug.description` | Yes | 1–8000 chars |
| `bug.severity` | No | `low` \| `medium` \| `high` \| `critical` |
| `bug.component` | No | `frontend` \| `backend` \| `fullstack` \| `unknown` |
| `bug.affectedArea` | No | Repo-relative path hint for Cursor agent |
| `metadata.emailSubject` | Yes | Original subject line |

### 2.3 n8n email parsing convention

**Subject format:**

```
[BUG] <short title>
```

**Function node mapping:**

| Email field | Payload field |
|-------------|---------------|
| `Message-ID` header | `messageId` |
| `From` | `reporter.email` |
| Subject minus `[BUG]` | `bug.title` |
| Plain body | `bug.description` |
| Lines under `Steps:` | `bug.stepsToReproduce` |

---

## 3. Orchestrator API endpoints

### 3.1 `GET /health`

**Response `200`:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "repoRoot": "C:\\Users\\ksen010\\DemoRepo\\react_project_Health_Insurance_Claim_Management",
  "cursorConfigured": true,
  "githubConfigured": true,
  "defaultBaseBranch": "main"
}
```

---

### 3.2 `POST /runs/start`

**Request:** `BugIntakePayload`

**Response `201`:**

```json
{
  "runId": "run_20260618_143000_a1b2c3",
  "status": "received",
  "branchName": "bugfix/run_20260618_143000_a1b2c3-notification-type-label",
  "createdAt": "2026-06-18T14:30:01.000Z",
  "links": {
    "self": "/runs/run_20260618_143000_a1b2c3",
    "artifacts": "/runs/run_20260618_143000_a1b2c3/artifacts"
  }
}
```

**Errors:** `400` invalid payload · `401` bad API key · `409` duplicate `messageId` · `503` repo lock held

**Async pipeline:** `branching` → `analyzing` → `patching` → `validating` → `awaiting_approval`

---

### 3.3 `GET /runs/:id`

**Response `200` — `RunResult`:**

```json
{
  "runId": "run_20260618_143000_a1b2c3",
  "status": "awaiting_approval",
  "createdAt": "2026-06-18T14:30:01.000Z",
  "updatedAt": "2026-06-18T14:35:22.000Z",
  "intake": { },
  "analysis": {
    "bugSummary": "NotificationsPage uses camelCase 'ClaimSubmitted' for type 2 instead of human-readable label.",
    "rootCauseSummary": "getNotificationTypeName() in NotificationsPage.tsx returns hardcoded 'ClaimSubmitted'; NotificationPanel.tsx correctly uses 'Claim Submitted'.",
    "changedFiles": [
      "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx"
    ],
    "agentRunId": "cursor_local_abc123"
  },
  "validation": {
    "passed": true,
    "strictMode": false,
    "commands": [
      {
        "name": "backend-build",
        "command": "dotnet build",
        "cwd": "HealthInsuranceClaimAPI/HealthInsuranceClaimAPI",
        "exitCode": 0,
        "durationMs": 4410
      },
      {
        "name": "backend-tests",
        "command": "dotnet test",
        "cwd": "HealthInsuranceClaimAPI",
        "exitCode": 0,
        "durationMs": 0,
        "note": "No test project until Phase 5"
      },
      {
        "name": "frontend-build",
        "command": "npm run build",
        "cwd": "healthinsuranceclaim_frontend",
        "exitCode": 2,
        "durationMs": 41100,
        "note": "Pre-existing TS errors; non-blocking in demo mode"
      }
    ],
    "build": {
      "backend": { "success": true },
      "frontend": { "success": false, "errorCount": 30 }
    },
    "tests": {
      "backend": { "passed": 0, "failed": 0, "skipped": 0 },
      "frontend": { "passed": 0, "failed": 0, "skipped": 0 }
    }
  },
  "git": {
    "baseBranch": "main",
    "branchName": "bugfix/run_20260618_143000_a1b2c3-notification-type-label",
    "commits": [
      {
        "sha": "abc1234",
        "message": "fix: display Claim Submitted notification type label"
      }
    ],
    "pushed": false,
    "prUrl": null
  },
  "approval": {
    "required": true,
    "status": "pending",
    "approvedBy": null,
    "approvedAt": null,
    "rejectedReason": null
  },
  "artifactsPath": "automation/artifacts/run_20260618_143000_a1b2c3",
  "error": null
}
```

**Poll until:** `awaiting_approval`, `completed`, `failed`, or `cancelled`.

---

### 3.4 `POST /runs/:id/approve`

**Precondition:** `status === "awaiting_approval"`

**Request:**

```json
{
  "approvedBy": "engineering.lead@example.com",
  "comment": "Label fix looks correct.",
  "createPr": true
}
```

**Response `200`:**

```json
{
  "runId": "run_20260618_143000_a1b2c3",
  "status": "pushing",
  "approval": {
    "status": "approved",
    "approvedBy": "engineering.lead@example.com",
    "approvedAt": "2026-06-18T14:40:00.000Z"
  }
}
```

If `createPr: true`, chains to `creating_pr` → `completed`.

---

### 3.5 `POST /runs/:id/create-pr`

**Precondition:** Approved and branch pushed.

**Request:**

```json
{
  "title": "fix: display Claim Submitted notification type label",
  "body": "## Summary\nAutomated fix from email intake.\n\n## Bug\nNotification type shows ClaimSubmitted without space.\n\n## Root cause\nHardcoded string in NotificationsPage.tsx.\n\n## Changed files\n- healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx\n\n## Validation\n| Check | Result |\n|-------|--------|\n| dotnet build | pass |\n| dotnet test | n/a (Phase 5) |\n| npm run build | fail (pre-existing) |\n\n## Approval\nApproved by engineering.lead@example.com",
  "draft": false
}
```

**Response `201`:**

```json
{
  "runId": "run_20260618_143000_a1b2c3",
  "status": "completed",
  "git": {
    "branchName": "bugfix/run_20260618_143000_a1b2c3-notification-type-label",
    "pushed": true,
    "prUrl": "https://github.com/Hishitha-GJ/react_project_Health_Insurance_Claim_Management/pull/1",
    "prNumber": 1
  }
}
```

**GitHub mapping:**

| Field | Value |
|-------|-------|
| `owner` | `Hishitha-GJ` |
| `repo` | `react_project_Health_Insurance_Claim_Management` |
| `base` | `main` |
| `head` | `bugfix/<runId>-<slug>` |

---

### 3.6 `POST /runs/:id/cancel`

**Request:**

```json
{
  "cancelledBy": "engineering.lead@example.com",
  "reason": "Duplicate report"
}
```

**Response `200`:** `{ "runId": "...", "status": "cancelled" }`

---

## 4. Structured result for n8n email templates

### At `awaiting_approval`

| Template variable | `RunResult` path |
|-------------------|------------------|
| `{{runId}}` | `runId` |
| `{{bugTitle}}` | `intake.bug.title` |
| `{{bugSummary}}` | `analysis.bugSummary` |
| `{{rootCause}}` | `analysis.rootCauseSummary` |
| `{{changedFiles}}` | `analysis.changedFiles` (newline-joined) |
| `{{backendBuild}}` | `validation.build.backend.success` |
| `{{frontendBuild}}` | `validation.build.frontend.success` |
| `{{validationPassed}}` | `validation.passed` |

### At `completed`

| Template variable | Path |
|-------------------|------|
| `{{prUrl}}` | `git.prUrl` |
| `{{branchName}}` | `git.branchName` |

---

## 5. Artifact files (orchestrator writes)

Path: `automation/artifacts/<runId>/`

| File | Description |
|------|-------------|
| `intake.json` | Copy of `BugIntakePayload` |
| `run-log.jsonl` | Timestamped state transitions |
| `bug-summary.md` | `analysis.bugSummary` |
| `root-cause.md` | `analysis.rootCauseSummary` |
| `changed-files.json` | `analysis.changedFiles` |
| `commands.json` | `validation.commands` |
| `build-backend.log` | `dotnet build` stdout/stderr |
| `build-frontend.log` | `npm run build` stdout/stderr |
| `test-results.json` | `validation.tests` |
| `git-diff.patch` | `git diff main...HEAD` |
| `approval.json` | Approval audit record |
| `pr-result.json` | PR URL and metadata |

---

## 6. Validation commands (repo-specific)

Orchestrator executes from `REPO_ROOT`:

| Name | Command | Working directory |
|------|---------|-------------------|
| `backend-build` | `dotnet build` | `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI` |
| `backend-tests` | `dotnet test --no-restore` | `HealthInsuranceClaimAPI` |
| `frontend-build` | `npm run build` | `healthinsuranceclaim_frontend` |
| `frontend-lint` | `npm run lint` | `healthinsuranceclaim_frontend` |

**`validation.passed` logic (demo default):**

```
passed = backend.build.success AND backend.tests.failed == 0
```

When `STRICT_VALIDATION=true`, also require `frontend.build.success`.

---

## 7. TypeScript reference types

```typescript
export type RunStatus =
  | 'received' | 'branching' | 'analyzing' | 'patching' | 'validating'
  | 'awaiting_approval' | 'pushing' | 'creating_pr'
  | 'completed' | 'failed' | 'cancelled';

export interface BugIntakePayload {
  contractVersion: '1.0.0';
  source: 'email';
  messageId: string;
  receivedAt: string;
  reporter: { email: string; name?: string };
  bug: {
    title: string;
    description: string;
    stepsToReproduce?: string[];
    expectedBehavior?: string;
    actualBehavior?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    component?: 'frontend' | 'backend' | 'fullstack' | 'unknown';
    affectedArea?: string;
    environment?: string;
  };
  metadata: {
    emailSubject: string;
    rawEmailSnippet?: string;
    labels?: string[];
    externalTicketId?: string | null;
  };
}
```

Full `RunResult` interface: see §3.3.

---

## 8. Idempotency and concurrency

| Rule | Behavior |
|------|----------|
| Duplicate `messageId` | Return `409` with existing `runId` |
| Repo lock | One active mutating run per `REPO_ROOT` |
| Branch naming | `bugfix/<runId>-<slug>` where slug from `bug.title` (kebab-case, max 40 chars) |

---

## 9. Versioning

- Breaking changes → increment `contractVersion` to `1.1.0`, etc.
- n8n Function node should reject unknown versions.
