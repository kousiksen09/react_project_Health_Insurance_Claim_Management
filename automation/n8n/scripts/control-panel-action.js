/**
 * Bugfix Control Panel — POST handler (approve / reject / status / start / etc.)
 * Body: { "action": "start|status|approve|reject|create-pr|cancel", "runId": "...", "message": "..." }
 */

const CONFIG = {
  ORCHESTRATOR_URL: 'http://127.0.0.1:4400',
  ORCHESTRATOR_API_KEY: '',
};

const ALLOWED_COMPONENTS = new Set(['frontend', 'backend', 'fullstack', 'unknown']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL || 'http://127.0.0.1:4400').replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

function result(text, extra = {}) {
  return [{ json: { response: text, output: text, ...extra } }];
}

function normalizeComponent(value) {
  const v = String(value || 'unknown').toLowerCase().trim();
  if (ALLOWED_COMPONENTS.has(v)) return v;
  if (v.includes('front')) return 'frontend';
  if (v.includes('back') || v.includes('api')) return 'backend';
  return 'unknown';
}

function normalizeSeverity(value) {
  const v = String(value || 'medium').toLowerCase().trim();
  return ALLOWED_SEVERITIES.has(v) ? v : 'medium';
}

function formatApiError(err) {
  const status = err.statusCode ?? err.response?.statusCode ?? 'unknown';
  const body = err.response?.body ?? err.response?.data;
  if (body?.error?.message) return body.error.message;
  if (body?.error?.code === 'REPO_LOCK_HELD') {
    const active = body.error.activeRunId ?? body.activeRunId;
    return `${body.error.message}${active ? `\n\nActive run: ${active}\n→ Check status, Approve, or Reject that run in the panel first.` : ''}`;
  }
  if (body) return typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  return err.message ?? 'Request failed';
}

async function apiRequest(method, path, body) {
  try {
    return await this.helpers.httpRequest({
      method,
      url: `${ORCHESTRATOR_URL}${path}`,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
      json: true,
      timeout: 300000,
    });
  } catch (err) {
    throw new Error(formatApiError(err));
  }
}

function formatRunSummary(run) {
  const analysis = run.analysis ?? {};
  const validation = run.validation ?? {};
  const git = run.git ?? {};
  const files = (analysis.changedFiles ?? []).join(', ') || '(none)';
  return [
    `Run: ${run.runId}`,
    `Status: ${run.status}`,
    `Branch: ${git.branchName ?? 'n/a'}`,
    '',
    'Summary:',
    analysis.bugSummary ?? '(pending)',
    '',
    'Root cause:',
    analysis.rootCauseSummary ?? '(pending)',
    '',
    `Changed files: ${files}`,
    '',
    'Validation:',
    `- buildPassed: ${validation.buildPassed ?? validation.passed ?? 'n/a'}`,
    `- testsPassed: ${validation.testsPassed ?? 'n/a'}`,
    validation.failureReason ? `- failureReason: ${validation.failureReason}` : '',
    '',
    `Artifacts: automation/artifacts/${run.runId}/`,
    '',
    run.status === 'awaiting_approval' ? '→ Use Approve or Reject in this panel.' : '',
    run.error?.message === 'DIRTY_WORKING_TREE'
      ? 'Error: DIRTY_WORKING_TREE\n→ Uncommitted files in repo. For local demo: ALLOW_DIRTY_REPO=true in automation/orchestrator/.env, restart orchestrator (npm run dev), submit again.'
      : run.error ? `Error: ${run.error.message}` : '',
  ].filter(Boolean).join('\n');
}

