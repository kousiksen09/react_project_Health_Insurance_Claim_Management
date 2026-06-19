# Implementation Plan — Bug-Fix Automation Demo

Phased plan for **react_project_Health_Insurance_Claim_Management**.

---

## 1. Repository understanding summary

### Stack

| Layer | Path | Version / notes |
|-------|------|-----------------|
| Frontend | `healthinsuranceclaim_frontend/` | React 19.2, Vite 7.2, MUI 6, TS 5.9 |
| Backend | `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI/` | .NET 8, EF Core 9, JWT |
| Tests | `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests/` | xUnit smoke (Phase 5) |
| DB | SQL Server `IN5CG43731G6` / `Insudb` | Migration `20251118082744_init` |
| Git | `origin` → `Hishitha-GJ/react_project_Health_Insurance_Claim_Management` | `main` only |

### Exact local startup (summary)

**Database (once):**

```powershell
dotnet tool install --global dotnet-ef
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet ef database update
```

**Backend (terminal 1):**

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet run --launch-profile https
# → https://localhost:7021/swagger
```

**Frontend (terminal 2):**

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\healthinsuranceclaim_frontend
npm install
npm run dev
# → http://localhost:5173
```

**Login:** `kousik.sen@pwc.com` / `admin123`

Full detail: [REPO_RUNBOOK.md](./REPO_RUNBOOK.md)

### Test commands (current)

| Command | Result today |
|---------|--------------|
| `dotnet build` (solution) | Pass |
| `dotnet test` (HealthInsuranceClaimAPI) | Pass (xUnit smoke tests) |
| `npm run build` | May fail on unrelated TS debt |
| `npm run lint` | Runs with errors |
| `npm test` | Script missing |

---

## 2. Demo risks and blockers

| ID | Blocker | Severity | Status |
|----|---------|----------|--------|
| R1 | No automated tests | High | **Mitigated** — backend xUnit smoke; frontend Vitest recommended |
| R2 | `npm run build` may fail | High | Demo: `STRICT_VALIDATION=false` |
| R3 | `dotnet ef` not on PATH | Medium | Install per runbook |
| R4 | `gh` CLI missing | Medium | Phase 7 — use GitHub REST |
| R5 | Empty `EmailSettings:FromEmail` | Medium | Fix before app-email demos |
| R6 | Secrets in `appsettings.json` | Medium | Env overrides |
| R7 | Orchestrator | — | **Done** Phases 3–5 |
| R8 | No n8n workflow in repo | Expected | Phase 8 |

---

## 3. Recommended implementation architecture

See [AUTOMATION_ARCHITECTURE.md](./AUTOMATION_ARCHITECTURE.md).

```
Email → n8n → Orchestrator (:4400) → Cursor SDK (local)
                    ↓
         dotnet build / dotnet test / npm run build
                    ↓
              awaiting_approval → approve → GitHub PR
```

---

## 4. Step-by-step milestone plan

### Phase 1 — Repo discovery and local run instructions ✅

**Deliverables:** REPO_RUNBOOK, AUTOMATION_ARCHITECTURE, BUG_AUTOMATION_CONTRACTS, IMPLEMENTATION_PLAN, README, `.gitignore`

---

### Phase 2 — Architecture and contracts ✅

Contracts frozen at v1.0.0 in [BUG_AUTOMATION_CONTRACTS.md](./BUG_AUTOMATION_CONTRACTS.md).

---

### Phase 3 — Scaffold local orchestrator ✅

- `automation/orchestrator/` (Node 22, TypeScript, Express)
- `GET /health`, `POST /runs/start`, auth, in-memory → file persistence (Phase 4)
- Artifacts under `automation/artifacts/<runId>/`

---

### Phase 4 — Bug intake and run lifecycle ✅

- Cursor SDK integration (local agent or dry-run)
- Git feature branch `bugfix/<runId>-<slug>`
- JSON run persistence under `automation/orchestrator/data/`
- See [orchestrator/CURSOR_INTEGRATION.md](./orchestrator/CURSOR_INTEGRATION.md)

---

### Phase 5 — Build / test / validation hooks ✅ CURRENT

**Deliverables:**

- [x] `validation-service.ts` — auto-detect + env-overridable commands
- [x] `validation-config.ts` — repo layout detection
- [x] Structured `RunResult.validation`: `buildPassed`, `testsPassed`, `testSummary`, `failureReason`, `testGapRecommendations`
- [x] Artifacts: `validation.json`, `validation-summary.md`
- [x] `HealthInsuranceClaimAPI.Tests` — xUnit smoke (ClaimStatus, RegisterCustomerDto.ValidateAge)
- [x] `STRICT_VALIDATION` policy documented in REPO_RUNBOOK §6.3

