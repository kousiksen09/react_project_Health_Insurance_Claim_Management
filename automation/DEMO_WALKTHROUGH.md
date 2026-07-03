# Demo Walkthrough — Bug & PBI Automation via Azure DevOps

Step-by-step guide to run **both pipelines** end to end with **ADO as intake**:

- **Bug pipeline** — ADO Bug → analyze → patch → validate → AI review → approve (Gate 2) → PR
- **PBI pipeline** — ADO PBI/User Story → plan (Gate 1) → code → tests → validate → AI review → approve (Gate 2) → docs → PR → deploy → UAT → release

Estimated time: **20–40 minutes** per run (agent + validation time varies).

---

## Architecture

```
Azure DevOps (Bug or PBI state change)
        │
        ▼  Service Hook (Work item updated)
n8n  sdlc-automation-all-in-one.json  (ADO intake + dashboard + deploy)
        │
        ▼  POST /runs/start
Orchestrator  (port 4400 demo, 4401 PCI)
        │
        ├── type=bug  ──▶ analyzing → patch_created → validating → ai_review → awaiting_approval → pr_created
        │
        └── type=pbi  ──▶ planning → awaiting_plan_approval (Gate 1)
                                    → plan_approved → coding → test_generation → validating
                                    → ai_review → awaiting_approval (Gate 2)
                                    → doc_update → pr_created → deploying → deployed
                                    → awaiting_uat → released

Approvals (Gate 1, Gate 2, UAT): SDLC dashboard  /webhook/sdlc/dashboard  (or REST API)
ADO updates: comments + state transitions on the work item as the run progresses
```

Every orchestrator state change can also POST to `N8N_EVENT_WEBHOOK_URL` (optional deploy workflow).

---

## Prerequisites checklist

| Item | Verify |
|------|--------|
| Node.js 22+ | `node --version` |
| Git on PATH | `git --version` |
| .NET SDK (backend validation) | `dotnet --version` |
| Target repo cloned locally | `REPO_ROOT` in orchestrator `.env` / `.env.pci` |
| ADO PAT | Scopes: **Work Items (Read, write & manage)**, **Code (Read & write)**, **Pull Request (Read & write)** |
| Orchestrator env | `automation/orchestrator/.env` (demo) and/or `.env.pci` (PCI) |
| n8n local | `automation/n8n-local/.env` with matching `ORCHESTRATOR_API_KEY` and `ORCHESTRATOR_URL` |
| Cursor agent (optional) | `CURSOR_API_KEY`; use `CURSOR_DRY_RUN=true` for wiring tests without code changes |

### Which orchestrator instance?

| Target app | Start command | Port | Env file | Git host |
|------------|---------------|------|----------|----------|
| Demo (health insurance) | `npm run dev` | 4400 | `.env` | GitHub (`GIT_PROVIDER=github`) |
| PCI | `npm run dev:pci` | 4401 | `.env.pci` | Azure Repos (`GIT_PROVIDER=ado-repos`) |

For PCI, copy `.env.pci.example` → `.env.pci` and fill in secrets before first use.

---

## Part 0 — One-time setup

### Step 1: Configure the orchestrator

```powershell
cd automation\orchestrator
copy .env.example .env
# Edit .env — REPO_ROOT, ORCHESTRATOR_API_KEY, GITHUB_TOKEN (demo), ADO_ORG, ADO_PROJECT, ADO_PAT

npm install
```

For PCI (second app, same codebase):

```powershell
copy .env.pci.example .env.pci
# Edit .env.pci — REPO_ROOT, ADO_PAT, ORCHESTRATOR_API_KEY, validation commands already templated
```

Key ADO variables (both env files when using ADO intake):

| Variable | Example (PCI) |
|----------|----------------|
| `ADO_ORG` | `pwc-us-fmre` |
| `ADO_PROJECT` | `Private Capital Intelligence` |
| `ADO_REPO` | `PCI` (Azure Repos name; only when `GIT_PROVIDER=ado-repos`) |
| `ADO_PAT` | your PAT |
| `ADO_STATE_*` | Match your process template (defaults: Active, In Review, Resolved, Closed) |

Verify health:

```powershell
# Demo instance
npm run dev
# In another terminal:
Invoke-RestMethod http://127.0.0.1:4400/health

# PCI instance
npm run dev:pci
Invoke-RestMethod http://127.0.0.1:4401/health
```

Expect `prProviderConfigured: true` when GitHub token (demo) or ADO PAT + repo vars (PCI) are set.

### Step 2: Start n8n

```powershell
cd automation\n8n-local
copy .env.example .env
# ORCHESTRATOR_API_KEY must match the orchestrator instance you are demoing
# ORCHESTRATOR_URL=http://127.0.0.1:4400   (demo)  or  :4401 (PCI)

npm install
npm start
```

