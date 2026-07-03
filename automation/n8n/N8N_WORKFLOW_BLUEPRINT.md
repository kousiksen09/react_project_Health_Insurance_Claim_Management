# n8n Workflow Blueprint — Bug-Fix Automation

> **Current implementation:** Import [`sdlc-automation-all-in-one.json`](./sdlc-automation-all-in-one.json) instead of building these workflows manually. This document remains as a production design reference.

**Purpose:** Node-by-node design for n8n integration with the local orchestrator.  
**Status:** Blueprint only — no exported workflow JSON (build manually in n8n 1.82+).  
**Orchestrator:** `http://127.0.0.1:4400`  
**Auth:** `Authorization: Bearer {{ $vars.ORCHESTRATOR_API_KEY }}`

---

## Design overview

Use **two workflows** (recommended):

| ID | Name | Trigger | Responsibility |
|----|------|---------|----------------|
| **WF-1** | `BUG-01 Intake Pipeline` | Chat (demo) or Webhook/Email (prod) | Steps 1–6: intake → start → poll → approval email |
| **WF-2** | `BUG-02 Approval Handler` | Webhook (`approve` / `reject`) | Steps 7–9: decision → PR → notify requester |

Why two workflows:
- WF-1 may run **5–15 minutes** (agent + validation poll).
- WF-2 is **event-driven** when a reviewer clicks Approve/Reject in email.
- Avoids blocking a long-running execution on human wait.

Optional: WF-1 demo today uses a **single Code node** that polls inline (see `automation/n8n/bugfix-chat-demo.json`). Production should split poll + email as below.

```
┌──────────── WF-1 ────────────┐     ┌──────────── WF-2 ────────────┐
│ Chat/Email → Normalize      │     │ Webhook Approve/Reject        │
│ → POST /runs/start          │     │ → POST approve|reject         │
│ → Poll GET /runs/:id        │     │ → POST /create-pr (if approve)│
│ → GET /approval-summary     │     │ → Email requester             │
│ → Send approval email         │     └──────────────────────────────┘
└─────────────────────────────┘
         │ email links ──────────────────────────────►
```

---

## Prerequisites (n8n)

| Item | Where |
|------|--------|
| Variable `ORCHESTRATOR_API_KEY` | n8n Settings → Variables |
| Variable `ORCHESTRATOR_URL` | Default `http://127.0.0.1:4400` |
| Variable `REVIEWER_EMAIL` | e.g. `engineering.lead@example.com` |
| Credential `SMTP` or `Microsoft Outlook` | For Send Email nodes |
| Credential `HTTP Header Auth` (optional) | Bearer token for HTTP Request |

Webhook base URL (for approval links): your n8n instance, e.g. `http://localhost:5678/webhook`

---

# WF-1: BUG-01 Intake Pipeline

## Step map

| # | Step | Nodes |
|---|------|-------|
| 1 | Chat intake | 1–2 |
| 2 | Bug normalization | 3–4 |
| 3 | Call orchestrator start | 5 |
| 4 | Poll run status | 6–9 |
| 5 | Receive validation results | 10 |
| 6 | Send manual approval email | 11–12 |

---

### Node 1 — `Trigger: Chat Message`

| Property | Value |
|----------|--------|
| **Type** | `@n8n/n8n-nodes-langchain.chatTrigger` |
| **Name** | `01 Trigger: Chat Message` |
| **Notes** | Demo intake. Replace with Email/Webhook/ServiceNow in prod. |

**Output (n8n):**

```json
{
  "chatInput": "[BUG] Notification label shows ClaimSubmitted\n\ncomponent: frontend\n..."
}
```

**Production alternatives:**

| Source | Node type | Notes |
|--------|-----------|-------|
| Outlook | `Microsoft Outlook Trigger` | Needs Graph credentials |
| Generic email | `IMAP Email` or `Email Read` | Parse `[BUG]` subject |
| ServiceNow | `Webhook` | Map ticket fields |
| Form | `n8n Form Trigger` | Internal bug form |

---

### Node 2 — `Set: Raw Intake Context`

