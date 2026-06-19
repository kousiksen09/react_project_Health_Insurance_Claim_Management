# Automation Architecture — Email-Driven Bug Fix Demo

Architecture for an **email-only**, **local**, **demo-ready** SDLC workflow on this repository. Stops at **manual PR approval**. No ServiceNow, no CI/CD, no deployment, no auto-merge.

**Application:** Health Insurance Claim Management (`react_project_Health_Insurance_Claim_Management`)

---

## 1. Repository understanding summary

| Component | Path | Notes |
|-----------|------|-------|
| Frontend | `healthinsuranceclaim_frontend/` | React 19, Vite, MUI; API → `https://localhost:7021` |
| Backend | `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI/` | .NET 8, EF Core, JWT |
| Database | SQL Server `IN5CG43731G6` / `Insudb` | EF migration `20251118082744_init` |
| Automation | `automation/` | Docs now; orchestrator in Phase 3+ |
| GitHub | `Hishitha-GJ/react_project_Health_Insurance_Claim_Management` | Branch `main` only |

**Build status (verified):** `dotnet build` passes; `npm run build` fails; no automated tests exist.

---

## 2. Demo risks and blockers

See [REPO_RUNBOOK.md §9](./REPO_RUNBOOK.md) for full list. Critical path items:

1. **No tests** — orchestrator validation must add xUnit project (Phase 5).
2. **Frontend TS build red** — use backend-only or single-file fixes for first demo.
3. **`dotnet ef` missing** — DB setup blocked until tool installed.
4. **No automation code in app** — all integration is external via orchestrator + git.

---

## 3. Recommended architecture

```
┌─────────────┐     email      ┌─────────────┐
│  Reporter   │───────────────▶│    n8n      │
└─────────────┘                └──────┬──────┘
                                      │ HTTP JSON
                                      ▼
                            ┌─────────────────────┐
                            │ Local Orchestrator  │
                            │ :4400 (Phase 3+)    │
                            │ automation/         │
                            │   orchestrator/     │
                            └─────────┬───────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
      │  Cursor SDK   │      │ dotnet/npm    │      │  git + GitHub │
      │  local agent  │      │ validation    │      │  feature PR   │
      └───────────────┘      └───────────────┘      └───────────────┘
              │                       │                       │
              └───────────────────────┴───────────────────────┘
                                      ▼
                    react_project_Health_Insurance_Claim_Management
                    (feature branch patches only)
```

### Component responsibilities

| Component | Role | In repo today? |
|-----------|------|----------------|
| **Email** | Bug intake channel | N/A (external inbox) |
| **n8n** | Parse email → `BugIntakePayload` → call orchestrator → notify humans | No (export planned Phase 8) |
| **Orchestrator** | Run lifecycle, agent, validation, approval gate, PR | **No — Phase 3+** |
| **Cursor SDK** | Analyze repo, minimal patch on feature branch | External (`@cursor/sdk`) |
| **This app repo** | Target of patches | Yes |
| **GitHub** | Host PR against `main` | Yes |

---

## 4. End-to-end flow (10 steps)

| Step | Actor | Action |
|------|-------|--------|
| 1 | User | Reports bug by email (`[BUG]` subject) |
| 2 | n8n | Receives email (IMAP / forwarding) |
| 3 | n8n | Parses and normalizes to `BugIntakePayload` |
| 4 | n8n | `POST /runs/start` on local orchestrator |
| 5 | Orchestrator | Cursor local agent analyzes codebase with bug context |
| 6 | Orchestrator | Agent creates minimal patch on `bugfix/<runId>-<slug>` |
| 7 | Orchestrator | Runs `dotnet build`, `dotnet test`, `npm run build` locally |
| 8 | Orchestrator | Sets status `awaiting_approval`; writes artifacts |
| 9 | Human | Approves via `POST /runs/:id/approve` (n8n email link) |
| 10 | Orchestrator | Pushes branch, creates GitHub PR — **stops** (no merge) |

---

## 5. Automation integration points in this codebase

The application has **zero** automation hooks. The orchestrator interacts **around** the repo:

### 5.1 Files commonly touched by bug fixes

| Area | Files | Demo suitability |
|------|-------|------------------|
| UI labels | `healthinsuranceclaim_frontend/src/shared/utils/constants.ts` | High |
| Notifications | `healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx` | High |
| Auth logic | `HealthInsuranceClaimAPI/.../Services/AuthService.cs` | High |
| Email config | `appsettings.json`, `Services/EmailService.cs` | Medium |
| Hospital claims | `features/hospital/hooks/useClaimSubmission.ts`, `services/hospitalApi.ts` | Medium |
| CORS / startup | `Program.cs` | Low frequency |

### 5.2 Files the orchestrator reads (never commits)

| File | Purpose |
|------|---------|
| `automation/BUG_AUTOMATION_CONTRACTS.md` | API contract |
| `automation/REPO_RUNBOOK.md` | Validation commands |
| `HealthInsuranceClaimAPI/.../HealthInsuranceClaimAPI.csproj` | Build target |
| `healthinsuranceclaim_frontend/package.json` | Scripts |

### 5.3 New automation directory (planned)

