# Repository Runbook — Health Insurance Claim Management

Repo-aware operational guide for local development and the bug-automation demo.

**Repository root:**

```
C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management
```

**Git remote:** `https://github.com/Hishitha-GJ/react_project_Health_Insurance_Claim_Management.git`  
**Default branch:** `main`

---

## 1. Solution layout

```
react_project_Health_Insurance_Claim_Management/
├── healthinsuranceclaim_frontend/          # React 19 + Vite 7 + MUI 6
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── app/router/AppRoutes.tsx        # Routes + role guards
│       ├── features/                       # auth, admin, customer, hospital, claimofficer, claims, ...
│       └── shared/                         # apiClient, constants, hooks, types
├── HealthInsuranceClaimAPI/
│   ├── HealthInsuranceClaimAPI.sln
│   └── HealthInsuranceClaimAPI/            # .NET 8 Web API
│       ├── Program.cs
│       ├── appsettings.json
│       ├── Controllers/
│       ├── Services/
│       ├── Repositories/
│       ├── Data/HealthInsuranceContext.cs
│       └── Migrations/20251118082744_init.cs
└── automation/                             # Planning docs + future orchestrator
```

| Layer | Technology | Verified build (this machine) |
|-------|------------|-------------------------------|
| Frontend | React 19.2, TS 5.9, Vite 7.2 | `npm run dev` OK; `npm run build` may fail on unrelated TS debt |
| Backend | .NET 8 (`net8.0`), EF Core 9 | `dotnet build` **succeeds** |
| Database | SQL Server | Connection: `IN5CG43731G6` / catalog `Insudb` |
| Tests | `HealthInsuranceClaimAPI.Tests` (xUnit) | 5 smoke tests; no frontend test runner yet |

---

## 2. Prerequisites

Install and verify before starting:

```powershell
node --version      # v22+ recommended (v22.22.3 observed)
npm --version       # 10.x observed
dotnet --version    # 8.x or 10.x SDK (builds net8.0)
cursor --version    # optional; for future agent phase
```

| Tool | Required for | Status on demo machine |
|------|--------------|------------------------|
| SQL Server on `IN5CG43731G6` | API runtime | Assumed available (same host as other project) |
| `dotnet ef` global tool | DB migrations | **Not installed** — install in §4 |
| `gh` CLI | Future PR step | **Not installed** — orchestrator will use REST API |
| `CURSOR_API_KEY` | Future agent step | Not verified |

### HTTPS dev certificate (backend)

If the frontend cannot reach `https://localhost:7021`:

```powershell
dotnet dev-certs https --trust
```

---

## 3. Database setup (exact steps)

### 3.1 Connection string (current)

File: `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI/appsettings.json`

```json
"DefaultConnection": "Data Source=IN5CG43731G6;Initial Catalog=Insudb;integrated security=True;MultipleActiveResultSets=True;Encrypt=False;TrustServerCertificate=True;Max Pool Size=1000;"
```

- **Server:** `IN5CG43731G6` (Windows integrated security)
- **Catalog:** `Insudb`
- EF Core reads key `ConnectionStrings:DefaultConnection` in `Program.cs`

### 3.2 Install EF Core CLI (one-time)

```powershell
dotnet tool install --global dotnet-ef
```

Verify:

```powershell
dotnet ef --version
```

Expected: `9.0.x` (matches `Microsoft.EntityFrameworkCore.Tools` in `.csproj`).

### 3.3 Create / update database

From repo root:

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI\HealthInsuranceClaimAPI

dotnet restore
dotnet ef database update
```

This applies migration `20251118082744_init` and creates tables in `Insudb`.

**There is no auto-migrate on startup** — `Program.cs` does not call `Database.Migrate()`.

### 3.4 Seed data (from migration)

| Entity | Details |
|--------|---------|
| Admin user | Email: `kousik.sen@pwc.com`, Password: `admin123` (SHA-256 hash in DB) |
| Policies | `POL1` Basic Health, `POL2` Family Health, `POL3` Senior Citizen |

Password hashing: `AuthService.ComputeSha256Hash()` — not BCrypt despite package reference.

### 3.5 Verify database connectivity

After migration, start the API (§5) and open:

```
https://localhost:7021/swagger
```

Test login via Swagger `POST /api/auth/login` with form fields `email` and `password`.

### 3.6 Troubleshooting database

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cannot open database "Insudb"` | DB not created | Run `dotnet ef database update` |
| Login failed for network-related error | SQL Server unreachable | Confirm `IN5CG43731G6` resolves; check Windows auth |
| `dotnet ef` not found | Tool not installed | §3.2 |
| Migration already applied | Normal | `dotnet ef migrations list` to confirm |

