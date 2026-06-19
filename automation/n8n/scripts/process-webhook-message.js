/**
 * n8n Code node — webhook demo (no LangChain / no Enterprise Variables).
 *
 * Config (pick one):
 *   1. automation/n8n-local/.env  ORCHESTRATOR_API_KEY=...  (loaded by npm start)
 *   2. Edit CONFIG below in this node after import
 *
 * POST body: { "message": "..." }  or  { "text": "..." }
 *
 * Commands:
 *   [BUG] <title> + description
 *   approve <runId> | reject <runId> reason | status <runId> | create-pr <runId> | cancel <runId>
 */

// --- CONFIG: paste orchestrator key here if not using n8n-local/.env ---
const CONFIG = {
  ORCHESTRATOR_URL: 'http://127.0.0.1:4400',
  ORCHESTRATOR_API_KEY: '',
};

const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL || 'http://127.0.0.1:4400').replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

const ALLOWED_COMPONENTS = new Set(['frontend', 'backend', 'fullstack', 'unknown']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function normalizeComponent(value) {
  const v = String(value || 'unknown').toLowerCase().trim();
  if (ALLOWED_COMPONENTS.has(v)) return v;
  if (v.includes('front')) return 'frontend';
  if (v.includes('back') || v.includes('api') || v.includes('dotnet')) return 'backend';
  if (v.includes('full')) return 'fullstack';
  return 'unknown';
}

function normalizeSeverity(value) {
  const v = String(value || 'medium').toLowerCase().trim();
  return ALLOWED_SEVERITIES.has(v) ? v : 'medium';
}

function formatApiError(err) {
  const status = err.statusCode ?? err.response?.statusCode ?? err.httpCode ?? 'unknown';
  const body = err.response?.body ?? err.response?.data ?? err.error;
  if (body) {
    if (typeof body === 'string') return `HTTP ${status}: ${body}`;
    if (body.error?.message) return `HTTP ${status}: ${body.error.message}`;
    return `HTTP ${status}: ${JSON.stringify(body, null, 2)}`;
  }
  return `HTTP ${status}: ${err.message ?? 'Request failed'}`;
}

if (!API_KEY) {
  return [{
    json: {
      response: [
        'Missing ORCHESTRATOR_API_KEY.',
        '',
        'Fix (pick one):',
        '1. Create automation/n8n-local/.env with ORCHESTRATOR_API_KEY=... then restart n8n (npm start)',
        '2. Open this Code node and set CONFIG.ORCHESTRATOR_API_KEY to match automation/orchestrator/.env',
      ].join('\n'),
    },
  }];
}

const body = $input.first().json ?? {};
const chatInput = String(
  body.message
  ?? body.text
  ?? body.chatInput
  ?? body.body?.message
  ?? body.body?.text
  ?? (typeof body.body === 'string' ? body.body : '')
  ?? '',
).trim();

if (!chatInput) {
  return [{
    json: {
      response: [
        'Send JSON: { "message": "your text here" }',
        '',
        'Example bug report:',
        '[BUG] Notification label shows ClaimSubmitted',
        '',
        'component: frontend',
        'area: healthinsuranceclaim_frontend/src/features/notifications/components/NotificationsPage.tsx',
        '',
        'On /notifications the chip shows ClaimSubmitted instead of Claim Submitted.',
      ].join('\n'),
    },
  }];
}

async function apiRequest(method, path, reqBody) {
  try {
    return await this.helpers.httpRequest({
      method,
      url: `${ORCHESTRATOR_URL}${path}`,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: reqBody,
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
    `- testSummary: ${validation.testSummary ?? 'n/a'}`,
    validation.failureReason ? `- failureReason: ${validation.failureReason}` : '',
    '',
    `Artifacts: automation/artifacts/${run.runId}/`,
    '',
    run.status === 'awaiting_approval'
      ? `To approve: approve ${run.runId}\nTo reject: reject ${run.runId} reason here`
      : '',
    run.error ? `Error: ${run.error.message}` : '',
  ].filter(Boolean).join('\n');
}

async function pollRun(runId) {
  const terminal = new Set([
    'awaiting_approval',
    'approved',
    'rejected',
    'pr_created',
    'failed',
  ]);
  for (let attempt = 0; attempt < 90; attempt++) {
    const run = await apiRequest.call(this, 'GET', `/runs/${runId}`);
    if (terminal.has(run.status)) {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for run ${runId}`);
}

function parseBugIntake(text) {
  const approveMatch = text.match(/^(approve|reject|create-pr|status|cancel)\s+(\S+)/i);
  if (approveMatch) {
    return { command: approveMatch[1].toLowerCase(), runId: approveMatch[2], rest: text.slice(approveMatch[0].length).trim() };
  }

  let bodyText = text;
  let title = 'Bug report from n8n webhook';
  let component = 'unknown';
  let affectedArea;
  let severity = 'medium';

  const bugMatch = text.match(/^\[BUG\]\s*(.+?)(?:\n|$)/i);
  if (bugMatch) {
    title = bugMatch[1].trim().slice(0, 200);
    bodyText = text.slice(bugMatch[0].length).trim();
  } else {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      title = lines[0].slice(0, 200);
      bodyText = lines.slice(1).join('\n');
    } else if (lines.length === 1) {
      bodyText = lines[0];
    }
  }

  const componentMatch = bodyText.match(/^component:\s*(.+)$/im);
  if (componentMatch) {
    component = normalizeComponent(componentMatch[1]);
  }
  const areaMatch = bodyText.match(/^area:\s*(.+)$/im);
  if (areaMatch) {
    affectedArea = areaMatch[1].trim();
  }
  const severityMatch = bodyText.match(/^severity:\s*(.+)$/im);
  if (severityMatch) {
    severity = normalizeSeverity(severityMatch[1]);
  }

  let description = bodyText.trim();
  if (!description) {
    description = title.trim() || text.trim() || 'Bug report submitted via n8n webhook';
  }
  if (!title.trim()) {
    title = 'Bug report from n8n webhook';
  }

  const messageId = `n8n-webhook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local`;
  const now = new Date().toISOString();

  return {
    command: 'start',
    payload: {
      contractVersion: '1.0.0',
      source: 'chat',
      messageId,
      receivedAt: now,
      reporter: {
        email: 'n8n-webhook@example.com',
        name: 'n8n Webhook User',
      },
      bug: {
        title: title.slice(0, 200),
        description: description.slice(0, 8000),
        severity,
        component,
        ...(affectedArea ? { affectedArea } : {}),
        environment: 'local-dev',
      },
      metadata: {
        emailSubject: `[BUG] ${title}`,
        rawEmailSnippet: text.slice(0, 500),
        labels: ['n8n-webhook', 'demo'],
      },
    },
  };
}

const parsed = parseBugIntake(chatInput);

if (parsed.command === 'reject') {
  const result = await apiRequest.call(this, 'POST', `/runs/${parsed.runId}/reject`, {
    rejectedBy: 'n8n-webhook@example.com',
    reason: parsed.rest || 'Rejected via n8n webhook',
  });
  return [{
    json: {
      response: `Rejected ${parsed.runId} — status: ${result.status}`,
    },
  }];
}

if (parsed.command === 'create-pr') {
  const result = await apiRequest.call(this, 'POST', `/runs/${parsed.runId}/create-pr`, {
    draft: false,
  });
  return [{
    json: {
      response: [
        `PR step for ${parsed.runId}`,
        `Status: ${result.status}`,
        result.git?.prUrl ? `PR: ${result.git.prUrl}` : '',
        result.error ? `Error: ${result.error.message}` : '',
      ].filter(Boolean).join('\n'),
    },
  }];
}

if (parsed.command === 'approve') {
  const result = await apiRequest.call(this, 'POST', `/runs/${parsed.runId}/approve`, {
    approvedBy: 'n8n-webhook@example.com',
    comment: 'Approved via n8n webhook',
    createPr: false,
  });
  return [{
    json: {
      response: [
        `Approved ${parsed.runId}`,
        `Status: ${result.status}`,
        result.error ? `Note: ${result.error.message}` : 'Use create-pr <runId> when ready.',
      ].join('\n'),
    },
  }];
}

if (parsed.command === 'status') {
  const run = await apiRequest.call(this, 'GET', `/runs/${parsed.runId}`);
  return [{ json: { response: formatRunSummary(run) } }];
}

if (parsed.command === 'cancel') {
  const result = await apiRequest.call(this, 'POST', `/runs/${parsed.runId}/cancel`, {
    cancelledBy: 'n8n-webhook@example.com',
    reason: 'Cancelled via n8n webhook',
  });
  return [{
    json: {
      response: `Cancelled ${parsed.runId} — status: ${result.status}`,
    },
  }];
}

const started = await apiRequest.call(this, 'POST', '/runs/start', parsed.payload);
const run = await pollRun.call(this, started.runId);

return [{
  json: {
    response: [
      `Started bug-fix run ${started.runId}`,
      `Branch: ${started.branchName}`,
      '',
      formatRunSummary(run),
    ].join('\n'),
  },
}];
