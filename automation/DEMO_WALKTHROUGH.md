# Demo Walkthrough — Bug-Fix Automation (End to End)

Complete demo script: **n8n webhook intake → orchestrator → Cursor agent → validation → manual approval → GitHub PR**.

Estimated time: **15–20 minutes** (agent run varies).

## Prerequisites checklist

| Item | Verify |
|------|--------|
| Node 22+ | `node --version` |
| Git + remote `origin` | `git remote -v` |
| .NET SDK | `dotnet --version` |
| Orchestrator `.env` | `REPO_ROOT`, `ORCHESTRATOR_API_KEY` |
| Cursor (optional) | `CURSOR_API_KEY` for live agent |
| GitHub (Phase 7) | `GITHUB_TOKEN` with `repo` scope |
| n8n `.env` | `ORCHESTRATOR_API_KEY` in `automation/n8n-local/.env` |

## Architecture (one picture)

```
n8n webhook → orchestrator :4400 → feature branch + Cursor agent
                ↓
         validate (dotnet/npm)
                ↓
         awaiting_approval → reviewer approves
                ↓
         git push → GitHub PR (no auto-merge)
```

---

## Part 1 — Start services

### Terminal 1: Orchestrator

```powershell
cd automation\orchestrator
copy .env.example .env
# Edit: REPO_ROOT, ORCHESTRATOR_API_KEY, GITHUB_TOKEN, CURSOR_API_KEY (optional)
npm run dev
```

Verify:

```powershell
curl http://127.0.0.1:4400/health
```

Expect `"githubConfigured": true` when `GITHUB_TOKEN` is set.

### Terminal 2: n8n

```powershell
cd automation\n8n-local
copy .env.example .env
# Edit: ORCHESTRATOR_API_KEY (same as orchestrator)
npm install
npm start
```

Open `http://localhost:5678` → import `automation/n8n/bugfix-webhook-demo.json` → activate.

### Terminal 3 (optional): Application UI

```powershell
cd HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet run --launch-profile https

cd healthinsuranceclaim_frontend
npm run dev
```

---

## Part 2 — Report a bug (n8n webhook)

```powershell
cd automation\n8n\scripts
.\test-webhook.ps1
```

Or POST to `http://localhost:5678/webhook/bugfix-demo` with:

```json
{
  "message": "[BUG] Notification label shows ClaimSubmitted\n\ncomponent: frontend\narea: healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx\n\nOn /notifications the type chip shows ClaimSubmitted instead of Claim Submitted."
}
```

**What happens:**

| Status | Step |
|--------|------|
| `queued` | Run accepted |
| `analyzing` | Repo + intake analysis |
| `patch_created` | Cursor agent (or dry-run) |
| `validating` | `dotnet build` / `dotnet test` / optional `npm run build` |
| `awaiting_approval` | Stops for human review |

Response JSON returns run ID, branch, summary, validation, and approve/reject hints.

---

## Part 3 — Review artifacts

```powershell
$runId = "run_YYYYMMDD_HHMMSS_xxxxxx"
dir automation\artifacts\$runId
```

Key files:

| File | Purpose |
|------|---------|
| `bug-summary.md` | Agent summary |
| `root-cause.md` | Root cause |
| `validation.json` | Build/test results |
| `approval.json` | Reviewer email payload |
| `changed-files.json` | Diff file list |

Or fetch reviewer summary:

```powershell
curl http://127.0.0.1:4400/runs/$runId/approval-summary `
  -H "Authorization: Bearer YOUR_ORCHESTRATOR_API_KEY"
```

Use `email.subject` and `email.bodyPlain` in an n8n **Send Email** node for production-style approval.

---

## Part 4 — Manual approval

### Option A — n8n webhook

```powershell
.\test-webhook.ps1 -Message "approve run_YYYYMMDD_HHMMSS_xxxxxx"
```

### Option B — API

```powershell
curl -X POST "http://127.0.0.1:4400/runs/$runId/approve" `
  -H "Authorization: Bearer YOUR_ORCHESTRATOR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"approvedBy":"reviewer@example.com","comment":"Fix looks correct","createPr":false}'
```

Status → **`approved`**. No PR yet.

To reject instead:

```powershell
curl -X POST "http://127.0.0.1:4400/runs/$runId/reject" `
  -H "Authorization: Bearer YOUR_ORCHESTRATOR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"rejectedBy":"reviewer@example.com","reason":"Needs more tests"}'
```

---

## Part 5 — Create GitHub PR (Phase 7)

```powershell
curl -X POST "http://127.0.0.1:4400/runs/$runId/create-pr" `
  -H "Authorization: Bearer YOUR_ORCHESTRATOR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"draft":false}'
```

**Orchestrator actions:**

1. Commit pending changes on feature branch (if any)
2. `git push -u origin bugfix/run_...`
3. Open PR via GitHub REST API
4. Status → **`pr_created`**

Response includes `git.prUrl`. Open it in the browser.

**PR body includes:** bug summary, root cause, files changed, validation table, branch info, risk notes, approval audit.

**Important:** PR is **not auto-merged**. Review and merge manually on GitHub.

### Combined approve + PR

```powershell
curl -X POST "http://127.0.0.1:4400/runs/$runId/approve" `
  -H "Authorization: Bearer YOUR_ORCHESTRATOR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"approvedBy":"reviewer@example.com","createPr":true}'
```

---

## Part 6 — Demo talking points

| Topic | Say |
|-------|-----|
| Intake | "Chat stands in for email/ServiceNow — same orchestrator API" |
| Safety | "Agent runs on feature branch; main untouched until PR merge" |
| Validation | "Local dotnet/npm gates; honest about frontend strictness" |
| Approval | "Human gate before any push to GitHub" |
| PR | "Structured body with risk notes; no auto-merge, no CI/CD hook" |
| Future | "Swap chat for Outlook webhook; add ServiceNow ticket ID to intake" |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Dry-run, no files changed | Set `CURSOR_API_KEY` |
| `GITHUB_NOT_CONFIGURED` | Set `GITHUB_TOKEN` in orchestrator `.env` |
| `git push` failed | Check PAT scope, remote access, branch permissions |
| `REPO_LOCK_HELD` | Complete or cancel/reject active run |
| NuGet test restore fails | Network to nuget.org (see REPO_RUNBOOK §6.6) |
| PR already exists | Orchestrator links existing open PR for branch |

---

## Related docs

| Doc | Topic |
|-----|-------|
| [DEMO_GUIDE.md](./DEMO_GUIDE.md) | Shorter quick-start |
| [MANUAL_APPROVAL_FLOW.md](./orchestrator/MANUAL_APPROVAL_FLOW.md) | Approval API |
| [PR_TEMPLATE_AUTOMATION.md](./orchestrator/PR_TEMPLATE_AUTOMATION.md) | PR body template |
| [n8n/README.md](./n8n/README.md) | Chat workflow |
| [REPO_RUNBOOK.md](./REPO_RUNBOOK.md) | Local dev + validation |
