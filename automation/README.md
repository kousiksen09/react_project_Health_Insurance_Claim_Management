# Bug-Fix Automation (Demo)

Email-driven SDLC workflow for the Health Insurance Claim Management application.

## Documents

| Document | Purpose |
|----------|---------|
| [DEMO_WALKTHROUGH.md](./DEMO_WALKTHROUGH.md) | **Full end-to-end demo** including GitHub PR |
| [DEMO_GUIDE.md](./DEMO_GUIDE.md) | Quick-start demo guide |
| [orchestrator/PR_TEMPLATE_AUTOMATION.md](./orchestrator/PR_TEMPLATE_AUTOMATION.md) | Automated PR body template (Phase 7) |
| [orchestrator/MANUAL_APPROVAL_FLOW.md](./orchestrator/MANUAL_APPROVAL_FLOW.md) | Phase 6 approval API + n8n email pattern |
| [N8N_WORKFLOW_BLUEPRINT.md](./n8n/N8N_WORKFLOW_BLUEPRINT.md) | **n8n node-by-node design** (WF-1 intake + WF-2 approval) |
| [N8N_UI_GUIDE.md](./n8n/N8N_UI_GUIDE.md) | **Control Panel UI** — approve/reject/status without chat commands |
| [REPO_RUNBOOK.md](./REPO_RUNBOOK.md) | Exact local startup, DB setup, test commands, demo bugs, blockers |
| [AUTOMATION_ARCHITECTURE.md](./AUTOMATION_ARCHITECTURE.md) | End-to-end workflow and component design |
| [BUG_AUTOMATION_CONTRACTS.md](./BUG_AUTOMATION_CONTRACTS.md) | n8n ↔ orchestrator API contracts |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased milestones |

## Components

| Path | Status |
|------|--------|
| [orchestrator/](./orchestrator/) | **Phase 7** — GitHub PR after approval (see [PR_TEMPLATE_AUTOMATION.md](./orchestrator/PR_TEMPLATE_AUTOMATION.md)) |
| [n8n-local/](./n8n-local/) | n8n 1.82.3 local install |
| `artifacts/` | Per-run logs (gitignored, created at runtime) |

## Quick start — orchestrator

```powershell
cd automation\orchestrator
copy .env.example .env
# Set REPO_ROOT and ORCHESTRATOR_API_KEY
npm install
npm run dev
```

`GET http://127.0.0.1:4400/health`

## Quick start — application

```powershell
cd HealthInsuranceClaimAPI\HealthInsuranceClaimAPI
dotnet run --launch-profile https

cd healthinsuranceclaim_frontend
npm run dev
```

- API: `https://localhost:7021/swagger`
- UI: `http://localhost:5173`
- Login: `kousik.sen@pwc.com` / `admin123`

## Layout

```
automation/
├── orchestrator/     # Phase 3 — local bug-fix API
├── n8n-local/        # n8n workflow engine
├── n8n/              # Single n8n workflow (import sdlc-automation-all-in-one.json)
│   └── sdlc-automation-all-in-one.json
├── DEMO_GUIDE.md     # End-to-end demo walkthrough
├── scripts/          # Phase 5 validation helpers
└── artifacts/        # gitignored run outputs
```