| Property | Value |
|----------|--------|
| **Type** | `Set` |
| **Name** | `02 Set: Raw Intake Context` |
| **Mode** | Manual mapping |

| Field | Expression |
|-------|------------|
| `rawText` | `{{ $json.chatInput }}` |
| `receivedAt` | `{{ $now.toISO() }}` |
| `intakeChannel` | `chat` |

---

### Node 3 — `Code: Normalize Bug Intake`

| Property | Value |
|----------|--------|
| **Type** | `Code` |
| **Name** | `03 Code: Normalize Bug Intake` |
| **Mode** | Run once for all items |

**Logic:**
- Parse `[BUG] <title>` from first line
- Extract optional `component:`, `area:`, `severity:` lines
- Build `BugIntakePayload` (contract v1.0.0)
- Generate unique `messageId`: `n8n-{channel}-{timestamp}-{random}@local`

**Output:** single item with `{ bugIntakePayload, reporterEmail }`

See [Sample: BugIntakePayload](#sample-bugintakepayload) below.

---

### Node 4 — `IF: Valid Intake`

| Property | Value |
|----------|--------|
| **Type** | `IF` |
| **Name** | `04 IF: Valid Intake` |
| **Condition** | `bugIntakePayload.bug.title` not empty AND `bug.description` length ≥ 1 |

**False branch** → `Respond / Send Error` (invalid format message).

---

### Node 5 — `HTTP: Start Orchestrator Run`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `05 HTTP: Start Orchestrator Run` |
| **Method** | POST |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/start` |
| **Authentication** | Header Auth → `Authorization: Bearer {{ $vars.ORCHESTRATOR_API_KEY }}` |
| **Body** | JSON → `{{ $json.bugIntakePayload }}` |
| **Response** | Full response |

**Expected:** HTTP `201`

See [Sample: Start run response](#sample-start-run-response).

**Error handling:**

| HTTP | Action |
|------|--------|
| 409 DUPLICATE_MESSAGE_ID | Stop; notify duplicate |
| 503 REPO_LOCK_HELD | Wait 60s → retry once |
| 401 | Fail; check API key |

---

### Node 6 — `Set: Run Tracking`

| Property | Value |
|----------|--------|
| **Type** | `Set` |
| **Name** | `06 Set: Run Tracking` |

| Field | Expression |
|-------|------------|
| `runId` | `{{ $json.runId }}` |
| `branchName` | `{{ $json.branchName }}` |
| `pollAttempt` | `0` |
| `maxPollAttempts` | `90` |
| `reporterEmail` | from Node 3 |

---

### Node 7 — `Wait: Poll Interval`

| Property | Value |
|----------|--------|
| **Type** | `Wait` |
| **Name** | `07 Wait: Poll Interval (5s)` |
| **Wait time** | 5 seconds |

*(First iteration: optional 10s initial wait after start.)*

---

### Node 8 — `HTTP: Get Run Status`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `08 HTTP: Get Run Status` |
| **Method** | GET |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}` |
| **Auth** | Bearer |

See [Sample: RunResult (awaiting_approval)](#sample-runresult-awaiting_approval).

---

### Node 9 — `IF: Pipeline Complete?`

| Property | Value |
|----------|--------|
| **Type** | `IF` |
| **Name** | `09 IF: Pipeline Complete?` |

**True (ready for review):** `status === "awaiting_approval"`  
**True (terminal failure):** `status === "failed"` → go to failure notify branch  
**False:** increment `pollAttempt` → if `< maxPollAttempts` loop to Node 7; else timeout email

**Terminal statuses for WF-1 poll loop:**

| Status | Next |
|--------|------|
| `awaiting_approval` | Continue to Node 10 |
| `failed` | Send failure email to reporter |
| `approved`, `rejected`, `pr_created` | Unexpected; log and stop |

---

### Node 10 — `HTTP: Get Approval Summary`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `10 HTTP: Get Approval Summary` |
| **Method** | GET |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}/approval-summary` |

**Purpose:** Reviewer-facing payload including validation results, checklist, pre-built email bodies.

See [Sample: ApprovalReviewSummary](#sample-approvalreviewsummary).

**Key fields for email (Step 5 — validation):**

```json
{
  "validation": {
    "passed": true,
    "buildPassed": true,
    "testsPassed": true,
    "testSummary": "backend: 6 passed, 0 failed; frontend: not run",
    "failureReason": null
  }
}
```

---

### Node 11 — `Code: Build Approval Email Links`

| Property | Value |
|----------|--------|
| **Type** | `Code` |
| **Name** | `11 Code: Build Approval Email Links` |

**Logic:** Append signed/secret webhook URLs for WF-2:

```
approveUrl  = {{ $vars.N8N_WEBHOOK_BASE }}/bugfix-approve?runId={{ runId }}&action=approve
rejectUrl   = {{ $vars.N8N_WEBHOOK_BASE }}/bugfix-reject?runId={{ runId }}&action=reject
```

Optional: HMAC token query param for basic auth.

**Output:** `{ to, subject, bodyHtml, bodyPlain, runId, reporterEmail, approveUrl, rejectUrl }`

Use templates in [Approval email template](#approval-email-template).

---

### Node 12 — `Send Email: Manual Approval Request`

| Property | Value |
|----------|--------|
| **Type** | `Send Email` (SMTP / Outlook) |
| **Name** | `12 Send Email: Manual Approval Request` |
| **To** | `{{ $vars.REVIEWER_EMAIL }}` |
| **Subject** | `{{ $json.subject }}` |
| **Email type** | HTML |
| **Body** | `{{ $json.bodyHtml }}` |

**CC (optional):** `{{ $json.reporterEmail }}`

WF-1 ends here. Human acts via email links → WF-2.

---

# WF-2: BUG-02 Approval Handler

## Step map

| # | Step | Nodes |
|---|------|-------|
| 7 | Handle approve/reject | 1–5 |
| 8 | Create PR | 6–8 |
| 9 | Notify requester | 9–10 |

---

### Node 1 — `Webhook: Approval Decision`

| Property | Value |
|----------|--------|
| **Type** | `Webhook` |
| **Name** | `01 Webhook: Approval Decision` |
| **Path** | `bugfix-approve` OR separate paths for approve/reject |
| **Method** | GET (link in email) or POST |
| **Response mode** | Respond to Webhook (last node) |

See [Sample: Approval webhook query](#sample-approval-webhook-query).

**Two-webhook variant (clearer):**

| Webhook path | Action |
|--------------|--------|
| `/webhook/bugfix-approve` | approve |
| `/webhook/bugfix-reject` | reject |

---

### Node 2 — `Set: Parse Webhook Params`

| Property | Value |
|----------|--------|
| **Type** | `Set` |
| **Name** | `02 Set: Parse Webhook Params` |

| Field | Source |
|-------|--------|
| `runId` | query `runId` |
| `action` | `approve` or `reject` |
| `reviewerEmail` | query or fixed `$vars.REVIEWER_EMAIL` |

---

### Node 3 — `IF: Approve or Reject?`

| Property | Value |
|----------|--------|
| **Type** | `IF` |
| **Name** | `03 IF: Approve or Reject?` |

---

### Node 4a — `HTTP: Approve Run`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `04a HTTP: Approve Run` |
| **Method** | POST |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}/approve` |
| **Body** | See [Sample: Approve request](#sample-approve-request) |

**Important:** `"createPr": false` — PR is a separate explicit step.

---

### Node 4b — `HTTP: Reject Run`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `04b HTTP: Reject Run` |
| **Method** | POST |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}/reject` |
| **Body** | See [Sample: Reject request](#sample-reject-request) |

**Reject branch** → skip PR → Node 9 (notify rejected) → Webhook response.

---

### Node 5 — `IF: Approve Succeeded?`

| Property | Value |
|----------|--------|
| **Type** | `IF` |
| **Name** | `05 IF: Approve Succeeded?` |
| **Condition** | `status === "approved"` |

---

### Node 6 — `HTTP: Create Pull Request`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `06 HTTP: Create Pull Request` |
| **Method** | POST |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}/create-pr` |
| **Body** | `{ "draft": false }` |

See [Sample: Create PR response](#sample-create-pr-response).

**Requires:** orchestrator `GITHUB_TOKEN` configured.

---

### Node 7 — `HTTP: Get Final Run (PR URL)`

| Property | Value |
|----------|--------|
| **Type** | `HTTP Request` |
| **Name** | `07 HTTP: Get Final Run` |
| **Method** | GET |
| **URL** | `{{ $vars.ORCHESTRATOR_URL }}/runs/{{ $json.runId }}` |

Use when create-pr response needs confirmation (`git.prUrl`, `status: pr_created`).

---

### Node 8 — `Code: Build PR Notification`

| Property | Value |
|----------|--------|
| **Type** | `Code` |
| **Name** | `08 Code: Build PR Notification` |

Merge: run details + `git.prUrl` + original reporter email from WF-1 (store in orchestrator `intake.reporter.email` — re-fetch from GET run).

Use [PR notification email template](#pr-notification-email-template).

---

### Node 9 — `Send Email: Notify Requester`

| Property | Value |
|----------|--------|
| **Type** | `Send Email` |
| **Name** | `09 Send Email: Notify Requester` |
| **To** | `{{ $json.reporterEmail }}` (from `run.intake.reporter.email`) |
| **Subject** | from template |
| **Body** | HTML from template |

**Reject path variant:** `09b Send Email: Rejection Notice`

---

### Node 10 — `Respond: Webhook Confirmation`

| Property | Value |
|----------|--------|
| **Type** | `Respond to Webhook` |
| **Name** | `10 Respond: Webhook Confirmation` |
| **Body** | Simple HTML thank-you page |

See [Sample: Webhook response body](#sample-webhook-response-body).

---

# Sample payloads

## Sample: BugIntakePayload

**Request** `POST /runs/start`

```json
{
  "contractVersion": "1.0.0",
  "source": "chat",
  "messageId": "n8n-chat-20260618T153045Z-a1b2c3@local",
  "receivedAt": "2026-06-18T15:30:45.123Z",
  "reporter": {
    "email": "analyst@example.com",
    "name": "Jane Analyst"
  },
  "bug": {
    "title": "Notification label shows ClaimSubmitted",
    "description": "On /notifications the type chip shows ClaimSubmitted instead of Claim Submitted.",
    "stepsToReproduce": [
      "Login as admin",
      "Open /notifications",
      "Observe claim-submitted notification type chip"
    ],
    "expectedBehavior": "Label reads Claim Submitted",
    "actualBehavior": "Label reads ClaimSubmitted",
    "severity": "low",
    "component": "frontend",
    "affectedArea": "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx",
    "environment": "local-dev"
  },
  "metadata": {
    "emailSubject": "[BUG] Notification label shows ClaimSubmitted",
    "rawEmailSnippet": "[BUG] Notification label shows ClaimSubmitted...",
    "labels": ["n8n", "chat", "demo"],
    "externalTicketId": null
  }
}
```

---

## Sample: Start run response

**Response** `201 Created`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "queued",
  "branchName": "bugfix/run_20260618_153045_x7k2m9-notification-label-shows-claimsubmitted",
  "createdAt": "2026-06-18T15:30:45.456Z",
  "links": {
    "self": "/runs/run_20260618_153045_x7k2m9",
    "artifacts": "/runs/run_20260618_153045_x7k2m9/artifacts",
    "approvalSummary": "/runs/run_20260618_153045_x7k2m9/approval-summary"
  }
}
```

---

## Sample: RunResult (polling — in progress)

**Response** `GET /runs/:id` while pipeline running

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "validating",
  "createdAt": "2026-06-18T15:30:45.456Z",
  "updatedAt": "2026-06-18T15:32:10.000Z",
  "intake": { "...": "..." },
  "analysis": {
    "bugSummary": "Notification label missing space",
    "rootCauseSummary": "Hardcoded string in NotificationsPage.tsx",
    "changedFiles": [
      "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx"
    ]
  },
  "validation": null,
  "git": {
    "baseBranch": "main",
    "branchName": "bugfix/run_20260618_153045_x7k2m9-notification-label-shows-claimsubmitted",
    "commits": [],
    "pushed": false,
    "prUrl": null
  },
  "approval": {
    "required": true,
    "status": "pending",
    "approvedBy": null,
    "approvedAt": null,
    "rejectedBy": null,
    "rejectedAt": null,
    "rejectedReason": null
  },
  "artifactsPath": "automation/artifacts/run_20260618_153045_x7k2m9",
  "error": null
}
```

---

## Sample: RunResult (awaiting_approval)

**Poll until** `status === "awaiting_approval"`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "awaiting_approval",
  "analysis": {
    "bugSummary": "Notification type chip displays ClaimSubmitted without a space.",
    "rootCauseSummary": "getNotificationTypeName() returned camelCase label.",
    "changedFiles": [
      "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx"
    ]
  },
  "validation": {
    "passed": true,
    "buildPassed": true,
    "testsPassed": true,
    "strictMode": false,
    "testSummary": "backend: 6 passed, 0 failed, 0 skipped; frontend: not run",
    "failureReason": null,
    "build": {
      "backend": { "success": true, "skipped": false },
      "frontend": { "success": true, "skipped": false }
    },
    "tests": {
      "backend": { "passed": 6, "failed": 0, "skipped": 0, "ran": true },
      "frontend": { "passed": 0, "failed": 0, "skipped": 0, "ran": false }
    }
  },
  "git": {
    "baseBranch": "main",
    "branchName": "bugfix/run_20260618_153045_x7k2m9-notification-label-shows-claimsubmitted",
    "pushed": false,
    "prUrl": null
  },
  "approval": { "status": "pending" }
}
```

---

## Sample: ApprovalReviewSummary

**Response** `GET /runs/:id/approval-summary`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "awaiting_approval",
  "decision": "pending",
  "recommendedAction": "review_and_approve",
  "bug": {
    "title": "Notification label shows ClaimSubmitted",
    "description": "On /notifications the type chip shows ClaimSubmitted...",
    "severity": "low",
    "component": "frontend",
    "reporterEmail": "analyst@example.com",
    "reporterName": "Jane Analyst"
  },
  "patch": {
    "branchName": "bugfix/run_20260618_153045_x7k2m9-notification-label-shows-claimsubmitted",
    "baseBranch": "main",
    "changedFiles": [
      "healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx"
    ],
    "bugSummary": "Notification type chip displays ClaimSubmitted without a space.",
    "rootCauseSummary": "getNotificationTypeName() returned camelCase label.",
    "commitCount": 0
  },
  "validation": {
    "passed": true,
    "buildPassed": true,
    "testsPassed": true,
    "testSummary": "backend: 6 passed, 0 failed; frontend: not run",
    "failureReason": null
  },
  "review": {
    "pending": true,
    "canApprove": true,
    "canReject": true,
    "checklist": [
      "Review 1 changed file(s) on branch bugfix/run_...",
      "Backend build passed",
      "Tests passed (backend: 6 passed...)",
      "Confirm root cause and fix match the reported bug",
      "Approve only if acceptable for a PR (PR creation is a separate step)"
    ]
  },
  "email": {
    "subject": "[Review] Bug fix ready: Notification label shows ClaimSubmitted (run_20260618_153045_x7k2m9)",
    "bodyPlain": "Bug-fix run run_20260618_153045_x7k2m9 is ready for manual review.\n\n...",
    "bodyHtml": "<h2>Bug-fix review: Notification label shows ClaimSubmitted</h2>..."
  },
  "api": {
    "approve": {
      "method": "POST",
      "path": "/runs/run_20260618_153045_x7k2m9/approve",
      "bodyExample": {
        "approvedBy": "reviewer@example.com",
        "comment": "Looks good",
        "createPr": false
      }
    },
    "reject": {
      "method": "POST",
      "path": "/runs/run_20260618_153045_x7k2m9/reject",
      "bodyExample": {
        "rejectedBy": "reviewer@example.com",
        "reason": "Fix scope too broad"
      }
    }
  },
  "links": {
    "self": "http://127.0.0.1:4400/runs/run_20260618_153045_x7k2m9",
    "artifacts": "http://127.0.0.1:4400/runs/run_20260618_153045_x7k2m9/artifacts",
    "approvalSummary": "http://127.0.0.1:4400/runs/run_20260618_153045_x7k2m9/approval-summary"
  },
  "artifactsPath": "automation/artifacts/run_20260618_153045_x7k2m9"
}
```

---

## Sample: Approval webhook query

**Incoming GET** (user clicks Approve in email)

```
GET http://localhost:5678/webhook/bugfix-approve?runId=run_20260618_153045_x7k2m9&action=approve&reviewer=lead@example.com
```

**n8n Webhook node output:**

```json
{
  "headers": {
    "host": "localhost:5678",
    "user-agent": "Mozilla/5.0 ..."
  },
  "params": {},
  "query": {
    "runId": "run_20260618_153045_x7k2m9",
    "action": "approve",
    "reviewer": "lead@example.com"
  },
  "body": {}
}
```

**Reject webhook:**

```
GET http://localhost:5678/webhook/bugfix-reject?runId=run_20260618_153045_x7k2m9&action=reject&reason=Needs+more+tests
```

---

## Sample: Approve request

**Request** `POST /runs/:id/approve`

```json
{
  "approvedBy": "engineering.lead@example.com",
  "comment": "Fix is minimal and validation passed",
  "createPr": false
}
```

**Response** `200`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "approved",
  "approval": {
    "required": true,
    "status": "approved",
    "approvedBy": "engineering.lead@example.com",
    "approvedAt": "2026-06-18T15:45:00.000Z",
    "rejectedBy": null,
    "rejectedAt": null,
    "rejectedReason": null,
    "comment": "Fix is minimal and validation passed"
  },
  "message": "Approved. No PR created — call POST /runs/:id/create-pr when ready."
}
```

---

## Sample: Reject request

**Request** `POST /runs/:id/reject`

```json
{
  "rejectedBy": "engineering.lead@example.com",
  "reason": "Validation passed but fix touches unrelated files"
}
```

**Response** `200`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "rejected",
  "approval": {
    "status": "rejected",
    "rejectedBy": "engineering.lead@example.com",
    "rejectedAt": "2026-06-18T15:45:30.000Z",
    "rejectedReason": "Validation passed but fix touches unrelated files"
  },
  "message": "Run rejected. No PR will be created."
}
```

---

## Sample: Create PR response

**Request** `POST /runs/:id/create-pr`

```json
{
  "draft": false
}
```

**Response** `201`

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "pr_created",
  "git": {
    "baseBranch": "main",
    "branchName": "bugfix/run_20260618_153045_x7k2m9-notification-label-shows-claimsubmitted",
    "commits": [
      {
        "sha": "abc1234567890abcdef1234567890abcdef12345678",
        "message": "fix: Notification label shows ClaimSubmitted"
      }
    ],
    "pushed": true,
    "prUrl": "https://github.com/Hishitha-GJ/react_project_Health_Insurance_Claim_Management/pull/42",
    "prNumber": 42
  },
  "message": "PR created: https://github.com/Hishitha-GJ/react_project_Health_Insurance_Claim_Management/pull/42"
}
```

---

## Sample: Webhook response body

**Respond to Webhook** (shown in browser after click)

```html
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 640px; margin: 2rem auto;">
  <h1>Decision recorded</h1>
  <p>Run <code>run_20260618_153045_x7k2m9</code> has been <strong>approved</strong>.</p>
  <p>A pull request will be opened and the requester will be notified by email.</p>
  <p style="color:#666;font-size:0.9rem;">You may close this tab.</p>
