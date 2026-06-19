# n8n Bugfix Webhook Demo

Importable workflow: **n8n webhook → orchestrator → poll → JSON response**.

Uses **only built-in n8n nodes** (no LangChain Chat). Works on **community / self-hosted** n8n — no Enterprise Variables required.

Replaces Outlook/ServiceNow intake for local demos. Same `POST /runs/start` contract as email.

## Prerequisites

| Service | URL | Notes |
|---------|-----|--------|
| Orchestrator | `http://127.0.0.1:4400` | `npm run dev` in `automation/orchestrator` |
| n8n | `http://localhost:5678` | `npm start` in `automation/n8n-local` |
| `ORCHESTRATOR_API_KEY` | — | Must match orchestrator `.env` |

Optional orchestrator env for live agent runs: `CURSOR_API_KEY`, `ALLOW_DIRTY_REPO=true`.

## Setup

### 1. Start orchestrator

```powershell
cd automation\orchestrator
copy .env.example .env
# Set ORCHESTRATOR_API_KEY and REPO_ROOT
npm run dev
```

Verify: `curl http://127.0.0.1:4400/health`

### 2. Configure n8n (no Enterprise Variables)

```powershell
cd automation\n8n-local
copy .env.example .env
# Edit .env — set ORCHESTRATOR_API_KEY to the SAME value as orchestrator/.env
npm install
npm start
```

Open `http://localhost:5678`

**Alternative:** after import, open the **Process message** Code node and set `CONFIG.ORCHESTRATOR_API_KEY` at the top of the script.

### 3. Import workflow

1. Delete or ignore the old **Bugfix Chat Demo** (LangChain nodes will not activate).
2. **Workflows → Import from File**
3. Select `automation/n8n/bugfix-webhook-demo.json`
4. **Activate** the workflow (toggle top-right)
5. **Save**

### 4. Test with PowerShell

```powershell
cd automation\n8n\scripts
.\test-webhook.ps1
```

Or with curl:

```powershell
curl -X POST http://localhost:5678/webhook/bugfix-demo `
  -H "Content-Type: application/json" `
  -d "{\"message\": \"[BUG] Test bug\n\ncomponent: frontend\n\nShort description here.\"}"
```

Response JSON: `{ "response": "..." }` with run summary when complete.

## Message format

POST JSON body:

```json
{ "message": "your command or bug report text" }
```

`text` also works instead of `message`.

### Report a bug

```
[BUG] Notification label shows ClaimSubmitted

component: frontend
area: healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx
severity: low

On /notifications the type chip shows ClaimSubmitted instead of Claim Submitted.
```

### After run completes

Response includes run ID, branch, summary, validation, and changed files.

### Approve (manual gate)

```json
{ "message": "approve run_20260618_160000_abc123" }
```

### Reject

```json
{ "message": "reject run_20260618_160000_abc123 Fix scope too broad" }
```

### Other commands

```
status run_20260618_160000_abc123
create-pr run_20260618_160000_abc123
cancel run_20260618_160000_abc123
```

For email-based review, use `GET /runs/:id/approval-summary` — see [MANUAL_APPROVAL_FLOW.md](../orchestrator/MANUAL_APPROVAL_FLOW.md).

## Workflow nodes

```
Webhook (POST /webhook/bugfix-demo)  →  Process message (Code)  →  Respond to Webhook
```

Logic lives in `scripts/process-webhook-message.js` (embedded in imported JSON). Regenerate JSON after editing:

```powershell
cd automation\n8n
node scripts/build-workflow.js
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Unrecognized node type: langchain.chat` | **Not a broken install.** n8n 1.82 has no `@n8n/n8n-nodes-langchain.chat` node. Re-import the updated `bugfix-chat-demo.json` (2 nodes only: Chat Trigger → Code). |
| Missing API key message | Set `ORCHESTRATOR_API_KEY` in `n8n-local/.env` or Code node `CONFIG` |
| Variables menu is Enterprise-only | Use `n8n-local/.env` or edit Code node `CONFIG` — not n8n Variables |
| `404` on webhook URL | Workflow must be **Active**; path is `/webhook/bugfix-demo` |
| `REPO_LOCK_HELD` | Cancel active run or wait for completion |
| `401 Unauthorized` | API keys must match orchestrator `.env` |
| `Request failed with status code 400` | Orchestrator rejected the payload (often empty description or invalid component/severity). Re-import updated workflow JSON, or send a full `[BUG]` message with description lines. |
| Poll timeout | Agent/validation slow — use `status <runId>` later |
| Connection refused | Start orchestrator on port 4400 |

## Legacy chat workflow

`bugfix-chat-demo.json` requires LangChain nodes (`@n8n/n8n-nodes-langchain.chat`). Many local installs cannot activate it. Use the webhook demo instead.

## Later: swap webhook for email or ServiceNow

Keep the same orchestrator API. Replace only the trigger + parser in n8n:

| Intake | n8n change |
|--------|------------|
| Outlook | Microsoft Outlook / IMAP trigger → map to `BugIntakePayload` |
| ServiceNow | Webhook trigger → map ticket fields to payload |
| Webhook (now) | This workflow |

See [BUG_AUTOMATION_CONTRACTS.md](../BUG_AUTOMATION_CONTRACTS.md).

## Files

| File | Purpose |
|------|---------|
| [N8N_WORKFLOW_BLUEPRINT.md](./N8N_WORKFLOW_BLUEPRINT.md) | **Production node-by-node design** (WF-1 + WF-2) |
| `bugfix-control-panel.json` | **Browser UI** — status, approve, reject, PR (see [N8N_UI_GUIDE.md](./N8N_UI_GUIDE.md)) |
| `bugfix-webhook-demo.json` | **Import for API tests** — webhook demo (community n8n) |
| `bugfix-chat-demo.json` | Legacy LangChain chat demo (often fails locally) |
| `scripts/process-webhook-message.js` | Code node source |
| `scripts/test-webhook.ps1` | PowerShell test client |
| `scripts/build-workflow.js` | Regenerate JSON from script |
