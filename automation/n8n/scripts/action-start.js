/**
 * n8n Code node — 🐛 Start Bug Fix
 *
 * Receives parsed request from the "Parse Request" node.
 * Submits the bug report to the orchestrator, then polls until
 * the run reaches a terminal/reviewable state (up to 15 min).
 */

const CONFIG = {
  ORCHESTRATOR_URL: 'http://127.0.0.1:4400',
  ORCHESTRATOR_API_KEY: '',
};

const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

const ALLOWED_COMPONENTS = new Set(['frontend', 'backend', 'fullstack', 'unknown']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function normalizeComponent(v) {
  const s = String(v || 'unknown').toLowerCase().trim();
  if (ALLOWED_COMPONENTS.has(s)) return s;
  if (s.includes('front')) return 'frontend';
  if (s.includes('back') || s.includes('api') || s.includes('dotnet')) return 'backend';
  if (s.includes('full')) return 'fullstack';
  return 'unknown';
}

function normalizeSeverity(v) {
  const s = String(v || 'medium').toLowerCase().trim();
  return ALLOWED_SEVERITIES.has(s) ? s : 'medium';
}

async function apiRequest(method, path, body) {
  return await this.helpers.httpRequest({
    method,
    url: `${ORCHESTRATOR_URL}${path}`,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
    json: true,
    timeout: 300000,
  });
}

async function pollUntilReady(runId) {
  const terminal = new Set(['awaiting_approval', 'approved', 'rejected', 'pr_created', 'failed']);
  const MAX = 180; // 15 minutes
  for (let i = 0; i < MAX; i++) {
    const run = await apiRequest.call(this, 'GET', `/runs/${runId}`);
    if (terminal.has(run.status)) return run;
    if (i % 6 === 0) console.log(`[start] poll ${i + 1}/${MAX} — ${runId} status: ${run.status}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Run ${runId} did not finish within 15 minutes. Check status manually.`);
}

function parseBugReport(text, reporterEmail) {
  let title = 'Bug report from dashboard';
  let body = text;
  let component = 'unknown';
  let severity = 'medium';
  let affectedArea;

  const bugMatch = text.match(/^\[BUG\]\s*(.+?)(?:\n|$)/i);
  if (bugMatch) {
    title = bugMatch[1].trim().slice(0, 200);
    body = text.slice(bugMatch[0].length).trim();
  } else {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) { title = lines[0].slice(0, 200); body = lines.slice(1).join('\n') || title; }
  }

  const componentMatch = body.match(/^component:\s*(.+)$/im);
  if (componentMatch) component = normalizeComponent(componentMatch[1]);

  const areaMatch = body.match(/^area:\s*(.+)$/im);
  if (areaMatch) affectedArea = areaMatch[1].trim();

  const severityMatch = body.match(/^severity:\s*(.+)$/im);
  if (severityMatch) severity = normalizeSeverity(severityMatch[1]);

  const bug = { title, description: (body.trim() || title).slice(0, 8000), severity, component, environment: 'local-dev' };
  if (affectedArea) bug.affectedArea = affectedArea;

  return {
    contractVersion: '1.0.0',
    source: 'chat',
    messageId: `dashboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local`,
    receivedAt: new Date().toISOString(),
    reporter: { email: reporterEmail || 'dashboard@example.com', name: 'Dashboard User' },
    bug,
    metadata: { emailSubject: `[BUG] ${title}`, rawEmailSnippet: text.slice(0, 500), labels: ['dashboard', 'demo'] },
  };
}

function formatRunResult(run) {
  const a = run.analysis ?? {};
  const v = run.validation ?? {};
  const g = run.git ?? {};
  const files = (a.changedFiles ?? []);
  const STATUS_EMOJI = { awaiting_approval: '⏳', approved: '✅', rejected: '❌', pr_created: '🎉', failed: '🔴' };
  const emoji = STATUS_EMOJI[run.status] ?? '🔵';

  return [
    `${emoji} Run: ${run.runId}`,
    `Status: ${run.status}`,
    `Branch: ${g.branchName ?? 'n/a'}`,
    '',
    a.bugSummary ? `Summary: ${a.bugSummary}` : '',
    a.rootCauseSummary ? `Root cause: ${a.rootCauseSummary}` : '',
    '',
    files.length > 0 ? `Changed files (${files.length}):\n${files.map(f => `  • ${f}`).join('\n')}` : 'Changed files: none',
    '',
    v.passed !== undefined ? `Validation: ${v.passed ? '✅ passed' : '⚠️ issues found'}` : '',
    v.testSummary ? `  Tests: ${v.testSummary}` : '',
    v.failureReason ? `  Issue: ${v.failureReason}` : '',
    '',
    run.status === 'awaiting_approval'
      ? `→ Ready for review. Use the "✅ Review & Approve" tab with Run ID: ${run.runId}`
      : '',
    run.error ? `Error: ${run.error.message}` : '',
  ].filter(Boolean).join('\n');
}

try {
  if (!API_KEY) return [{ json: { response: 'Missing ORCHESTRATOR_API_KEY in n8n-local/.env', output: '' } }];

  const { message, reporterEmail } = $input.first().json;
  const intake = parseBugReport(message, reporterEmail);

  console.log(`[start] submitting bug: "${intake.bug.title}"`);
  const started = await apiRequest.call(this, 'POST', '/runs/start', intake);
  console.log(`[start] run created: ${started.runId}`);

  const run = await pollUntilReady.call(this, started.runId);
  const summary = formatRunResult(run);

  return [{ json: { response: summary, output: summary, runId: run.runId, status: run.status } }];
} catch (err) {
  const msg = `Failed to start bug fix:\n${err.message ?? err}`;
  return [{ json: { response: msg, output: msg } }];
}