</body>
</html>
```

---

## Sample: Error responses

**401 Unauthorized**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key."
  }
}
```

**503 Repo lock**

```json
{
  "error": {
    "code": "REPO_LOCK_HELD",
    "message": "Another run is active. Wait for completion or cancel it.",
    "activeRunId": "run_20260618_140000_abc123"
  }
}
```

**502 PR failed**

```json
{
  "runId": "run_20260618_153045_x7k2m9",
  "status": "failed",
  "git": { "pushed": false, "prUrl": null },
  "error": {
    "code": "PR_CREATION_FAILED",
    "message": "git push failed: permission denied (requested by engineering.lead@example.com)"
  }
}
```

---

# Email templates

## Approval email template

**Subject:** `{{ $json.email.subject }}`  
(from orchestrator approval-summary, or build manually)

**To:** `{{ $vars.REVIEWER_EMAIL }}`

**HTML body** (Node 11 output — insert `approveUrl` / `rejectUrl`):

```html
<!DOCTYPE html>
<html>
<body style="font-family: Segoe UI, Arial, sans-serif; color: #222; max-width: 680px;">
  <h2 style="margin-bottom: 0.25rem;">Bug fix ready for review</h2>
  <p style="color: #555; margin-top: 0;">
    Run <code>{{ runId }}</code> · Branch <code>{{ patch.branchName }}</code>
  </p>

  <h3>Bug</h3>
  <p><strong>{{ bug.title }}</strong></p>
  <p>Reporter: {{ bug.reporterEmail }}</p>

  <h3>Summary</h3>
  <p>{{ patch.bugSummary }}</p>

  <h3>Root cause</h3>
  <p>{{ patch.rootCauseSummary }}</p>

  <h3>Files changed ({{ patch.changedFiles.length }})</h3>
  <ul>
    {{#each patch.changedFiles}}
    <li><code>{{ this }}</code></li>
    {{/each}}
  </ul>

  <h3>Local validation</h3>
  <table cellpadding="6" style="border-collapse: collapse;">
    <tr><td>Overall passed</td><td><strong>{{ validation.passed }}</strong></td></tr>
    <tr><td>Build passed</td><td>{{ validation.buildPassed }}</td></tr>
    <tr><td>Tests passed</td><td>{{ validation.testsPassed }}</td></tr>
    <tr><td>Summary</td><td>{{ validation.testSummary }}</td></tr>
  </table>
  {{#if validation.failureReason}}
  <p style="color: #b45309;">Note: {{ validation.failureReason }}</p>
  {{/if}}

  <h3>Reviewer checklist</h3>
  <ol>
    {{#each review.checklist}}
    <li>{{ this }}</li>
    {{/each}}
  </ol>

  <p style="margin: 2rem 0;">
    <a href="{{ approveUrl }}"
       style="background:#16a34a;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;margin-right:12px;">
      Approve fix
    </a>
    <a href="{{ rejectUrl }}"
       style="background:#dc2626;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
      Reject fix
    </a>
  </p>

  <p style="color:#666;font-size:0.85rem;">
    Approving does not auto-merge. A PR will be opened after approval for final GitHub review.<br>
    Artifacts: <code>{{ artifactsPath }}</code>
  </p>
</body>
</html>
```

