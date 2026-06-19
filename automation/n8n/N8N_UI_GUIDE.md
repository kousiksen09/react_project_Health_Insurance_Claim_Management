# n8n UI Guide — Progress, Approve, Reject (without chat commands)

On **n8n 1.82 community**, native Chat cannot send mid-run progress updates (that needs n8n 2.x **Chat** node). This guide shows what **does** work in the n8n UI today.

## Three ways to interact

| Method | Best for |
|--------|----------|
| **Control Panel** (recommended) | Approve, reject, status, create PR, report bugs — dropdown + form |
| **Executions tab** | Live progress while agent/validation runs |
| **Chat workflow** | Quick demo intake (optional; same backend) |

## 1. Control Panel (approve / reject / status in browser)

### Setup

1. Import `automation/n8n/bugfix-control-panel.json`
2. **Activate** the workflow
3. Open the **Panel: GET** Webhook node → copy **Production URL**  
   Example: `http://localhost:5678/webhook/bugfix-panel`
4. Open that URL in your browser

### What you get

- **Action dropdown:** Report bug · Check status · Approve · Reject · Create PR · Cancel
- **Run ID** field (for everything except new bugs)
- **Text area** for bug report or reject reason
- **Result box** with orchestrator response

No chat commands required.

### Typical demo flow

1. **Report bug** → paste `[BUG]` message → Submit  
2. Wait (or watch **Executions** in n8n)  
3. Copy **Run ID** from the result  
4. **Check status** → paste Run ID → Submit  
5. **Approve** or **Reject** → paste Run ID → Submit  
6. **Create PR** (if approved and `GITHUB_TOKEN` set)

## 2. Executions tab (progress in n8n UI)

While a run is processing:

1. In n8n left sidebar → **Executions**
2. Open the latest **Bugfix Chat Demo** or **Bugfix Control Panel** execution
3. Watch nodes turn green as the workflow runs (poll loop can take several minutes)

This is the built-in n8n “progress view” for long runs.

## 3. Chat workflow (optional)

`bugfix-chat-demo.json` still works for intake. Approve/reject via typed commands is optional if you use the Control Panel instead.

---

## Why not everything inside Chat?

| Feature | n8n 1.82 | n8n 2.x+ |
|---------|----------|----------|
| Chat intake | Yes (Chat Trigger) | Yes |
| Reply when workflow finishes | Yes (`output` field) | Yes |
| **Progress messages during run** | No | Yes (Chat node “Send message”) |
| **Approve / Reject buttons in chat** | No | Partial (Chat “approval” mode) |
| **Form / dropdown in n8n** | Control Panel webhook | + Form Trigger |

For your install, the **Control Panel + Executions** combo is the practical “full UI” experience.

---

## Workflows to import

| File | Purpose |
|------|---------|
| `bugfix-control-panel.json` | **Browser UI** — status, approve, reject, PR |
| `bugfix-chat-demo.json` | Optional chat intake |
| `bugfix-webhook-demo.json` | API/script testing |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Another run is active | Control Panel → **Check status** on active run → **Approve** or **Reject** |
| Panel 404 | Activate **Bugfix Control Panel** workflow |
| Empty result | Set `ORCHESTRATOR_API_KEY` in `automation/n8n-local/.env` |