---

## 4. Backend — exact local startup steps

### 4.1 Paths and ports

| Item | Value |
|------|-------|
| Project directory | `HealthInsuranceClaimAPI\HealthInsuranceClaimAPI` |
| Solution | `HealthInsuranceClaimAPI\HealthInsuranceClaimAPI.sln` |
| HTTPS URL | `https://localhost:7021` |
| HTTP URL | `http://localhost:5193` |
| Swagger | `https://localhost:7021/swagger` |
| CORS allowed origin | `http://localhost:5173` (Vite frontend) |

Defined in `Properties/launchSettings.json`, profile **`https`**.

### 4.2 Start commands (PowerShell)

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI\HealthInsuranceClaimAPI

dotnet restore
dotnet build
dotnet run --launch-profile https
```

**Expected console output includes:**

```
Now listening on: https://localhost:7021
Now listening on: http://localhost:5193
```

### 4.3 Build-only (no run)

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet build
```

Observed: succeeds with warnings (nullable refs, AutoMapper NU1903 advisory).

### 4.4 API controllers (automation context)

All routes use prefix `api/[controller]`:

| Controller | Base route | Example |
|------------|------------|---------|
| `AuthController` | `/api/auth` | `POST /api/auth/login` |
| `CustomerController` | `/api/customer` | Customer policies, claims |
| `HospitalController` | `/api/hospital` | `POST /api/hospital/claims` |
| `ClaimOfficerController` | `/api/claimofficer` | Pending claims, approvals |
| `AdminController` | `/api/admin` | User/policy/claim management |
| `ClaimsController` | `/api/claims` | Shared claim reads |
| `PoliciesController` | `/api/policies` | Policy catalog |
| `NotificationsController` | `/api/notifications` | In-app notifications |

**Auth note:** `AuthController` endpoints accept **`[FromForm]`** (multipart/form-data), not JSON. Frontend mirrors this in `features/auth/services/authApi.ts`.

### 4.5 Backend configuration gotchas

| File | Issue |
|------|-------|
| `appsettings.json` | `EmailSettings:FromEmail` is currently **empty** — outbound SMTP from `EmailService.cs` will fail if triggered |
| `appsettings.json` | JWT key and SMTP password are committed — use env overrides for demos |
| `HealthInsuranceClaimAPI.http` | Points at `http://localhost:5193` and references non-existent `weatherforecast` — stale |

---

## 5. Frontend — exact local startup steps

### 5.1 Paths and ports

| Item | Value |
|------|-------|
| Project directory | `healthinsuranceclaim_frontend` |
| Dev server | `http://localhost:5173` |
| API base URL (code) | `https://localhost:7021` |
| Config file | `src/shared/utils/constants.ts` → `API_BASE_URL` |

**Stale docs:** `healthinsuranceclaim_frontend/README.md` and `README_FEATURE_ARCHITECTURE.md` reference `https://localhost:7297` — **incorrect**. Trust `constants.ts` and `launchSettings.json`.

### 5.2 Start commands (PowerShell)

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\healthinsuranceclaim_frontend

npm install
npm run dev
```

If peer dependency errors occur:

```powershell
npm install --legacy-peer-deps
```

**Expected output:**

```
VITE v7.x.x  ready in ... ms
➜  Local:   http://localhost:5173/
```

### 5.3 Full-stack smoke (manual)

1. Backend running on `https://localhost:7021`
2. Frontend running on `http://localhost:5173`
3. Browse to `http://localhost:5173/login`
4. Login: `kousik.sen@pwc.com` / `admin123`
5. Confirm redirect to `/dashboard` (Admin dashboard)