**Plain-text fallback:**

```text
Bug fix ready for review

Run ID: {{ runId }}
Branch: {{ patch.branchName }}
Reporter: {{ bug.reporterEmail }}

SUMMARY
{{ patch.bugSummary }}

ROOT CAUSE
{{ patch.rootCauseSummary }}

VALIDATION
- passed: {{ validation.passed }}
- buildPassed: {{ validation.buildPassed }}
- testsPassed: {{ validation.testsPassed }}
- testSummary: {{ validation.testSummary }}

APPROVE: {{ approveUrl }}
REJECT:  {{ rejectUrl }}

Artifacts: {{ artifactsPath }}
```

---

## PR notification email template

**Subject:** `[Fixed] {{ bug.title }} — PR #{{ git.prNumber }}`

**To:** `{{ run.intake.reporter.email }}`

**HTML body:**

```html
<!DOCTYPE html>
<html>
<body style="font-family: Segoe UI, Arial, sans-serif; color: #222; max-width: 680px;">
  <h2>Your bug fix is ready for GitHub review</h2>

  <p>Hi,</p>
  <p>
    Your bug report <strong>{{ bug.title }}</strong> was processed by the automation pipeline,
    approved by a reviewer, and a pull request has been opened.
  </p>

  <table cellpadding="8" style="border-collapse: collapse; margin: 1rem 0;">
    <tr><td>Run ID</td><td><code>{{ runId }}</code></td></tr>
    <tr><td>Branch</td><td><code>{{ git.branchName }}</code></td></tr>
    <tr><td>Approved by</td><td>{{ approval.approvedBy }}</td></tr>
    <tr><td>Validation</td><td>{{ validation.testSummary }}</td></tr>
  </table>

  <p style="margin: 1.5rem 0;">
    <a href="{{ git.prUrl }}"
       style="background:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
      View pull request #{{ git.prNumber }}
    </a>
  </p>

  <h3>What was fixed</h3>
  <p>{{ analysis.bugSummary }}</p>

  <h3>Files changed</h3>
  <ul>
    {{#each analysis.changedFiles}}
    <li><code>{{ this }}</code></li>
    {{/each}}
  </ul>

  <p style="color:#666;font-size:0.85rem;">
    The PR is <strong>not auto-merged</strong>. A maintainer will review and merge on GitHub.<br>
    No deployment was triggered by this automation.
  </p>
</body>
</html>
```

