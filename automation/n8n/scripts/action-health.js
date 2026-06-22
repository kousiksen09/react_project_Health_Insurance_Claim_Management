/**
 * n8n Code node — Orchestrator health check (proxied server-side).
 * Avoids browser CORS when dashboard at :5678 checks orchestrator at :4400.
 */

const CONFIG = { ORCHESTRATOR_URL: 'http://127.0.0.1:4400', ORCHESTRATOR_API_KEY: '' };
const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL).replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;

try {
  const result = await this.helpers.httpRequest({
    method: 'GET',
    url: `${ORCHESTRATOR_URL}/health`,
    headers: { Accept: 'application/json' },
    json: true,
    timeout: 8000,
    ignoreHttpStatusErrors: true,
  });

  const online = result?.status === 'ok';
  return [{
    json: {
      online,
      orchestrator: result,
      response: online ? 'Orchestrator: online' : 'Orchestrator: unhealthy',
    },
  }];
} catch (err) {
  const msg = err.message?.includes('ECONNREFUSED')
    ? 'Orchestrator: offline — run npm run dev in automation/orchestrator'
    : `Orchestrator: unreachable (${err.message})`;
  return [{ json: { online: false, response: msg } }];
}