### 5.4 Frontend scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Local dev server |
| `build` | `tsc -b && vite build` | Production build (**fails today**) |
| `lint` | `eslint .` | ESLint |
| `preview` | `vite preview` | Preview production build |

There is **no** `test` script.

---

## 6. Test commands

### 6.1 Current state

**Backend — xUnit smoke project (Phase 5):**

```powershell
cd C:\Users\ksen010\DemoRepo\react_project_Health_Insurance_Claim_Management\HealthInsuranceClaimAPI
dotnet test --verbosity minimal
```

Project: `HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests/`

| Test class | Covers |
|------------|--------|
| `ClaimStatusTests` | Enum workflow values (smoke) |
| `RegisterCustomerDtoTests` | `ValidateAge` min-age rule |

**Frontend — no automated tests yet:**

```powershell
cd healthinsuranceclaim_frontend
npm test
# Result: Missing script: "test"
```

See §6.4 for recommended Vitest additions surfaced by orchestrator validation.

### 6.2 Orchestrator validation commands (auto-detected)

The orchestrator (`validation-service.ts`) detects commands from repo layout. Override via `.env` (see `automation/orchestrator/.env.example`).

| Step | Working directory | Default command |
|------|-------------------|-----------------|
| Backend build | `HealthInsuranceClaimAPI` | `dotnet build --verbosity minimal` |
| Backend test | `HealthInsuranceClaimAPI` | `dotnet test --no-build --verbosity minimal` |
| Frontend build | `healthinsuranceclaim_frontend` | `npm run build` |
| Frontend test | `healthinsuranceclaim_frontend` | *(skipped — no test script)* |

**Env overrides (optional):**

| Variable | Purpose |
|----------|---------|
| `VALIDATION_BACKEND_BUILD_CMD` | Override backend build command |
| `VALIDATION_BACKEND_BUILD_CWD` | Relative cwd under `REPO_ROOT` |
| `VALIDATION_BACKEND_TEST_CMD` | Override backend test command |
| `VALIDATION_BACKEND_TEST_CWD` | Relative cwd under `REPO_ROOT` |
| `VALIDATION_FRONTEND_BUILD_CMD` | Override frontend build |
| `VALIDATION_FRONTEND_BUILD_CWD` | Relative cwd under `REPO_ROOT` |
| `VALIDATION_FRONTEND_TEST_CMD` | Override frontend test |
| `VALIDATION_SKIP_FRONTEND_BUILD` | `true` to skip frontend build step |
| `VALIDATION_TIMEOUT_MS` | Per-command timeout (default 600000) |
| `STRICT_VALIDATION` | `false` = backend build+tests gate; `true` = also require frontend build |

### 6.3 Validation policy

| Mode | Pass condition |
|------|----------------|
| `STRICT_VALIDATION=false` (demo default) | Backend `dotnet build` OK + `dotnet test` 0 failures |
| `STRICT_VALIDATION=true` | Above + `npm run build` OK |

Frontend build failures are **reported** in demo mode but do not block `validation.passed`.

### 6.4 Structured validation output

Each run writes:

- `automation/artifacts/<runId>/validation.json`
- `automation/artifacts/<runId>/validation-summary.md`

`RunResult.validation` fields:

| Field | Meaning |
|-------|---------|
| `buildPassed` | Required builds succeeded per policy |
| `testsPassed` | All executed test steps had 0 failures |
| `testSummary` | e.g. `backend: 6 passed, 0 failed; frontend: not run` |
| `failureReason` | Human-readable first failure chain |
| `testGapRecommendations` | Suggested smallest demo regression tests |

### 6.5 Recommended test additions (not yet implemented)

Orchestrator surfaces these when coverage is weak:

| Priority | Layer | Addition |
|----------|-------|----------|
| High | Frontend | Vitest smoke test for notification label map (`ClaimSubmitted` → `Claim Submitted`) |
| Medium | Frontend | Add `"test": "vitest run"` to `package.json` |
| Medium | Backend | `AuthServiceTests` for inactive-user error message (demo bug A4) |

### 6.6 Manual validation (without orchestrator)