**Plain-text fallback:**

```text
Your bug fix is ready for GitHub review

Bug: {{ bug.title }}
Run ID: {{ runId }}
PR: {{ git.prUrl }}
Approved by: {{ approval.approvedBy }}

Summary:
{{ analysis.bugSummary }}

The PR is not auto-merged. No deployment was triggered.
```

**Rejection notice variant** (WF-2 reject branch):

```
Subject: [Declined] {{ bug.title }} — fix not accepted

Your bug report was reviewed and the proposed fix was not accepted.

Run ID: {{ runId }}
Reason: {{ approval.rejectedReason }}
Reviewer: {{ approval.rejectedBy }}

No pull request was created. Please revise the report or submit a new bug.
```

---

# n8n variables summary

| Variable | Example | Used by |
|----------|---------|---------|
| `ORCHESTRATOR_URL` | `http://127.0.0.1:4400` | All HTTP nodes |
| `ORCHESTRATOR_API_KEY` | (secret) | Bearer auth |
| `REVIEWER_EMAIL` | `lead@example.com` | Approval email To |
| `N8N_WEBHOOK_BASE` | `http://localhost:5678/webhook` | Approve/reject links |
| `SMTP_FROM` | `automation@example.com` | Send Email |

---

# Implementation checklist

- [ ] Create WF-1 nodes 01–12 in n8n UI
- [ ] Create WF-2 nodes 01–10 with production webhook URLs
- [ ] Test with orchestrator running (`npm run dev`)
- [ ] Confirm poll stops at `awaiting_approval`
- [ ] Send test approval email to reviewer
- [ ] Click Approve → verify `approved` → `create-pr` → `pr_created`
- [ ] Confirm requester receives PR notification
- [ ] Test Reject path (no PR, rejection email)
- [ ] Later: swap Chat Trigger for Outlook/ServiceNow (same Node 3 payload)

---

# Related docs

| Doc | Topic |
|-----|-------|
| [BUG_AUTOMATION_CONTRACTS.md](../BUG_AUTOMATION_CONTRACTS.md) | Full API contract |
| [MANUAL_APPROVAL_FLOW.md](../orchestrator/MANUAL_APPROVAL_FLOW.md) | Approval gate |
| [PR_TEMPLATE_AUTOMATION.md](../orchestrator/PR_TEMPLATE_AUTOMATION.md) | PR body content |
| [bugfix-chat-demo.json](./bugfix-chat-demo.json) | Minimal single-workflow chat demo (all-in-one Code node) |
| [DEMO_WALKTHROUGH.md](../DEMO_WALKTHROUGH.md) | Live demo script |

---

# Note on exported JSON

This repo includes **`bugfix-chat-demo.json`** only — a simplified demo where one Code node handles start + poll + approve inline. It is **not** equivalent to WF-1 + WF-2 above.

Do **not** treat ad-hoc exports as production workflow until:
- Poll loop is a visible Wait → HTTP → IF cycle (or sub-workflow)
- Approval uses webhook-driven WF-2
- Email templates use orchestrator `approval-summary` endpoint

Build WF-1 and WF-2 manually from this blueprint for production readiness.