Open `http://localhost:5678`.

### Step 3: Import n8n workflow

Import **one** workflow and activate it:

| Workflow file | Purpose |
|---------------|---------|
| `automation/n8n/sdlc-automation-all-in-one.json` | ADO intake, deploy trigger, browser dashboard, all approval actions |

Copy webhook **Production URLs** from the n8n UI:

| Node | Path | Use |
|------|------|-----|
| ADO Service Hook | `/webhook/ado-work-item-intake` | ADO Service Hooks (Bug + PBI) |
| Orchestrator Event | `/webhook/orchestrator-deploy-trigger` | Optional deploy loop (`N8N_EVENT_WEBHOOK_URL`) |
| GET Dashboard | `/webhook/sdlc/dashboard` | Browser UI for report / track / approve |

### Step 4: Create ADO Service Hooks

In Azure DevOps → your project → **Project settings** → **Service hooks** → **Create subscription**:

Create **two** subscriptions (one per work item type), both pointing at the same n8n webhook URL:

| Setting | Bug subscription | PBI subscription |
|---------|------------------|------------------|
| Event | Work item updated | Work item updated |
| Work item type | Bug | Product Backlog Item *(or User Story / Feature — match your template)* |
| State filter | Your “start automation” state *(e.g. **Ready for Dev**, **Approved**)* | Same |
| Action | Web Hooks | Web Hooks |
| URL | n8n `ado-work-item-intake` production URL | Same |

The n8n script (`process-ado-webhook.js`) also filters on `TRIGGER_STATES` (`ready for dev`, `approved` by default). Align ADO hook filters with that list, or edit `TRIGGER_STATES` in the Code node.

**Important:** Point n8n’s `ORCHESTRATOR_URL` at the correct port (4400 vs 4401) for the app you are automating.

### Step 5 (optional): Deploy loop

1. Set `N8N_EVENT_WEBHOOK_URL` in orchestrator `.env` to the production URL of the **Orchestrator Event** webhook (`/webhook/orchestrator-deploy-trigger`).
2. Edit the deploy Code node for your CI (GitHub Actions for demo; Azure Pipelines REST for PCI).
3. Without this, PRs still get created — report deploy manually via `POST /runs/:id/deploy-status`.

---

## Part 1 — Bug automation (ADO → PR)

### Step 1: Prepare an ADO Bug

1. In Azure DevOps, create or open a **Bug**.
2. Fill in **Title**, **Description** (repro steps), **Severity**, and **Area Path** (frontend/backend hints help routing).
3. Assign if desired (assignee email becomes the reporter in the orchestrator).

### Step 2: Trigger the run

Move the Bug to your trigger state (e.g. **Ready for Dev**).

**What happens automatically:**

| Order | Status | What runs |
|-------|--------|-----------|
| 1 | `queued` | Run accepted, feature branch created from `DEFAULT_BASE_BRANCH` |
| 2 | `analyzing` | Repo inspection + intake analysis |
| 3 | `patch_created` | Cursor agent applies fix on feature branch |
| 4 | `validating` | `dotnet build` / tests / optional frontend build |
| 5 | `ai_review` | Second agent pass on the diff (non-blocking) |
| 6 | `awaiting_approval` | **Stops for human review (Gate 2)** |

ADO receives a comment when the run starts and when the PR is created.

**Verify in n8n:** Executions tab → latest **ADO SDLC Workflow Automation** run → should show `ok: true` and a `runId`.

**Verify in orchestrator:**

```powershell
$headers = @{ Authorization = "Bearer YOUR_ORCHESTRATOR_API_KEY" }
Invoke-RestMethod "http://127.0.0.1:4400/runs" -Headers $headers
# Or for PCI: http://127.0.0.1:4401/runs
```

### Step 3: Review the patch (Gate 2)

**Option A — SDLC Dashboard** (recommended): open `/webhook/sdlc/dashboard` → **Track** tab → enter Run ID → **Approve** tab → **Load** → Approve or Reject.

Review artifacts:

```powershell
$runId = "run_YYYYMMDD_HHMMSS_xxxxxx"
dir automation\artifacts\$runId
```

Key files: `bug-summary.md`, `root-cause.md`, `validation.json`, `changed-files.json`, `ai-review.json`.

Or fetch the approval summary:

```powershell
Invoke-RestMethod "http://127.0.0.1:4400/runs/$runId/approval-summary" -Headers $headers
```

