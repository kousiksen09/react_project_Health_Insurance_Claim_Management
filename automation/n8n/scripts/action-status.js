/**
 * n8n Code node — 📊 Check Run Status
 *
 * Returns a structured status summary for the given run ID.
 */

const CONFIG = { ORCHESTRATOR_URL: 'http://127.0.0.1:4400', ORCHESTRATOR_API_KEY: '' };
const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

async function apiRequest(method, path, body) {
  return await this.helpers.httpRequest({
    method, url: `${ORCHESTRATOR_URL}${path}`,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body, json: true, timeout: 30000,
  });
}

const STATUS_LABEL = {
  queued:            '🕐 Queued — waiting to start',
  analyzing:         '🔍 Analyzing repo and bug report',
  patch_created:     '🔧 Patch applied — running validation',
  validating:        '🧪 Running build and tests',
  awaiting_approval: '⏳ Awaiting your review and approval',
  approved:          '✅ Approved — ready to create PR',
  rejected:          '❌ Rejected — run closed',
  pr_created:        '🎉 Pull request created',
  failed:            '🔴 Failed — see error below',
};

function formatStatus(run) {
  const a = run.analysis ?? {};
  const v = run.validation ?? {};
  const g = run.git ?? {};
  const files = a.changedFiles ?? [];

  const lines = [
    `Run ID:  ${run.runId}`,
    `Status:  ${STATUS_LABEL[run.status] ?? run.status}`,
    `Branch:  ${g.branchName ?? 'n/a'}`,
    `Updated: ${run.updatedAt ?? 'n/a'}`,
  ];

  if (a.bugSummary) {
    lines.push('', '── Summary ──────────────────────────────');
    lines.push(a.bugSummary);
  }
  if (a.rootCauseSummary && a.rootCauseSummary !== 'Root cause will be refined by the Cursor agent after patching.') {
    lines.push('', '── Root Cause ───────────────────────────');
    lines.push(a.rootCauseSummary);
  }

  if (files.length > 0) {
    lines.push('', `── Changed Files (${files.length}) ─────────────────`);
    files.forEach((f) => lines.push(`  • ${f}`));
  }

  if (v.passed !== undefined) {
    lines.push('', '── Validation ───────────────────────────');
    lines.push(`  Build:   ${v.buildPassed ? '✅ passed' : '❌ failed'}`);
    lines.push(`  Tests:   ${v.testsPassed ? '✅ passed' : '⚠️ issues'}`);
    if (v.testSummary) lines.push(`  Detail:  ${v.testSummary}`);
    if (v.failureReason) lines.push(`  ⚠️ ${v.failureReason}`);
  }

  if (g.prUrl) {
    lines.push('', `── Pull Request ──────────────────────────`);
    lines.push(`  ${g.prUrl}`);
  }

  if (run.status === 'awaiting_approval') {
    lines.push('', '── Next Step ────────────────────────────');
    lines.push('  Switch to the "✅ Review & Approve" tab and enter this Run ID.');
  }

  if (run.error) {
    lines.push('', '── Error ────────────────────────────────');
    lines.push(`  Code:    ${run.error.code}`);
    lines.push(`  Message: ${run.error.message}`);
  }

  return lines.join('\n');
}

try {
  if (!API_KEY) return [{ json: { response: 'Missing ORCHESTRATOR_API_KEY.', output: '' } }];

  const { runId } = $input.first().json;
  const run = await apiRequest.call(this, 'GET', `/runs/${runId}`);
  const text = formatStatus(run);

  return [{ json: { response: text, output: text, runId: run.runId, status: run.status, run } }];
} catch (err) {
  const msg = `Could not fetch status:\n${err.message ?? err}`;
  return [{ json: { response: msg, output: msg } }];
}
