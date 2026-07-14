# n8n UI Guide — Dashboard, progress, approve/reject

On **n8n 1.82 community**, use the **SDLC Automation dashboard** (single consolidated workflow) for the full browser UI.

## Two ways to interact

| Method | Best for |
|--------|----------|
| **SDLC Dashboard** (recommended) | Report bug/PBI, track runs, approve at every gate (plan, patch, UAT), create PR |
| **Executions tab** | Live progress while agent/validation runs |

## 1. SDLC Dashboard

### Setup

1. Import `automation/n8n/sdlc-automation-all-in-one.json`
2. **Activate** the workflow
3. Open the **GET Dashboard** Webhook node → copy **Production URL**  
   Example: `http://localhost:5678/webhook/sdlc/dashboard`
4. Open that URL in your browser

### What you get

Three tabs:

| Tab | Purpose |
|-----|---------|
| **Report** | Start a new Bug or PBI/User Story run |
| **Track** | Enter Run ID, check status, auto-refresh every 15s |
| **Approve** | Gate 1 (plan), Gate 2 (patch), UAT, Create PR, Cancel — buttons shown based on current status |

The dashboard calls `POST /webhook/sdlc/action` on the same workflow (no separate import needed).

### Typical demo flow

1. **Report** → paste `[BUG]` message or fill PBI fields → **Start run**
2. Switch to **Track** (automatic) and watch status update
3. When status is `awaiting_plan_approval` or `awaiting_approval` or `awaiting_uat`, open **Approve** → **Load** → use the action buttons
4. For bug runs after approval, **Create PR** if not created automatically

### PBI runs without ADO Service Hook permissions

All PBI runs are sent to the orchestrator with `source: "ado"` (required by the intake
contract), so the dashboard always attaches an ADO work-item reference:

- **ADO Work Item ID field left blank** — the workflow auto-generates a local placeholder
  work item (e.g. `#900012345`, tagged `dummy-ado-id`). The run proceeds through the full
  pipeline normally; nothing is written back to ADO. Use this when you don't have ADO
  Service Hook or write permissions.
- **ADO Work Item ID field filled in** — the workflow builds a real `dev.azure.com` link
  using that ID plus the optional `ADO_ORG` / `ADO_PROJECT` values in
  `automation/n8n-local/.env`. If the orchestrator also has `ADO_PAT` configured, its
  best-effort ADO comments/state updates will target that real work item.

## 2. Executions tab (progress in n8n UI)

While a run is processing:

1. In n8n left sidebar → **Executions**
2. Open the latest **SDLC Automation (All-in-One)** execution
3. Watch nodes turn green as the workflow runs

---

## Why not everything inside Chat?

| Feature | n8n 1.82 | n8n 2.x+ |
|---------|----------|----------|
| Browser dashboard | Yes (`/webhook/sdlc/dashboard`) | Yes |
| **Progress messages during run** | Track tab auto-refresh | Yes (Chat node) |
| **Approve / Reject at all gates** | Approve tab | Partial (Chat approval mode) |

For your install, the **Dashboard + Executions** combo is the practical UI experience.

---

## Workflow to import

| File | Purpose |
|------|---------|
| `sdlc-automation-all-in-one.json` | ADO intake + deploy trigger + dashboard + all approval actions |

Also registers:

- `POST /webhook/ado-work-item-intake` — ADO Service Hooks
- `POST /webhook/orchestrator-deploy-trigger` — optional deploy loop
- `GET /webhook/sdlc/dashboard` — browser UI
- `POST /webhook/sdlc/action` — dashboard API

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Another run is active | Dashboard **Track** tab → find active run → **Approve** tab → Approve or Reject |
| Dashboard 404 | Activate **SDLC Automation (All-in-One)** workflow |
| Empty result / offline orchestrator | Set `ORCHESTRATOR_API_KEY` in `automation/n8n-local/.env`; start orchestrator (`npm run dev` or `npm run dev:pci`) |