**Option B — REST API:**

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/approve" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"approvedBy":"reviewer@example.com","comment":"Fix looks correct","createPr":true}'
```

Setting `"createPr": true` approves and creates the PR in one step.

To reject via dashboard: **Approve** tab → **Load** → **Reject**, or use REST:

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/reject" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"rejectedBy":"reviewer@example.com","reason":"Needs more test coverage"}'
```

### Step 4: PR created

After approval (with `createPr: true`, or a separate `create-pr` command):

| Step | Action |
|------|--------|
| Commit + push | `git push -u origin <feature-branch>` |
| Open PR | GitHub REST (demo) or Azure Repos REST (PCI) |
| Status | `pr_created` |
| ADO | Comment with PR link |

```powershell
Invoke-RestMethod "http://127.0.0.1:4400/runs/$runId" -Headers $headers
# Check git.prUrl, git.prNumber
```

Open the PR in GitHub or Azure DevOps and merge manually when ready. The orchestrator does **not** auto-merge on bug approval (merge happens on PBI `uat-approve` release path).

---

## Part 2 — PBI automation (ADO → plan → PR → UAT → release)

### Step 1: Prepare an ADO PBI / User Story

1. Create a **Product Backlog Item** (or User Story).
2. Fill in **Title**, **Description**, and **Acceptance Criteria**.
3. Optional: story points, priority, area path.

### Step 2: Trigger the run

Move the item to your trigger state (same as bugs).

**What happens automatically:**

| Order | Status | What runs |
|-------|--------|-----------|
| 1 | `planning` | Agent generates structured implementation plan |
| 2 | `awaiting_plan_approval` | **Gate 1 — plan review** |
| 3 | `plan_approved` | *(after human approval)* |
| 4 | `coding` | Multi-turn agent loop (one plan task per turn) |
| 5 | `test_generation` | Agent adds/extends tests |
| 6 | `validating` | Build + test gates |
| 7 | `ai_review` | Non-blocking review pass |
| 8 | `awaiting_approval` | **Gate 2 — patch review** |
| 9 | `doc_update` | README/CHANGELOG update |
| 10 | `pr_created` | Push + open PR |
| 11 | `deploying` → `deployed` | CI deploy *(if wired)* |
| 12 | `awaiting_uat` | **UAT gate** |
| 13 | `released` | Merge PR, tag, close ADO item *(after uat-approve)* |

Plans that require DB migrations, exceed `MAX_PLAN_LOC`, or flag high-severity risk are **auto-blocked** — split the PBI in ADO and re-trigger.

### Step 3: Gate 1 — Approve the plan

**SDLC Dashboard:** **Approve** tab → enter Run ID → **Load** → **View plan** → **Approve plan** (or **Reject plan**).

**REST API:**

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/approve-plan" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"approvedBy":"tech-lead@example.com","comment":"Plan approved"}'
```

After approval, coding starts automatically. Monitor on the dashboard **Track** tab.

Plan artifacts: `plan.json`, `plan-summary.md` under `automation/artifacts/<runId>/`.

### Step 4: Gate 2 — Approve the implementation

Same as bug Gate 2: dashboard **Approve** tab → **Load** → **Approve** (or **Reject**).

For PBIs, approval triggers **doc update → PR creation** automatically (no separate `create-pr` needed).

### Step 5: Deploy (optional)

If `N8N_EVENT_WEBHOOK_URL` points at `/webhook/orchestrator-deploy-trigger`, deploy starts when status becomes `pr_created`.

Otherwise report deploy manually:

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/deploy-status" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"status":"succeeded","environment":"staging","url":"https://staging.example.com","note":"Manual deploy OK"}'
```

When deploy succeeds, status moves to `awaiting_uat`.

### Step 6: UAT gate — Release

**SDLC Dashboard — Approve tab:** Load the run → **UAT approve and release** (or **UAT reject**).