```powershell
# Backend compile + test (first run requires NuGet restore for test packages)
cd HealthInsuranceClaimAPI
dotnet restore
dotnet build
dotnet test
```

**NuGet restore failures:** If `Microsoft.TestPlatform.TestHost` or similar packages time out, the issue is network/proxy access to `api.nuget.org` — not test code. Retry on VPN or corporate network, or restore once from a machine with NuGet access.

```powershell
# Frontend production build (may fail on unrelated TS debt)
cd ..\healthinsuranceclaim_frontend
npm run build

# Frontend lint
npm run lint
```

---

## 7. Likely demo bugs and bug-friendly modules

Real, localized issues suitable for email → agent → patch demos. Ordered by **automation friendliness**.

### Tier A — Best for first demo (small diff, backend builds)

| # | Bug | Location | Why it's demo-friendly |
|---|-----|----------|------------------------|
| A1 | Notification type label shows `ClaimSubmitted` (no space) while `NotificationPanel.tsx` uses `Claim Submitted` | `healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx` lines 30–37 | One-line string fix; visible in UI; easy to describe in email |
| A2 | Empty `FromEmail` breaks outbound email | `appsettings.json` + `Services/EmailService.cs` | Config fix; backend-only; clear error when notifications email |
| A3 | Stale API port in frontend README | `healthinsuranceclaim_frontend/README.md` | Docs-only; zero runtime risk |
| A4 | Wrong rejection message for inactive user conflated with bad password | `Services/AuthService.cs` | Single-service logic fix; testable with xUnit |

### Tier B — Good scope, slightly wider touch

| # | Bug | Location | Notes |
|---|-----|----------|-------|
| B1 | `useClaimSubmission` passes wrong shape to `hospitalApi.createClaim` | `features/hospital/hooks/useClaimSubmission.ts` vs `features/hospital/services/hospitalApi.ts` | Real type/runtime bug; needs aligned `CreateClaimRequest` fields (`policyNumber`, `documentTypes`) |
| B2 | `HospitalProfile` update missing required `name` field | `features/profile/components/HospitalProfile.tsx` | TS error today; user-visible profile save failure |
| B3 | Duplicate claim status label maps scattered across components | `HospitalClaims.tsx`, `PaymentProcessing.tsx`, `DocumentManagement.tsx`, `constants.ts` | Good refactor story; prefer fixing `constants.ts` as single source of truth |

### Tier C — Avoid for first demo

| # | Issue | Why avoid |
|---|-------|-----------|
| C1 | 30+ TS errors across admin/profile/claims | Agent may touch many files; `npm run build` stays red |
| C2 | `shared/types/index.ts` enum + `erasableSyntaxOnly` | Build infra issue, not a user-reported bug |
| C3 | AutoMapper NU1903 vulnerability | Dependency upgrade, not a bug fix narrative |

### Recommended demo email example (A1)

```
Subject: [BUG] Notification type shows "ClaimSubmitted" instead of "Claim Submitted"

Body:
When I open /notifications as a customer, notification type for new claims
displays "ClaimSubmitted" without a space. It should read "Claim Submitted"
like the header notification panel.

Steps:
1. Login as any user with notifications
2. Go to Notifications page
3. Observe type chip for claim-submitted notifications
```

### Bug-friendly modules (where agents should focus)

| Module | Path | Risk |
|--------|------|------|
| Shared constants | `src/shared/utils/constants.ts` | Low |
| Notifications UI | `src/features/notifications/` | Low |
| Auth service | `HealthInsuranceClaimAPI/.../Services/AuthService.cs` | Low |
| Email config | `appsettings.json`, `EmailService.cs` | Low |
| Hospital claim flow | `src/features/hospital/` | Medium (types + API) |
| Admin pages | `src/features/admin/components/ClaimsManagementPage.tsx` | High (many unused imports) |
| Profile pages | `src/features/profile/` | High (multiple TS errors) |

---

## 8. Automation integration points in the codebase

No automation hooks exist in application code today. Integration is **external** via orchestrator + git. These are the **touch points** the workflow will read or modify.

### 8.1 Configuration surfaces

