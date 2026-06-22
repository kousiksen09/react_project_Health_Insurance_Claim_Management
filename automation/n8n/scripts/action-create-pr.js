/**
 * n8n Code node — 📦 Create GitHub PR
 *
 * Creates a GitHub pull request for an approved run.
 * Requires GITHUB_TOKEN in orchestrator .env.
 */

const CONFIG = { ORCHESTRATOR_URL: 'http://127.0.0.1:4400', ORCHESTRATOR_API_KEY: '' };
const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

async function apiRequest(method, path, body) {
  return await this.helpers.httpRequest({
    method, url: `${ORCHESTRATOR_URL}${path}`,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body, json: true, timeout: 120000,
  });
}

try {
  if (!API_KEY) return [{ json: { response: 'Missing ORCHESTRATOR_API_KEY.', output: '' } }];

  const { runId, draft } = $input.first().json;

  const result = await apiRequest.call(this, 'POST', `/runs/${runId}/create-pr`, {
    draft: Boolean(draft),
  });

  if (result.status === 'failed' || result.error) {
    const errorMsg = result.error?.message ?? 'PR creation failed';
    const hint = errorMsg.includes('GITHUB_TOKEN')
      ? '\n→ Set GITHUB_TOKEN in automation/orchestrator/.env and restart the orchestrator.'
      : '';
    return [{ json: { response: `❌ PR creation failed:\n${errorMsg}${hint}`, output: '' } }];
  }

  const prUrl = result.git?.prUrl;
  const lines = [
    `🎉 Pull request created for run ${runId}`,
    `   Status: ${result.status}`,
    prUrl ? `   PR URL: ${prUrl}` : '   (PR URL not available yet)',
    result.git?.branchName ? `   Branch: ${result.git.branchName}` : '',
    '',
    '⚠️  Review the diff on GitHub before merging — this PR was created by automation.',
  ].filter(Boolean).join('\n');

  return [{ json: { response: lines, output: lines, runId, status: result.status, prUrl: prUrl ?? null } }];
} catch (err) {
  const body = err.response?.body ?? err.response?.data;
  const detail = body?.error?.message ?? err.message ?? 'PR creation failed';
  const hint = detail.includes('GITHUB_TOKEN') || detail.includes('503')
    ? '\n→ Set GITHUB_TOKEN in automation/orchestrator/.env and restart the orchestrator.'
    : '';
  const msg = `Could not create PR:\n${detail}${hint}`;
  return [{ json: { response: msg, output: msg } }];
}
