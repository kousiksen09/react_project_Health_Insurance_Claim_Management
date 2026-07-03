/**
 * n8n Code node — staging deploy trigger + poll, driven by the orchestrator's
 * outbound webhook events (N8N_EVENT_WEBHOOK_URL in automation/orchestrator/.env).
 *
 * Wire-up:
 *   1. Set N8N_EVENT_WEBHOOK_URL in automation/orchestrator/.env to this workflow's webhook URL.
 *   2. The orchestrator POSTs { event, runId, type, status, branchName, prUrl, ... } on every
 *      state change. This node only acts on event === "pr.created".
 *   3. Dispatches a GitHub Actions workflow (workflow_dispatch) on the PR branch, polls until
 *      it finishes, then reports the result back via POST /runs/:id/deploy-status.
 *
 * Adapting to Azure Pipelines instead of GitHub Actions: replace the two `githubRequest`
 * calls below with the Azure Pipelines REST API
 * (POST .../_apis/pipelines/{pipelineId}/runs to start, GET .../runs/{runId} to poll).
 */

const CONFIG = {
  ORCHESTRATOR_URL: 'http://127.0.0.1:4400',
  ORCHESTRATOR_API_KEY: '',
  GITHUB_TOKEN: '',
  GITHUB_OWNER: 'Hishitha-GJ',
  GITHUB_REPO: 'react_project_Health_Insurance_Claim_Management',
  // Workflow file that performs the staging deploy, e.g. ".github/workflows/deploy-staging.yml"
  GITHUB_DEPLOY_WORKFLOW_FILE: 'deploy-staging.yml',
  STAGING_ENVIRONMENT: 'staging',
  STAGING_URL_TEMPLATE: '', // e.g. 'https://staging.example.com' — filled in manually if known
  MAX_POLL_ATTEMPTS: 180, // 180 * 10s = 30 minutes
  POLL_INTERVAL_MS: 10000,
};

const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;
const GITHUB_TOKEN = $env.GITHUB_TOKEN || CONFIG.GITHUB_TOKEN;
const GITHUB_OWNER = $env.GITHUB_OWNER || CONFIG.GITHUB_OWNER;
const GITHUB_REPO = $env.GITHUB_REPO || CONFIG.GITHUB_REPO;

function reply(json) {
  return [{ json }];
}

async function orchestratorRequest(method, path, body) {
  return this.helpers.httpRequest({
    method,
    url: `${ORCHESTRATOR_URL}${path}`,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
    json: true,
    timeout: 30000,
  });
}

async function githubRequest(method, path, body) {
  return this.helpers.httpRequest({
    method,
    url: `https://api.github.com${path}`,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'sdlc-orchestrator-n8n',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body,
    json: true,
    timeout: 30000,
    returnFullResponse: true,
  });
}

const event = $input.first().json ?? {};

if (event.event !== 'pr.created') {
  return reply({ ok: true, skipped: true, reason: `Ignoring event '${event.event}'` });
}
if (!API_KEY || !GITHUB_TOKEN) {
  return reply({ ok: false, message: 'Missing ORCHESTRATOR_API_KEY or GITHUB_TOKEN in node config / n8n env.' });
}

const { runId, branchName } = event;
if (!runId || !branchName) {
  return reply({ ok: false, message: 'Event payload missing runId/branchName.' });
}

try {
  await orchestratorRequest.call(this, 'POST', `/runs/${runId}/deploy-status`, {
    status: 'in_progress',
    environment: CONFIG.STAGING_ENVIRONMENT,
    note: `Dispatching ${CONFIG.GITHUB_DEPLOY_WORKFLOW_FILE} on ${branchName}`,
  });

  await githubRequest.call(
    this,
    'POST',
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${CONFIG.GITHUB_DEPLOY_WORKFLOW_FILE}/dispatches`,
    { ref: branchName },
  );

  // workflow_dispatch doesn't return a run id — find the most recent run for this workflow+branch.
  let runsList;
  for (let findAttempt = 0; findAttempt < 6; findAttempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    runsList = await githubRequest.call(
      this,
      'GET',
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${CONFIG.GITHUB_DEPLOY_WORKFLOW_FILE}/runs?branch=${encodeURIComponent(branchName)}&per_page=1`,
    );
    if (runsList.body?.workflow_runs?.length > 0) break;
  }

  const run = runsList?.body?.workflow_runs?.[0];
  if (!run) {
    await orchestratorRequest.call(this, 'POST', `/runs/${runId}/deploy-status`, {
      status: 'failed',
      note: 'Dispatched workflow but could not find the resulting run — check GitHub Actions manually.',
    });
    return reply({ ok: false, runId, message: 'Workflow dispatched but run not found after 18s.' });
  }

  const pipelineRunUrl = run.html_url;
  let conclusion = run.conclusion;
  let currentRunId = run.id;

  for (let attempt = 0; attempt < CONFIG.MAX_POLL_ATTEMPTS && !conclusion; attempt++) {
    await new Promise((r) => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
    const check = await githubRequest.call(this, 'GET', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${currentRunId}`);
    conclusion = check.body?.conclusion;
  }

  const succeeded = conclusion === 'success';
  await orchestratorRequest.call(this, 'POST', `/runs/${runId}/deploy-status`, {
    status: succeeded ? 'succeeded' : 'failed',
    environment: CONFIG.STAGING_ENVIRONMENT,
    url: CONFIG.STAGING_URL_TEMPLATE || undefined,
    pipelineRunUrl,
    note: conclusion ? `Workflow conclusion: ${conclusion}` : 'Timed out waiting for workflow to finish.',
  });

  return reply({
    ok: true,
    runId,
    deployStatus: succeeded ? 'succeeded' : 'failed',
    pipelineRunUrl,
    message: `Deploy ${succeeded ? 'succeeded' : 'failed'} for run ${runId} (${branchName}).`,
  });
} catch (err) {
  const status = err.statusCode ?? err.response?.statusCode ?? 'unknown';
  const message = `Deploy trigger/poll error (HTTP ${status}): ${err.message}`;
  try {
    await orchestratorRequest.call(this, 'POST', `/runs/${runId}/deploy-status`, { status: 'failed', note: message });
  } catch {
    /* best-effort — orchestrator may be unreachable */
  }
  return reply({ ok: false, runId, message });
}
