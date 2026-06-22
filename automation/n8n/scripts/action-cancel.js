/**
 * n8n Code node — 🚫 Cancel Run
 *
 * Cancels an in-flight run (queued/analyzing/patch_created/validating).
 * Use Reject instead for runs that are awaiting_approval.
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

  const result = await apiRequest.call(this, 'POST', `/runs/${runId}/cancel`, {
    cancelledBy: reporterEmail || 'dashboard@example.com',
    reason: message || 'Cancelled via Bug Fix Dashboard',
  });

  const lines = [
    `🚫 Run cancelled: ${runId}`,
    `   Status: ${result.status}`,
    '',
    'The repo lock has been released. You can start a new bug fix run.',
    '',
    'Note: if the run was "awaiting_approval", use Reject instead of Cancel.',
  ].join('\n');

  return [{ json: { response: lines, output: lines, runId, status: result.status } }];
} catch (err) {
  const body = err.response?.body ?? err.response?.data;
  const detail = body?.error?.message ?? err.message ?? 'Cancel failed';
  const hint = detail.includes('awaiting_approval')
    ? '\n→ This run is awaiting approval — use the Reject action instead.'
    : '';
  const msg = `Could not cancel run:\n${detail}${hint}`;
  return [{ json: { response: msg, output: msg } }];
}
