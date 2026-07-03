# n8n SDLC Automation

Single importable workflow for ADO intake, deploy triggers, and the browser dashboard.

## Quick start

| Service | URL | Notes |
|---------|-----|--------|
| Orchestrator | `http://127.0.0.1:4400` (demo) or `:4401` (PCI) | `npm run dev` / `npm run dev:pci` in `automation/orchestrator` |
| n8n | `http://localhost:5678` | `npm start` in `automation/n8n-local` |
| `ORCHESTRATOR_API_KEY` | — | Must match orchestrator `.env` / `.env.pci` |

### 1. Start orchestrator

```powershell
cd automation\orchestrator
copy .env.example .env   # or copy .env.pci.example .env.pci for PCI
npm run dev              # or: npm run dev:pci
```

### 2. Configure n8n

```powershell
cd automation\n8n-local
copy .env.example .env
# Set ORCHESTRATOR_API_KEY and ORCHESTRATOR_URL (4400 or 4401)
npm install
npm start
```

### 3. Import workflow

1. **Workflows → Import from File**
2. Select `automation/n8n/sdlc-automation-all-in-one.json`
3. **Activate** the workflow

### 4. Open the dashboard

Copy the **Production URL** from the **GET Dashboard** webhook node:

`http://localhost:5678/webhook/sdlc/dashboard`

See [N8N_UI_GUIDE.md](./N8N_UI_GUIDE.md) for the full UI walkthrough.

---

## Webhook endpoints (one workflow)

| Trigger | Path | Purpose |
|---------|------|---------|
| Webhook POST | `/webhook/ado-work-item-intake` | ADO Service Hook — Bug + PBI intake |
| Webhook POST | `/webhook/orchestrator-deploy-trigger` | Staging deploy dispatch + poll |
| Webhook GET | `/webhook/sdlc/dashboard` | Browser dashboard (Report / Track / Approve) |
| Webhook POST | `/webhook/sdlc/action` | Dashboard backing API |

---

## ADO Service Hooks

Point both Bug and PBI subscriptions at:

`http://localhost:5678/webhook/ado-work-item-intake`

(Full setup: [DEMO_WALKTHROUGH.md](../DEMO_WALKTHROUGH.md))

---

## Optional: deploy loop

Set in orchestrator `.env`:

```
N8N_EVENT_WEBHOOK_URL=http://localhost:5678/webhook/orchestrator-deploy-trigger
```

Edit the **Trigger and poll deploy** Code node for GitHub Actions or Azure Pipelines.

---

## Validate dashboard script

After editing the dashboard Code node:

```powershell
cd automation\n8n
node scripts/validate-dashboard.js
```

---

## Files

| File | Purpose |
|------|---------|
| `sdlc-automation-all-in-one.json` | **Import this** — single n8n workflow |
| [N8N_UI_GUIDE.md](./N8N_UI_GUIDE.md) | Dashboard usage |
| [N8N_WORKFLOW_BLUEPRINT.md](./N8N_WORKFLOW_BLUEPRINT.md) | Production design notes (historical) |
| [DEMO_WALKTHROUGH.md](../DEMO_WALKTHROUGH.md) | End-to-end ADO bug + PBI guide |
| `scripts/*.js` | Reference source for Code node logic |
| `scripts/validate-dashboard.js` | Syntax-check dashboard HTML/JS |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Missing API key | Set `ORCHESTRATOR_API_KEY` in `n8n-local/.env` |
| `404` on webhook | Workflow must be **Active** |
| ADO webhook 404 in browser | ADO intake is **POST only** — configure Service Hook, don't open URL in browser |
| `REPO_LOCK_HELD` | Approve/reject/cancel the active run in the dashboard |
| Orchestrator offline (red dot) | Start orchestrator; check `ORCHESTRATOR_URL` port |

See [BUG_AUTOMATION_CONTRACTS.md](../BUG_AUTOMATION_CONTRACTS.md) for orchestrator API contracts.
