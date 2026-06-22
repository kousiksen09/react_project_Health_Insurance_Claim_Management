/**
 * n8n Code node — ✅ Approve Run
 *
 * Approves the run. Optionally triggers PR creation if createPr=true.
 */

const CONFIG = { ORCHESTRATOR_URL: 'http://127.0.0.1:4400', ORCHESTRATOR_API_KEY: '' };
const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

async function apiRequest(method, path, body) {
  return await this.helpers.httpRequest({
    method, url: `${ORCHESTRATOR_URL}${path}`,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body, json: true, timeout: 60000,
  });
}

try {
  if (!API_KEY) return [{ json: { response: 'Missing ORCHESTRATOR_API_KEY.', output: '' } }];

  const { runId, reporterEmail, reviewComment, createPr } = $input.first().json;

  const result = await apiRequest.call(this, 'POST', `/runs/${runId}/approve`, {
    approvedBy: reporterEmail || 'dashboard@example.com',
    comment: reviewComment || 'Approved via Bug Fix Dashboard',
    createPr: Boolean(createPr),
  });

  const lines = [
    `✅ Run approved: ${runId}`,
    `   Status: ${result.status}`,
    `   Approved by: ${result.approval?.approvedBy ?? 'n/a'}`,
    result.approval?.comment ? `   Comment: ${result.approval.comment}` : '',
    '',
    createPr
      ? '📦 PR creation started — check status in a moment to see the PR URL.'
      : '→ To create a GitHub PR, use the "📦 Create GitHub PR" action with this Run ID.',
  ].filter(Boolean).join('\n');

  return [{ json: { response: lines, output: lines, runId, status: result.status } }];
} catch (err) {
  const body = err.response?.body ?? err.response?.data;
  const detail = body?.error?.message ?? err.message ?? 'Approval failed';
  const msg = `Could not approve run:\n${detail}`;
  return [{ json: { response: msg, output: msg } }];
}
