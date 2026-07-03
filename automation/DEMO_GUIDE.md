# Demo Guide — Bug-Fix Automation

End-to-end walkthrough: **n8n webhook → orchestrator → Cursor agent → validation → manual approve**.

## What this demo proves

1. User reports a bug via **n8n webhook** (stand-in for email/ServiceNow)
2. **Orchestrator** creates a feature branch, runs Cursor agent (or dry-run), validates builds/tests
3. User sees **summary + artifacts** in the JSON response
4. User **approves** via webhook message (PR creation is Phase 7)

## Before you start

| Check | Command |
|-------|---------|
| Node 22+ | `node --version` |
| Git | `git --version` |
| .NET SDK | `dotnet --version` |
| Orchestrator `.env` | `REPO_ROOT`, `ORCHESTRATOR_API_KEY` set |
| n8n `.env` | `automation/n8n-local/.env` — same `ORCHESTRATOR_API_KEY` |

## Step 1 — Start services (3 terminals)

**Terminal 1 — Orchestrator**

```powershell
cd automation\orchestrator
npm run dev
```

**Terminal 2 — n8n**

```powershell
cd automation\n8n-local
copy .env.example .env
# Set ORCHESTRATOR_API_KEY (same as orchestrator)
npm install
npm start
```

## Step 2 — Import n8n workflow

1. Open `http://localhost:5678`
2. Import `automation/n8n/sdlc-automation-all-in-one.json`
3. Activate workflow
4. Test: `cd automation\n8n\scripts; .\test-webhook.ps1`

Details: [n8n/README.md](./n8n/README.md)

## Step 3 — Report demo bug (webhook)

Run the test script or POST JSON:

```powershell
cd automation\n8n\scripts
.\test-webhook.ps1
```

Sample body:

```json
{
  "message": "[BUG] Notification label shows ClaimSubmitted\n\ncomponent: frontend\narea: healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx\n\nOn /notifications the notification type displays ClaimSubmitted without a space.\nExpected: Claim Submitted"
}
```

Wait 1–3 minutes (longer if Cursor agent is live). The response returns:

- `runId` and feature branch name
- Bug summary and root cause
- Changed files
- Validation results (`buildPassed`, `testsPassed`)
- Approve command hint

## Step 4 — Inspect artifacts

```powershell
# Replace RUN_ID
dir automation\artifacts\RUN_ID
type automation\artifacts\RUN_ID\validation-summary.md
type automation\artifacts\RUN_ID\bug-summary.md
```

Or poll API:

```powershell
curl http://127.0.0.1:4400/runs/RUN_ID -H "Authorization: Bearer YOUR_API_KEY"
```

## Step 5 — Review and decide

Fetch reviewer summary (for email workflow):

```powershell
curl http://127.0.0.1:4400/runs/RUN_ID/approval-summary -H "Authorization: Bearer YOUR_API_KEY"
```

Use `email.subject` and `email.bodyPlain` in an n8n Send Email node.

**Approve via webhook:**

```powershell
.\test-webhook.ps1 -Message "approve run_YYYYMMDD_HHMMSS_xxxxxx"
```

**Reject via webhook:**

```powershell
.\test-webhook.ps1 -Message "reject run_YYYYMMDD_HHMMSS_xxxxxx Fix does not address root cause"
```

Approval records `status: approved` with **no PR** (`createPr: false`). PR creation is Phase 7.

See [orchestrator/MANUAL_APPROVAL_FLOW.md](./orchestrator/MANUAL_APPROVAL_FLOW.md).

## Step 6 — Demo talking points

| Topic | What to say |
|-------|-------------|
| Intake | "Webhook replaces email today; same API for Outlook/ServiceNow later" |
| Orchestrator | "Owns git safety, agent runs, validation — n8n stays thin" |
| Cursor | "Local agent patches feature branch; dry-run without API key" |
| Validation | "Backend build+tests gate; frontend build optional in demo mode" |
| Approval | "Human in the loop before any PR" |
| CI/CD | "Out of scope — runs after merge via normal pipeline" |

## Sample demo script (5 min)

| Min | Action |
|-----|--------|
| 0 | Show claim app UI (optional) |
| 1 | Show webhook test + orchestrator health |
| 2 | Run `test-webhook.ps1` with `[BUG]` message |
| 3 | Show run progressing (`status <runId>` if needed) |
| 4 | Walk artifacts folder + validation summary |
| 5 | `test-webhook.ps1 -Message "approve <runId>"` — note PR is manual Phase 7 |

## Troubleshooting

See [n8n/README.md](./n8n/README.md) and [REPO_RUNBOOK.md](./REPO_RUNBOOK.md).

| Symptom | Likely cause |
|---------|----------------|
| Dry-run, no changed files | No `CURSOR_API_KEY` |
| Validation failed | NuGet restore blocked or dirty repo |
| REPO_LOCK_HELD | Prior run active — `cancel <runId>` |

## Next phases

| Phase | Work |
|-------|------|
| 6 | Approval email notification |
| 7 | Git push + GitHub PR |
| 8 | Outlook/ServiceNow trigger swap |
