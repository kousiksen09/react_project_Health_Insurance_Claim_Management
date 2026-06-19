# Cursor SDK integration (Phase 4)

This document describes how the orchestrator integrates `@cursor/sdk` for local bug-fix runs.

## Overview

When `POST /runs/start` is called, the pipeline:

1. **Inspects** `REPO_ROOT` (git status, project layout)
2. **Branches** to `bugfix/<runId>-<slug>` from `DEFAULT_BASE_BRANCH`
3. **Analyzes** intake and writes repo context
4. **Patches** via Cursor local agent (or dry-run)
5. **Captures** artifacts and persists run state
6. **Stops** at `awaiting_approval` — no push, no PR

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Node.js 22+ | Required by `@cursor/sdk` |
| `CURSOR_API_KEY` | From Cursor account settings |
| Git | On PATH; repo must be a git checkout |
| Clean tree (default) | Set `ALLOW_DIRTY_REPO=true` to override |

## Environment variables

```env
REPO_ROOT=C:\path\to\react_project_Health_Insurance_Claim_Management
CURSOR_API_KEY=your-key
CURSOR_MODEL=composer-2.5
CURSOR_DRY_RUN=false
ALLOW_DIRTY_REPO=false
DEFAULT_BASE_BRANCH=main
```

### Dry-run modes

| Condition | Behavior |
|-----------|----------|
| `CURSOR_API_KEY` unset | Dry-run: prompt + artifacts only, no agent |
| `CURSOR_DRY_RUN=true` | Same, even if key is set |
| Key set + dry-run off | Full local agent against `REPO_ROOT` |

Dry-run is **honest**: status reaches `awaiting_approval` but `changedFiles` is empty and `implementationNote` explains why.

## Pipeline services

| Step | Service | Output |
|------|---------|--------|
| Branch | `git-service.ts` | Feature branch on local repo |
| Inspect | `repo-inspection-service.ts` | `repo-inspection.json` (via run log) |
| Prompt | `prompt-builder.ts` | `agent-prompt.md` |
| Agent | `agent-service.ts` | `agent-transcript.jsonl`, `agent-transcript.md` |
| Analysis | `analysis-service.ts` | `bug-summary.md`, `root-cause.md` |
| Git diff | `git-service.ts` | `changed-files.json` |

## Structured prompt

The agent receives a markdown prompt with:

- Bug title, description, steps, expected/actual behavior
- Component and affected area from intake
- Repo paths (frontend/backend when detected)
- Constraints: minimal fix, no PR/push
- Required closing sections: `## Summary` and `## Root Cause`

The orchestrator parses those sections from the final assistant text.

## Cursor SDK usage

```typescript
import { Agent } from '@cursor/sdk';

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: 'composer-2.5' },
  local: { cwd: REPO_ROOT },
});

const run = await agent.send(prompt);
for await (const event of run.stream()) {
  // persisted to agent-transcript.jsonl
}
const result = await run.wait();
agent.close();
```

**Safety notes (demo):**

- Local agents run tool calls (shell, edit, write) **without** human approval
- The orchestrator does not enable sandbox by default
- Use a dedicated clone or branch for demos
- `REPO_LOCK=true` allows only one active run

## Persistence

### Run state

```
automation/orchestrator/data/
  index.json          # messageId → runId, activeRunId
  runs/
    run_<timestamp>_<id>.json
```

Survives orchestrator restarts. Still single-process only.

### Artifacts

```
automation/artifacts/<runId>/
  intake.json
  run-log.jsonl
  run-result.json
  agent-prompt.md
  agent-transcript.jsonl
  agent-transcript.md
  bug-summary.md
  root-cause.md
  changed-files.json
  commands.json
```

## Commands captured

`commands.json` aggregates:

- Git commands (branch, status, diff)
- Repo inspection commands
- Shell commands from agent `tool_call` events (when exposed)
- Validation commands (Phase 5 placeholder today)

## What is NOT implemented

- **PR creation** — Phase 7 (`POST /runs/:id/create-pr` returns 501)
- **Auto-push** — only after manual approval in a later phase
- **Build/test validation** — Phase 5 (`validation-service` placeholder)
- **Worktrees** — uses in-repo feature branch (simpler for demo)

## Demo bug example

From `automation/REPO_RUNBOOK.md`:

> Notification label shows `ClaimSubmitted` instead of `Claim Submitted` in  
> `healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx`

Sample intake `affectedArea`:

```text
healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx
```

## Troubleshooting

| Issue | Check |
|-------|--------|
| `DIRTY_WORKING_TREE` | Commit/stash or `ALLOW_DIRTY_REPO=true` |
| `REPO_LOCK_HELD` | Wait for run or `POST /runs/:id/cancel` |
| Agent error | `agent-transcript.md`, `run-log.jsonl` |
| No changed files (dry-run) | Set `CURSOR_API_KEY`, `CURSOR_DRY_RUN=false` |
| Branch checkout fails | Local `main` exists; try `git fetch origin main` |

## Related docs

- `automation/BUG_AUTOMATION_CONTRACTS.md` — API contract
- `automation/REPO_RUNBOOK.md` — build commands (Phase 5)
- `automation/orchestrator/README.md` — server setup
