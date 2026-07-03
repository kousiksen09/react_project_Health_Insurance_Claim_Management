# Local n8n Install

Corporate networks often block `cdn.sheetjs.com` (used by n8n's `xlsx` dependency), causing `npm install -g n8n` to fail with `SELF_SIGNED_CERT_IN_CHAIN` or `503`.

This folder installs n8n locally with an **npm override** so `xlsx` comes from `registry.npmjs.org` instead.

**Version:** n8n `1.82.3` (stable for self-hosted; n8n 2.x had broken langchain peer deps with `legacy-peer-deps` on this network).

## Install

```powershell
cd automation\n8n-local
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'   # only if SSL inspection blocks npm
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

## Configure API key (no Enterprise Variables)

```powershell
copy .env.example .env
# Edit .env — ORCHESTRATOR_API_KEY must match automation/orchestrator/.env
```

## Run

```powershell
npm start
# UI: http://localhost:5678
```

`npm start` loads `.env` from this folder via `dotenv-cli`.

Or set env in the shell before starting:

```powershell
$env:ORCHESTRATOR_API_KEY="your-key-here"
$env:ORCHESTRATOR_URL="http://127.0.0.1:4400"
npx n8n start
```

## Import workflow

Import `automation/n8n/sdlc-automation-all-in-one.json`.

Test:

```powershell
cd automation\n8n\scripts
.\test-webhook.ps1
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Command "start" not found` | Broken n8n 2.x langchain deps — use this 1.82.3 install |
| `SELF_SIGNED_CERT_IN_CHAIN` | Set `NODE_TLS_REJECT_UNAUTHORIZED=0` for install only |
| `cdn.sheetjs.com` blocked | `xlsx` override in `package.json` handles this |
| Workflow 404 | Activate **SDLC Automation (All-in-One)** in n8n |
| Variables menu locked (Enterprise) | Use `.env` in this folder or edit Code node `CONFIG` |
| Webhook 404 | Activate workflow in n8n UI and Save |

## Optional: global CLI

After local install:

```powershell
npm install -g .\node_modules\n8n --strict-ssl=false
n8n --version
n8n start
```
