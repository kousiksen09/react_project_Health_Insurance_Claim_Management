# Manual Approval Flow (Phase 6)

Human-in-the-loop gate before any PR is created. The orchestrator **never** opens a PR until a reviewer explicitly approves (and optionally requests PR creation in Phase 7).

## Status lifecycle

```
queued → analyzing → patch_created → validating → awaiting_approval
                                                      ↓           ↓
                                                 approved     rejected
                                                      ↓
                                                 pr_created   (terminal)
                                                 (Phase 7)
```

| Status | Meaning |
|--------|---------|
| `queued` | Run accepted; pipeline starting (branch creation) |
| `analyzing` | Repo inspection + intake analysis |
| `patch_created` | Cursor agent finished (or dry-run) |
| `validating` | Build/test commands running |
| `awaiting_approval` | **Review gate** — waiting for human decision |
| `approved` | Reviewer approved; patch accepted locally |
| `rejected` | Reviewer rejected; no PR |
| `pr_created` | PR opened (Phase 7) |
| `failed` | Pipeline or post-approval error |

Operational **cancel** (`POST /runs/:id/cancel`) is only allowed during `queued` … `validating`. At `awaiting_approval`, use **reject**.

## Approval rules

1. **No automatic PR** — `createPr` defaults to `false` on approve.
2. **Explicit approve** — `POST /runs/:id/approve` required at `awaiting_approval`.
3. **Explicit reject** — `POST /runs/:id/reject` declines the patch.
4. **PR is separate** — `POST /runs/:id/create-pr` requires `status: approved` (Phase 7).

## API endpoints

### Get reviewer summary (for n8n email)

```
GET /runs/:id/approval-summary
Authorization: Bearer <ORCHESTRATOR_API_KEY>
```

Returns `ApprovalReviewSummary` with:
- `email.subject`, `email.bodyPlain`, `email.bodyHtml` — ready for n8n Send Email node
- `review.checklist` — reviewer checklist
- `validation` — build/test summary
- `patch.changedFiles`, `patch.bugSummary`, `patch.rootCauseSummary`
- `api.approve` / `api.reject` — example request bodies
- `links` — self, artifacts, approval-summary URLs

Also written to artifacts:
- `approval.json`
- `approval-email.txt`

### Approve

```
POST /runs/:id/approve
{
  "approvedBy": "reviewer@example.com",
  "comment": "Fix looks correct",
  "createPr": false
}
```

Response: `status: approved`. Repo lock released unless `createPr: true`.

### Reject

```
POST /runs/:id/reject
{
  "rejectedBy": "reviewer@example.com",
  "reason": "Scope too broad"
}
```

Response: `status: rejected`. Repo lock released.

### Create PR (Phase 7)

```
POST /runs/:id/create-pr
{ "draft": false }
```

Requires `status: approved` and `GITHUB_TOKEN`. Orchestrator pushes the feature branch and opens a PR with a structured body (see [PR_TEMPLATE_AUTOMATION.md](./PR_TEMPLATE_AUTOMATION.md)). **Does not auto-merge.**

Or approve with `"createPr": true` in one step.

## n8n email approval pattern

Recommended workflow after run reaches `awaiting_approval`:

```
1. Poll GET /runs/:id until status = awaiting_approval
2. GET /runs/:id/approval-summary
3. Send Email node:
     subject = {{ $json.email.subject }}
     body    = {{ $json.email.bodyHtml }}  (or bodyPlain)
4. Wait for webhook / manual trigger / reply parser
5. POST /runs/:id/approve  OR  POST /runs/:id/reject
```

### Example n8n HTTP nodes

**Fetch summary:**
- Method: GET
- URL: `http://127.0.0.1:4400/runs/{{ $json.runId }}/approval-summary`
- Header: `Authorization: Bearer {{ $vars.ORCHESTRATOR_API_KEY }}`

**Approve button webhook →**
- Method: POST
- URL: `http://127.0.0.1:4400/runs/{{ $json.runId }}/approve`
- Body: `{ "approvedBy": "lead@example.com", "createPr": false }`

## n8n chat commands (demo)

| Command | Action |
|---------|--------|
| `[BUG] ...` | Start run |
| `approve <runId>` | Approve (no PR) |
| `reject <runId> reason` | Reject |
| `status <runId>` | Poll summary |
| `cancel <runId>` | Abort in-flight run only |

## Environment

| Variable | Purpose |
|----------|---------|
| `ORCHESTRATOR_PUBLIC_URL` | Links in `approval-summary` (default `http://127.0.0.1:4400`) |
| `ORCHESTRATOR_API_KEY` | Required for all `/runs/*` endpoints |

## Demo checklist for reviewers

When `GET /approval-summary` returns `review.pending: true`:

1. Read bug summary and root cause
2. Inspect changed files on feature branch
3. Check validation (`buildPassed`, `testsPassed`, `failureReason`)
4. Approve only if acceptable
5. Do **not** expect a PR until Phase 7 / explicit `create-pr`

## Related docs

- [BUG_AUTOMATION_CONTRACTS.md](../BUG_AUTOMATION_CONTRACTS.md)
- [DEMO_GUIDE.md](../DEMO_GUIDE.md)
- [n8n/README.md](../n8n/README.md)