| File | Automation relevance |
|------|---------------------|
| `HealthInsuranceClaimAPI/.../appsettings.json` | DB connection, JWT, SMTP — env override for demo |
| `healthinsuranceclaim_frontend/src/shared/utils/constants.ts` | `API_BASE_URL` — agent may fix URL/label bugs here |
| `HealthInsuranceClaimAPI/.../Properties/launchSettings.json` | Documents API ports for validation smoke |
| `HealthInsuranceClaimAPI/.../Program.cs` | CORS policy `AllowReactApp` → `http://localhost:5173` |

### 8.2 Git / branch targets

| Item | Value |
|------|-------|
| Protected branch | `main` |
| Feature branch pattern | `bugfix/<runId>-<slug>` (planned) |
| Remote | `origin` → GitHub |

### 8.3 Validation entry points (orchestrator will shell out)

| Step | Working directory | Command |
|------|-------------------|---------|
| Backend build | `HealthInsuranceClaimAPI` | `dotnet build --verbosity minimal` |
| Backend tests | `HealthInsuranceClaimAPI` | `dotnet test --no-build --verbosity minimal` |
| Frontend build | `healthinsuranceclaim_frontend` | `npm run build` |
| Frontend lint | `healthinsuranceclaim_frontend` | `npm run lint` |

### 8.4 External integration (not in app repo)

| Component | Integration |
|-----------|-------------|
| n8n | Email trigger → `POST http://127.0.0.1:4400/runs/start` |
| Orchestrator | `automation/orchestrator/` (Phase 3+) |
| Cursor SDK | Local agent against `REPO_ROOT` |
| GitHub | PR API after manual approval |

### 8.5 Application email (separate from automation email)

`EmailService.cs` sends **in-app notification emails** via Gmail SMTP configured in `appsettings.json`. This is **not** the bug-intake email path. Automation intake uses **n8n's own mailbox**.

---

## 9. Blockers and assumptions

### Blockers

| ID | Blocker | Impact | Mitigation |
|----|---------|--------|------------|
| B1 | Minimal backend tests only | Validation passes backend gate; frontend tests still missing | xUnit smoke project added; Vitest recommended in validation output |
| B2 | `npm run build` may fail on unrelated TS debt | Strict frontend gate always red on some branches | Demo: `STRICT_VALIDATION=false`; pick Tier A bugs |
| B3 | `dotnet ef` not installed | Cannot create DB on fresh machine | Install global tool (§3.2) |
| B4 | `gh` CLI missing | PR creation needs REST/Octokit | Phase 7 |
| B5 | Empty `FromEmail` | Backend email notifications fail | Fix before email-notification demos |
| B6 | Secrets in `appsettings.json` | Security/compliance story | Env overrides; do not log secrets in artifacts |

### Assumptions

| ID | Assumption |
|----|------------|
| A1 | SQL Server instance `IN5CG43731G6` is reachable with Windows integrated security from the demo machine |
| A2 | Catalog `Insudb` can be created or already exists on that server |
| A3 | Demo runs on Windows with PowerShell |
| A4 | .NET SDK installed can build `net8.0` (observed: SDK 10.x works) |
| A5 | Node 22+ available for future orchestrator / Cursor SDK |
| A6 | GitHub PAT with `repo` scope available for PR creation |
| A7 | `CURSOR_API_KEY` available for real agent runs (stub mode otherwise) |
| A8 | n8n can reach orchestrator at `127.0.0.1:4400` on same machine or via tunnel |
| A9 | One automation run at a time (repo lock) to avoid git conflicts |
| A10 | Admin seed credentials (`kousik.sen@pwc.com` / `admin123`) remain valid after migration |

---

## 10. Quick reference card

```powershell
# --- Database (once) ---
dotnet tool install --global dotnet-ef
cd HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet ef database update

# --- Terminal 1: Backend ---
cd HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet run --launch-profile https

# --- Terminal 2: Frontend ---
cd healthinsuranceclaim_frontend
npm install
npm run dev

# --- Browser ---
# http://localhost:5173/login
# https://localhost:7021/swagger
# Login: kousik.sen@pwc.com / admin123
```
