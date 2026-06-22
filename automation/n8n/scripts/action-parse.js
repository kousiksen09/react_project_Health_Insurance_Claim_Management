/**
 * n8n Code node — Parse & validate incoming dashboard request.
 *
 * Runs BEFORE the Switch node. Normalises the webhook payload (n8n 1.82
 * wraps POST JSON under `.body`) and returns a clean, validated object
 * so downstream action nodes can read $json.action / $json.runId / $json.message
 * directly without any further parsing.
 *
 * Outputs:
 *   { action, runId, message, reporterEmail, createPr, error? }
 */

const ALLOWED_ACTIONS = new Set(['start', 'status', 'approve', 'reject', 'create-pr', 'cancel']);
const ALLOWED_COMPONENTS = new Set(['frontend', 'backend', 'fullstack', 'unknown']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function unwrapBody(raw) {
  if (!raw || typeof raw !== 'object') return { message: String(raw ?? '').trim() };
  if (raw.body !== undefined && raw.body !== null) {
    if (typeof raw.body === 'string') {
      try { return JSON.parse(raw.body); } catch { return { message: raw.body }; }
    }
    if (typeof raw.body === 'object' && !Array.isArray(raw.body)) return raw.body;
  }
  return raw;
}

const raw = $input.first().json ?? {};
const payload = unwrapBody(raw);

const action = String(
  payload.action ?? raw.action ?? 'start',
).toLowerCase().trim();

const runId = String(
  payload.runId ?? payload.run_id ?? raw.runId ?? raw.run_id ?? '',
).trim();

const message = String(
  payload.message ?? payload.text ?? payload.bugReport ?? raw.message ?? raw.text ?? '',
).trim();

const reporterEmail = String(
  payload.reporterEmail ?? payload.email ?? 'dashboard@example.com',
).trim();

const createPr = Boolean(payload.createPr ?? payload.create_pr ?? false);
const draft = Boolean(payload.draft ?? false);
const reviewComment = String(payload.comment ?? payload.reviewComment ?? '').trim();

// Validate
if (!ALLOWED_ACTIONS.has(action)) {
  return [{
    json: {
      action: 'error',
      error: `Unknown action "${action}". Allowed: ${[...ALLOWED_ACTIONS].join(', ')}`,
      _originalAction: action,
    },
  }];
}

const needsRunId = ['status', 'approve', 'reject', 'create-pr', 'cancel'].includes(action);
if (needsRunId && !runId) {
  return [{
    json: {
      action: 'error',
      error: `Run ID is required for action "${action}".`,
      _originalAction: action,
    },
  }];
}

if (action === 'start' && !message) {
  return [{
    json: {
      action: 'error',
      error: 'Bug report text is required. Fill in the "Bug report" field.',
      _hint: 'Start the message with [BUG] Title, then add component:, area:, and a description.',
    },
  }];
}

return [{
  json: {
    action,
    runId,
    message,
    reporterEmail,
    createPr,
    draft,
    reviewComment,
    _parsedOk: true,
    _debugKeys: Object.keys(raw).join(', '),
  },
}];
