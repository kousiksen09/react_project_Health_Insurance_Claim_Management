# Bug-Fix Orchestrator (Phase 5)

Local HTTP service for the email-driven bug-fix automation demo.

**Phase 5 status:** Local validation — auto-detected build/test commands, env overrides, structured results, test gap recommendations.

See [`CURSOR_INTEGRATION.md`](./CURSOR_INTEGRATION.md) (Phase 4) and [`../REPO_RUNBOOK.md`](../REPO_RUNBOOK.md) §6 (validation commands).

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
npm run dev
```

Server: `http://127.0.0.1:4400`

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
| `GITHUB_TOKEN` | No | — | Phase 7 |

\*If missing, `/runs` returns `503 AUTH_NOT_CONFIGURED`.

---

## Next phases

| Phase | Work |
|-------|------|
| 5 | `dotnet build`, `npm run build`, tests |
| 6 | Approval email/webhook |
| 7 | `git push`, GitHub PR |
| 8 | n8n workflow + demo guide |