**REST API:**

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/uat-approve" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"approvedBy":"qa@example.com","comment":"UAT passed"}'
```

To reject UAT:

```powershell
Invoke-RestMethod -Method POST "http://127.0.0.1:4400/runs/$runId/uat-reject" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"rejectedBy":"qa@example.com","reason":"Regression found on staging"}'
```

**Release actions:**

1. Squash-merge the PR
2. Cut a semver tag (`patch` / `minor` / `major` from plan for PBIs)
3. Transition ADO work item to `ADO_STATE_DONE` with a release comment

---

## Dashboard action reference

Use the **Approve** tab in `/webhook/sdlc/dashboard`, or `POST /webhook/sdlc/action` with JSON `{ "action": "...", "runId": "..." }`:

| action | When | Purpose |
|--------|------|---------|
| `status` | Any time | Show run summary |
| `view-plan` | `awaiting_plan_approval` | Show structured plan (PBI) |
| `approve-plan` | `awaiting_plan_approval` | Gate 1 approve |
| `reject-plan` | `awaiting_plan_approval` | Gate 1 reject |
| `approve` | `awaiting_approval` | Gate 2 approve |
| `reject` | `awaiting_approval` | Gate 2 reject |
| `create-pr` | `approved` (bugs) | Open PR if not auto-created |
| `uat-approve` | `awaiting_uat` | Merge + tag + close ADO item |
| `uat-reject` | `awaiting_uat` | Reject UAT |
| `cancel` | Active run | Cancel and release repo lock |

Same operations are available via the REST API under `/runs/:id/...`.

---

## Monitoring a run

| Where | What to look at |
|-------|-----------------|
| n8n **Executions** | ADO webhook ack, chat command responses |
| `GET /runs/:id` | Live status, validation, git, plan, deploy, UAT |
| `GET /runs/:id/approval-summary` | Reviewer-friendly summary |
| `automation/artifacts/<runId>/` | All generated files on disk |
| ADO work item | Comments + state updates from the pipeline |

---

## Demo talking points

| Topic | Say |
|-------|-----|
| Intake | "ADO Service Hook fires on state change — no polling, no manual copy-paste" |
| Routing | "Same webhook + orchestrator; Bug vs PBI decided by `System.WorkItemType`" |
| Safety | "Agent only touches a feature branch; base branch unchanged until PR merge" |
| Gates | "PBI has two human gates (plan + patch) plus UAT before release" |
| Git host | "Demo uses GitHub PRs; PCI uses Azure Repos — same orchestrator code, different `GIT_PROVIDER`" |
| Validation | "Local build mirrors CI commands configured per app in `.env` / `.env.pci`" |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| ADO hook fires but n8n shows `skipped: State 'X' not in TRIGGER_STATES` | Align ADO state filter with `TRIGGER_STATES` in `process-ado-webhook.js` |
| `Missing ORCHESTRATOR_API_KEY` in n8n | Set `automation/n8n-local/.env`; must match orchestrator instance |
| Wrong app targeted | Check n8n `ORCHESTRATOR_URL` (4400 demo vs 4401 PCI) |
| `REPO_LOCK_HELD` | Another run is active — `status` + approve/reject/cancel it first |
| `prProviderConfigured: false` | Demo: set `GITHUB_TOKEN`. PCI: set `ADO_PAT`, `ADO_ORG`, `ADO_PROJECT`, `ADO_REPO` |
| `PLANNING_DRY_RUN` / run failed in planning | `CURSOR_DRY_RUN=true` — expected for PBI until live agent is enabled |
| No files changed | Set `CURSOR_API_KEY` and `CURSOR_DRY_RUN=false` |
| `git push` failed | Ensure git credentials for origin (GitHub PAT or Azure Repos) |
| Plan auto-blocked | Split PBI in ADO; reduce scope below `MAX_PLAN_LOC` |
| Deploy never starts | Set `N8N_EVENT_WEBHOOK_URL` or POST deploy-status manually |

---

## Quick reference — REST endpoints

All require `Authorization: Bearer <ORCHESTRATOR_API_KEY>`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/runs/start` | Start run (normally called by n8n, not manually for ADO demos) |
| GET | `/runs` | List runs |
| GET | `/runs/:id` | Run detail |
| GET | `/runs/:id/approval-summary` | Reviewer summary |
| POST | `/runs/:id/approve-plan` | PBI Gate 1 |
| POST | `/runs/:id/reject-plan` | PBI Gate 1 reject |
| POST | `/runs/:id/approve` | Gate 2 |
| POST | `/runs/:id/reject` | Gate 2 reject |
| POST | `/runs/:id/create-pr` | Push + open PR |
| POST | `/runs/:id/deploy-status` | Report CI/deploy result |
| POST | `/runs/:id/uat-approve` | UAT pass → release |
| POST | `/runs/:id/uat-reject` | UAT fail |
| POST | `/runs/:id/cancel` | Cancel run |

---

## Related docs

| Doc | Topic |
|-----|-------|
| [orchestrator/README.md](./orchestrator/README.md) | Full orchestrator config, ADO setup, multi-app `.env.pci` |
| [n8n/N8N_UI_GUIDE.md](./n8n/N8N_UI_GUIDE.md) | SDLC dashboard + Executions UI |
| [n8n-local/README.md](./n8n-local/README.md) | Local n8n install |
| [orchestrator/MANUAL_APPROVAL_FLOW.md](./orchestrator/MANUAL_APPROVAL_FLOW.md) | Approval API details |
| [REPO_RUNBOOK.md](./REPO_RUNBOOK.md) | Local dev + validation commands |