**Env variables:** `VALIDATION_*_CMD`, `VALIDATION_*_CWD`, `VALIDATION_TIMEOUT_MS`, `VALIDATION_SKIP_FRONTEND_BUILD`

**Exit criteria:** Orchestrator run reaches `awaiting_approval` with honest validation results; backend build+tests pass in demo mode.

**Not in scope:** Frontend Vitest setup (recommended in `testGapRecommendations` only).

---

### Phase 6 — Manual approval flow (NOT STARTED)

- `POST /runs/:id/approve` (API exists; n8n email template pending)
- n8n approval email template
- `approval.json` artifact

---

### Phase 7 — PR creation (NOT STARTED)

- Push branch to `origin`
- GitHub REST PR against `main`
- Update `RunResult.git.prUrl`

---

### Phase 8 — Demo guide and n8n export (NOT STARTED)

- `automation/DEMO_GUIDE.md`
- `automation/n8n/bug-intake-workflow.json`
- `automation/scripts/preflight.ps1`

---

## 5. Proposed folder/file changes

### Exists today

```
automation/
├── README.md
├── REPO_RUNBOOK.md
├── AUTOMATION_ARCHITECTURE.md
├── BUG_AUTOMATION_CONTRACTS.md
├── IMPLEMENTATION_PLAN.md
├── artifacts/                    # gitignored
├── n8n-local/
└── orchestrator/
    ├── CURSOR_INTEGRATION.md
    ├── README.md
    ├── package.json
    ├── .env.example
    └── src/
        ├── services/
        │   ├── validation-service.ts    # Phase 5
        │   ├── validation-config.ts
        │   ├── agent-service.ts       # Phase 4
        │   └── ...

HealthInsuranceClaimAPI/
├── HealthInsuranceClaimAPI.sln
├── HealthInsuranceClaimAPI/
└── HealthInsuranceClaimAPI.Tests/       # Phase 5
```

---

## 6. API contracts (summary)

Full spec: [BUG_AUTOMATION_CONTRACTS.md](./BUG_AUTOMATION_CONTRACTS.md)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| POST | `/runs/start` | `BugIntakePayload` from n8n |
| GET | `/runs/:id` | Poll `RunResult` (includes `validation`) |
| POST | `/runs/:id/approve` | Manual gate |
| POST | `/runs/:id/create-pr` | Open GitHub PR |
| POST | `/runs/:id/cancel` | Abort |

---

## 7. Git workflow design

| Item | Value |
|------|-------|
| Base | `main` |
| Feature branch | `bugfix/<runId>-<slugified-title>` |
| Push target | `origin` |
| PR | `main` ← feature branch |
| Auto-merge | **Never** |

---

## 8. Manual approval design

1. Run stops at `awaiting_approval` after validation.
2. n8n emails summary + approve action.
3. `POST /runs/:id/approve` with `approvedBy` (required).
4. Orchestrator pushes and creates PR (Phase 7).
5. Audit in `approval.json` + PR body.

---

## 9. Local validation strategy

### Auto-detected commands

| Step | CWD (under REPO_ROOT) | Command |
|------|------------------------|---------|
| Backend build | `HealthInsuranceClaimAPI` | `dotnet build --verbosity minimal` |
| Backend test | `HealthInsuranceClaimAPI` | `dotnet test --no-build --verbosity minimal` |
| Frontend build | `healthinsuranceclaim_frontend` | `npm run build` |
| Frontend test | — | Skipped until `npm test` exists |

### Demo policy

| Mode | Pass condition |
|------|----------------|
| `STRICT_VALIDATION=false` | Backend build OK + backend tests 0 failures |
| `STRICT_VALIDATION=true` | Above + frontend `npm run build` OK |

Validation output includes `testGapRecommendations` when frontend tests are missing or backend coverage is smoke-only.

---

## 10. Likely demo bugs (repo-specific)

| Priority | Bug | File |
|----------|-----|------|
| **1 (recommended)** | `ClaimSubmitted` vs `Claim Submitted` | `features/notifications/components/NotificationsPage.tsx` |
| 2 | Empty `FromEmail` breaks SMTP | `appsettings.json` |
| 3 | README wrong API port | `healthinsuranceclaim_frontend/README.md` |
| 4 | `useClaimSubmission` wrong payload | `features/hospital/hooks/useClaimSubmission.ts` |

---

## 11. Next action

**Phase 6:** Wire n8n approval email template and document approval artifact flow.

Do **not** auto-push or create PRs until Phase 7.
