# SDLC Automation Orchestrator

Local HTTP service that runs two pipelines from a single Azure DevOps intake:

- **Bug-fix pipeline** — fast path: analyze → patch → validate → AI review → approve → PR.
- **PBI pipeline** — full SDLC: plan (Gate 1, human-approved) → code → tests → validate →
  AI review → approve (Gate 2) → docs → PR → deploy → UAT → release.

Both bugs and PBIs are ingested from ADO Service Hooks (see
[ADO setup](#azure-devops-setup) below); email/chat intake remain available for local
demos and always default to the bug pipeline.

See [`CURSOR_INTEGRATION.md`](./CURSOR_INTEGRATION.md) and
[`../REPO_RUNBOOK.md`](../REPO_RUNBOOK.md) §6 (validation commands).

---

## Pipeline overview

```
ADO Service Hook ──▶ n8n (process-ado-webhook.js) ──▶ POST /runs/start
                                                              │
                        ┌─────────────────────────────────────┴───────────────────────┐
                        ▼ type=bug                                    type=pbi ▼
          analyzing → patch_created → validating         planning → awaiting_plan_approval
                                │                                        │  (Gate 1 — chat: approve-plan / reject-plan)
                                │                                        ▼
                                │                              plan_approved → coding → test_generation
                                │                                        │
                                └───────────────► ai_review ◄────────────┘
                                                     │
                                          awaiting_approval  (Gate 2 — chat: approve / reject)
                                                     │
                                    bug: pr_created ◄┴► pbi: doc_update → pr_created
                                                     │
                                        deploying → deployed → awaiting_uat
                                                     │        (chat: uat-approve / uat-reject)
                                                     ▼
                                                  released  (PR merged, tag cut, ADO item closed)
```

Every state transition also fires an outbound webhook (`N8N_EVENT_WEBHOOK_URL`) so n8n can
drive deploy triggers or notifications without polling.

---

## What works today

| Feature | Status |
|---------|--------|
| Run lifecycle (branch → agent → validate → approve gate) | Implemented |
| Cursor SDK local agent / dry-run | Phase 4 |
| JSON run persistence | Phase 4 |
| **Local validation** | **Phase 5** — backend build/test, optional frontend build |
| `validation.json` + `validation-summary.md` artifacts | Phase 5 |
| `testGapRecommendations` when coverage weak | Phase 5 |

---

## What is NOT implemented (by design)

| Module | Phase |
|--------|-------|
| Git push + GitHub PR | 7 |
| n8n approval email | 6 |

---

## Validation (Phase 5)

| Variable | Default | Description |
|----------|---------|-------------|
| `STRICT_VALIDATION` | `false` | When `true`, frontend build must pass |
| `VALIDATION_TIMEOUT_MS` | `600000` | Per-command timeout |
| `VALIDATION_SKIP_FRONTEND_BUILD` | `false` | Skip `npm run build` |
| `VALIDATION_BACKEND_BUILD_CMD` | auto | Override backend build |
| `VALIDATION_BACKEND_TEST_CMD` | auto | Override backend test |

`GET /runs/:id` returns:

```json
{
  "validation": {
    "passed": true,
    "buildPassed": true,
    "testsPassed": true,
    "testSummary": "backend: 6 passed, 0 failed; frontend: not run",
    "failureReason": null,
    "testGapRecommendations": [...]
  }
}
```

---

## Prerequisites

- Node.js **22+**
- Application repo at `REPO_ROOT`
- Git on PATH
- Copy `.env.example` → `.env`
- `CURSOR_API_KEY` for live agent runs (optional for dry-run demo)

---

## Setup

```powershell
cd automation\orchestrator
copy .env.example .env
# Edit .env — set REPO_ROOT, ORCHESTRATOR_API_KEY, optionally CURSOR_API_KEY

npm install
npm run dev          # demo / health-insurance app (port 4400, loads .env)
npm run dev:pci      # PCI app (port 4401, loads .env.pci)
```

Server: `http://127.0.0.1:4400` (demo) or `http://127.0.0.1:4401` (PCI)

For PCI, copy `.env.pci.example` → `.env.pci` and fill in `ADO_PAT`, `ORCHESTRATOR_API_KEY`, and `CURSOR_API_KEY`.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPO_ROOT` | Yes | — | Path to application repo root |
| `ORCHESTRATOR_API_KEY` | Yes* | — | Bearer token for `/runs/*` |
| `CURSOR_API_KEY` | No | — | Cursor SDK (dry-run if unset) |
| `CURSOR_MODEL` | No | `composer-2.5` | Agent model |
| `CURSOR_DRY_RUN` | No | `false` | Skip agent even if key set |
| `ALLOW_DIRTY_REPO` | No | `false` | Allow uncommitted changes before branch |
| `DEFAULT_BASE_BRANCH` | No | `main` | Branch base |
| `REPO_LOCK` | No | `true` | One active mutating run |
| `GIT_PROVIDER` | No | `github` | `github` or `ado-repos` — which host owns PR creation/merge/tags |
| `GITHUB_TOKEN` | No | — | Phase 7, required when `GIT_PROVIDER=github` |
| `ADO_REPO` | No | `ADO_PROJECT` | Azure Repos git repo name, required when `GIT_PROVIDER=ado-repos` |
| `ORCHESTRATOR_ENV_FILE` | No | `.env` | Alternate env filename, for running multiple instances from one codebase |
| `DATA_DIR` | No | `data` | Where run state is persisted; override to isolate instances |

\*If missing, `/runs` returns `503 AUTH_NOT_CONFIGURED`.

---

## Azure DevOps setup

1. **Personal Access Token** — Azure DevOps → User settings → Personal access tokens →
   New Token, scope **Work Items (Read, write & manage)**. Put it in `ADO_PAT`.
2. **Orchestrator `.env`** — set `ADO_ORG`, `ADO_PROJECT`, `ADO_PAT`, and optionally the
   `ADO_STATE_*` overrides if your process template uses different state names.
3. **Service Hooks** — Project Settings → Service Hooks → Create subscription, twice:
   - Trigger **Work item updated**, Filter **Work item type = Product Backlog Item**
     (or User Story/Feature, matching your process template), Filter **State = Ready for Dev**
     (or whatever state means "start automation").
   - Trigger **Work item updated**, Filter **Work item type = Bug**, same state filter.
   - Action: **Web Hooks**, URL = n8n `/webhook/ado-work-item-intake`
     (import `automation/n8n/sdlc-automation-all-in-one.json` first).
4. **n8n environment** — in `automation/n8n-local/.env`, set
   `ORCHESTRATOR_URL`, `ORCHESTRATOR_API_KEY`, `ADO_ORG`.
5. **Approvals** — open `/webhook/sdlc/dashboard` (same workflow) for plan/patch/UAT
   approvals, or call the orchestrator REST API directly.
6. **Deploy loop (optional)** — set `N8N_EVENT_WEBHOOK_URL` in the orchestrator `.env` to
   `/webhook/orchestrator-deploy-trigger`, and edit the deploy Code node for your CI.
7. **Release** — `uat-approve` merges the PR (squash), tags a semver release (bumped by
   the plan's `releaseImpact` for PBIs, patch for bugs), and transitions the ADO item to
   `ADO_STATE_DONE`.

Auto-block rules (Gate 1 never reaches a human for these): the plan requires a DB
migration, estimated LOC exceeds `MAX_PLAN_LOC`, or the agent flagged a high-severity risk.
Split the PBI in ADO and re-trigger the service hook.

---

## Pointing the orchestrator at a different project

The orchestrator only knows about a target application through `REPO_ROOT` + a handful of
env vars — none of the pipeline logic is specific to this demo repo. Two things are
provider-specific and are abstracted behind `GIT_PROVIDER`:

| `GIT_PROVIDER` | PR create/merge/tag implementation | Work-item intake |
|---|---|---|
| `github` (default) | `src/services/github-pr-service.ts` — GitHub REST API | ADO or chat/email |
| `ado-repos` | `src/services/ado-pr-service.ts` — Azure Repos REST API | ADO |

`src/services/pr-service.ts` is a thin facade that picks the right implementation at
startup based on `GIT_PROVIDER`; `run-lifecycle.ts` and `release-service.ts` never need to
know which one is active. Build/test command detection (`validation-config.ts`,
`repo-inspection-service.ts`) is also repo-agnostic: set `VALIDATION_*_CWD`/`VALIDATION_*_CMD`
explicitly (recommended for any real project) or let the bounded, timeout-safe auto-detector
in `project-detection.ts` find a `.sln`/`.csproj`/`package.json` up to one level deep.

### Running a second instance for another app

Use a second env file in the same `automation/orchestrator` folder — no code duplication:

1. Copy `.env.pci.example` → `.env.pci` (or add `.env.<your-app>`).
2. Set a unique `ORCHESTRATOR_PORT`, `DATA_DIR` (e.g. `data-pci`), and `ARTIFACTS_DIR`.
3. Point `REPO_ROOT` at the target repo and set `GIT_PROVIDER` / ADO or GitHub vars.
4. Start with `npm run dev:pci` or `$env:ORCHESTRATOR_ENV_FILE='.env.pci'; npm run dev`.

Both instances share one codebase and one `node_modules`; run state stays isolated via `DATA_DIR`.

### Example: PCI (Azure Repos)

`automation/orchestrator/.env.pci` (real secrets omitted) shows the ADO-Repos-hosted case:

```env
REPO_ROOT=C:\Users\ksen010\DemoRepo\PCI
GIT_PROVIDER=ado-repos
DEFAULT_BASE_BRANCH=dev
ADO_ORG=pwc-us-fmre
ADO_PROJECT=Private Capital Intelligence
ADO_REPO=PCI
ADO_PAT=                      # fill in — Code (Read&Write) + Pull Request (Read&Write) + Work Items scopes
VALIDATION_BACKEND_BUILD_CMD=dotnet build PwC.PCI.sln --verbosity minimal
VALIDATION_BACKEND_BUILD_CWD=.
VALIDATION_FRONTEND_BUILD_CMD=npm run build:dev
VALIDATION_FRONTEND_BUILD_CWD=PwC.PCI.ClientApp
```

The build/test commands above were taken directly from PCI's own `azure-pipelines.yml` /
`build-pci-frontend.yaml` so local validation mirrors real CI. PCI currently has no backend
test project (`PwC.PCI.sln` has no `*.Tests.csproj`) and no frontend `test` npm script, so
those two validation steps auto-skip until PCI adds them.

Before enabling this against real ADO work items: fill in `ADO_PAT`, set
`ORCHESTRATOR_API_KEY` to a real secret (a placeholder key was generated), and run one
dry-run bug/PBI end to end (`CURSOR_DRY_RUN=true`) to confirm branch/PR wiring before
flipping `CURSOR_DRY_RUN=false`.

---

## What's new vs. the original bug-fix demo

| Area | Bug pipeline | PBI pipeline |
|------|--------------|--------------|
| Intake | ADO (Bug), or chat/email for local demo | ADO (PBI/User Story) only |
| Planning gate | none | Gate 1 — structured plan, human-approved before any code |
| Coding | single agent turn | multi-turn, one task per turn (topologically ordered), 1 retry |
| Tests | run only (`validation`) | agent generates/extends tests, then `validation` runs them |
| Coverage | n/a | best-effort delta on changed files (`MIN_FILE_COVERAGE`) |
| AI review | non-blocking second agent pass on the diff, both pipelines | same |
| Docs | n/a | README/CHANGELOG update turn before PR |
| Patch approval | Gate 2 — same for both pipelines | same |
| Post-PR | manual (`create-pr` only) | `deploy-status` → `awaiting_uat` → `uat-approve` → merge + tag + close ADO item |

Not yet implemented (see the plan doc for the full scenario matrix to run before enabling
the ADO hook against a real production project):

- Multi-tenant config / distributed run store (still single-process JSON store + in-memory lock).
- Per-file backend coverage (currently overall dotnet coverage, not per changed file).
- Automatic conflict resolution if a PBI's branch falls behind `dev` before merge.

---

## Next phases

| Phase | Work |
|-------|------|
| 5 | `dotnet build`, `npm run build`, tests |
| 6 | Approval email/webhook |
| 7 | `git push`, GitHub PR |
| 8 | n8n workflow + demo guide |
| 9 | Full SDLC (PBI planning gate, coding loop, tests, coverage, AI review, docs, deploy, UAT, release) |
| 10 | Multi-app productization — `GIT_PROVIDER` (GitHub/Azure Repos), generic project detection, multi-instance support — **this update**. Still open: distributed run store, plugin system for other git/work-item hosts |