```
automation/
├── README.md
├── REPO_RUNBOOK.md
├── AUTOMATION_ARCHITECTURE.md
├── BUG_AUTOMATION_CONTRACTS.md
├── IMPLEMENTATION_PLAN.md
├── artifacts/              # gitignored; per-run logs
├── n8n/                    # workflow JSON (Phase 8)
├── scripts/                # validate.ps1 (Phase 5)
└── orchestrator/           # Phase 3+ — NOT IMPLEMENTED YET
```

### 5.4 Separation from application email

| Path | Purpose |
|------|---------|
| n8n mailbox | **Bug intake** (automation) |
| `EmailService.cs` + `EmailSettings` | **App notification emails** (policy purchase, claim updates) |

Do not route bug intake through `EmailService.cs`.

---

## 6. Run state machine

```
received → branching → analyzing → patching → validating → awaiting_approval
                                                              │
                              ┌───────────────────────────────┤
                              ▼                               ▼
                         cancelled                      approve
                                                              │
                                                              ▼
                                                    pushing → creating_pr → completed
```

Failure from any active state → `failed` (error in artifacts).

---

## 7. Artifact capture (per run)

Directory: `automation/artifacts/<runId>/` (gitignored)

| Artifact | Content |
|----------|---------|
| `intake.json` | Normalized bug payload |
| `bug-summary.md` | Human-readable bug summary |
| `root-cause.md` | Agent root-cause narrative |
| `changed-files.json` | Paths touched |
| `commands.json` | `dotnet build`, `npm run build`, `dotnet test` results |
| `build-backend.log` | Backend build output |
| `build-frontend.log` | Frontend build output |
| `test-results.json` | Test pass/fail counts |
| `git-diff.patch` | Patch for review |
| `approval.json` | Approver identity + timestamp |
| `pr-result.json` | PR URL and number |

---

## 8. Local validation strategy

Aligned with [REPO_RUNBOOK.md §6](./REPO_RUNBOOK.md).

### Demo mode (`STRICT_VALIDATION=false`)

| Check | Command | Blocks approval? |
|-------|---------|------------------|
| Backend build | `dotnet build` in `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI` | **Yes** |
| Backend tests | `dotnet test` in `HealthInsuranceClaimAPI` (after Phase 5) | **Yes** |
| Frontend build | `npm run build` in `healthinsuranceclaim_frontend` | No (report only) |
| Frontend lint | `npm run lint` | No |

### Strict mode (`STRICT_VALIDATION=true`)

All gates must pass including `npm run build` — **not viable today** without TS debt cleanup.

### Manual smoke (optional, post-fix)

1. `dotnet run --launch-profile https`
2. `npm run dev`
3. Login `kousik.sen@pwc.com` / `admin123`
4. Verify fixed behavior (e.g. Notifications page label)

---

## 9. Manual approval design

**Gate:** PR creation is impossible until `POST /runs/:id/approve`.

1. Orchestrator reaches `awaiting_approval` with validation summary in `RunResult`.
2. n8n emails approver distribution list with:
   - Bug title, summary, root cause
   - Changed files
   - Build/test table
   - Approve action (webhook → orchestrator)
3. Approver submits approval with `approvedBy` email (audit).
4. Orchestrator pushes `bugfix/<runId>-<slug>` and opens PR.
5. n8n sends PR link email.

**No auto-merge.** Reviewer merges in GitHub UI separately.

---

## 10. Git workflow design

| Rule | Value |
|------|-------|
| Base branch | `main` |
| Feature branch | `bugfix/<runId>-<slugified-title>` |
| Direct commits to `main` | **Forbidden** by orchestrator |
| Concurrent runs | One repo lock (default) |
| Clean working tree | Required at run start |

### Sequence

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b bugfix/<runId>-<slug>
# agent commits
# --- approval gate ---
git push -u origin bugfix/<runId>-<slug>
# GitHub REST: create PR main ← head
```

---

## 11. Environment configuration (orchestrator — Phase 3+)

| Variable | Purpose |
|----------|---------|
| `REPO_ROOT` | `C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management` |
| `CURSOR_API_KEY` | Cursor SDK |
| `GITHUB_TOKEN` | PR creation |
| `GITHUB_OWNER` | `Hishitha-GJ` |
| `GITHUB_REPO` | `react_project_Health_Insurance_Claim_Management` |
| `ORCHESTRATOR_API_KEY` | n8n → orchestrator auth |
| `ORCHESTRATOR_PORT` | Default `4400` |
| `STRICT_VALIDATION` | `false` for demo |

---

## 12. Explicit exclusions

- ServiceNow
- GitHub Actions / CI/CD pipelines
- Deployment / production changes
- Auto-merge
- Bug intake through application `EmailService`

---

## 13. Demo script outline

| Act | Duration | Content |
|-----|----------|---------|
| Setup | Off-stage | DB migrated, API + frontend running, orchestrator up |
| 1 — Context | 3 min | Show claim management UI; email-based ops |
| 2 — Email arrives | 2 min | Send `[BUG]` email; n8n execution log |
| 3 — Agent | 5 min | Orchestrator + Cursor; show artifacts |
| 4 — Validation | 5 min | `dotnet build` / test results; honest frontend status |
| 5 — Approval | 3 min | Approver email → approve |
| 6 — PR | 5 min | GitHub PR on feature branch; no merge |
| Q&A | — | Audit trail, local agent, scope boundaries |

Recommended demo bug: notification label `ClaimSubmitted` → `Claim Submitted` ([REPO_RUNBOOK.md §7](./REPO_RUNBOOK.md) item A1).