async function pollRun(runId) {
  const terminal = new Set(['awaiting_approval', 'approved', 'rejected', 'pr_created', 'failed']);
  for (let i = 0; i < 90; i++) {
    const run = await apiRequest.call(this, 'GET', `/runs/${runId}`);
    if (terminal.has(run.status)) return run;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timed out waiting for ${runId}. Use Check status later.`);
}

function parsePanelRequest(raw) {
  if (!raw || typeof raw !== 'object') {
    return { action: 'start', runId: '', message: String(raw ?? '').trim() };
  }

  // n8n 1.82 Webhook wraps POST JSON under .body (not top-level fields)
  let payload = raw;
  if (raw.body !== undefined && raw.body !== null) {
    if (typeof raw.body === 'string') {
      try {
        payload = JSON.parse(raw.body);
      } catch {
        payload = { message: raw.body };
      }
    } else if (typeof raw.body === 'object' && !Array.isArray(raw.body)) {
      payload = raw.body;
    }
  }

  const action = String(
    payload.action ?? raw.action ?? 'start',
  ).toLowerCase().trim();

  const runId = String(
    payload.runId ?? payload.run_id ?? raw.runId ?? raw.run_id ?? '',
  ).trim();

  const message = String(
    payload.message
    ?? payload.text
    ?? payload.bugReport
    ?? raw.message
    ?? raw.text
    ?? '',
  ).trim();

  return { action, runId, message, _debugKeys: Object.keys(raw).join(', ') };
}

function parseBugIntake(text) {
  let body = text;
  let title = 'Bug report from control panel';
  let component = 'unknown';
  let affectedArea;
  let severity = 'medium';

  const bugMatch = text.match(/^\[BUG\]\s*(.+?)(?:\n|$)/i);
  if (bugMatch) {
    title = bugMatch[1].trim().slice(0, 200);
    body = text.slice(bugMatch[0].length).trim();
  }

  const componentMatch = body.match(/^component:\s*(.+)$/im);
  if (componentMatch) component = normalizeComponent(componentMatch[1]);
  const areaMatch = body.match(/^area:\s*(.+)$/im);
  if (areaMatch) affectedArea = areaMatch[1].trim();
  const severityMatch = body.match(/^severity:\s*(.+)$/im);
  if (severityMatch) severity = normalizeSeverity(severityMatch[1]);

  let description = body.trim() || title || text.trim() || 'Bug report via control panel';
  const bug = {
    title: title.slice(0, 200),
    description: description.slice(0, 8000),
    severity,
    component,
    environment: 'local-dev',
  };
  if (affectedArea) bug.affectedArea = affectedArea;

  return {
    contractVersion: '1.0.0',
    source: 'chat',
    messageId: `n8n-panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local`,
    receivedAt: new Date().toISOString(),
    reporter: { email: 'n8n-panel@example.com', name: 'Control Panel User' },
    bug,
    metadata: {
      emailSubject: `[BUG] ${title}`,
      rawEmailSnippet: text.slice(0, 500),
      labels: ['n8n-panel', 'demo'],
    },
  };
}

try {
  if (!API_KEY) {
    return result('Missing ORCHESTRATOR_API_KEY in n8n-local/.env or CONFIG in this node.');
  }

  const body = $input.first().json ?? {};
  const { action, runId, message, _debugKeys } = parsePanelRequest(body);

  if (action === 'status') {
    if (!runId) return result('Run ID is required for Check status.');
    const run = await apiRequest.call(this, 'GET', `/runs/${runId}`);
    return result(formatRunSummary(run), { runId });
  }

  if (action === 'approve') {
    if (!runId) return result('Run ID is required.');
    const r = await apiRequest.call(this, 'POST', `/runs/${runId}/approve`, {
      approvedBy: 'n8n-panel@example.com',
      comment: message || 'Approved via control panel',
      createPr: false,
    });
    return result(`Approved ${runId}\nStatus: ${r.status}\n\nNext: Create PR action if needed.`, { runId });
  }

  if (action === 'reject') {
    if (!runId) return result('Run ID is required.');
    const r = await apiRequest.call(this, 'POST', `/runs/${runId}/reject`, {
      rejectedBy: 'n8n-panel@example.com',
      reason: message || 'Rejected via control panel',
    });
    return result(`Rejected ${runId}\nStatus: ${r.status}`, { runId });
  }

  if (action === 'create-pr') {
    if (!runId) return result('Run ID is required.');
    const r = await apiRequest.call(this, 'POST', `/runs/${runId}/create-pr`, { draft: false });
    return result([
      `PR step for ${runId}`,
      `Status: ${r.status}`,
      r.git?.prUrl ? `PR: ${r.git.prUrl}` : '',
      r.error ? `Error: ${r.error.message}` : '',
    ].filter(Boolean).join('\n'), { runId });
  }

  if (action === 'cancel') {
    if (!runId) return result('Run ID is required.');
    const r = await apiRequest.call(this, 'POST', `/runs/${runId}/cancel`, {
      cancelledBy: 'n8n-panel@example.com',
      reason: message || 'Cancelled via control panel',
    });
    return result(`Cancelled ${runId}\nStatus: ${r.status}`, { runId });
  }

  // start (default)
  if (!message) {
    return result([
      'Bug report text is required. Paste into "Bug report or reason" (not Run ID).',
      '',
      'Example first line: [BUG] Purchased policy still shows on Browse Policies',
      '',
      `Debug: webhook keys at Code node = ${_debugKeys || '(empty)'}`,
      'If you filled the form, re-import bugfix-control-panel.json (nested body fix).',
    ].join('\n'));
  }

  const started = await apiRequest.call(this, 'POST', '/runs/start', parseBugIntake(message));
  const run = await pollRun.call(this, started.runId);

  return result([
    `Started ${started.runId}`,
    `Branch: ${started.branchName}`,
    '',
    formatRunSummary(run),
    '',
    'Tip: open n8n → Executions to watch the workflow while agent runs.',
  ].join('\n'), { runId: started.runId });
} catch (err) {
  return result(`Error:\n${err.message ?? err}`);
}
