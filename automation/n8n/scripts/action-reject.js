/**
 * n8n Code node — ❌ Reject Run
 *
 * Rejects the run, releasing the repo lock.
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

try {
  if (!API_KEY) return [{ json: { response: 'Missing ORCHESTRATOR_API_KEY.', output: '' } }];

  const { runId, reporterEmail, message } = $input.first().json;

  const result = await apiRequest.call(this, 'POST', `/runs/${runId}/reject`, {
    rejectedBy: reporterEmail || 'dashboard@example.com',
    reason: message || 'Rejected via Bug Fix Dashboard',
  });

  const lines = [
    `❌ Run rejected: ${runId}`,
    `   Status: ${result.status}`,
    `   Rejected by: ${result.approval?.rejectedBy ?? 'n/a'}`,
    result.approval?.rejectedReason ? `   Reason: ${result.approval.rejectedReason}` : '',
    '',
    'The repo lock has been released. You can start a new bug fix run.',
  ].filter(Boolean).join('\n');

  return [{ json: { response: lines, output: lines, runId, status: result.status } }];
} catch (err) {
  const body = err.response?.body ?? err.response?.data;
  const detail = body?.error?.message ?? err.message ?? 'Rejection failed';
  const msg = `Could not reject run:\n${detail}`;
  return [{ json: { response: msg, output: msg } }];
}
