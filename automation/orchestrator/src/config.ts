import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const orchestratorRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(orchestratorRoot, '.env') });

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() ?? fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export const config = {
  version: '1.0.0',
  host: optionalEnv('ORCHESTRATOR_HOST', '127.0.0.1'),
  port: Number(optionalEnv('ORCHESTRATOR_PORT', '4400')),
  apiKey: optionalEnv('ORCHESTRATOR_API_KEY'),
  repoRoot: path.resolve(optionalEnv('REPO_ROOT', path.resolve(orchestratorRoot, '../..'))),
  artifactsDir: optionalEnv('ARTIFACTS_DIR', 'automation/artifacts'),
  defaultBaseBranch: optionalEnv('DEFAULT_BASE_BRANCH', 'main'),
  strictValidation: boolEnv('STRICT_VALIDATION', false),
  repoLock: boolEnv('REPO_LOCK', true),
  allowDirtyRepo: boolEnv('ALLOW_DIRTY_REPO', false),
  dataDir: path.join(orchestratorRoot, 'data'),
  github: {
    token: optionalEnv('GITHUB_TOKEN'),
    owner: optionalEnv('GITHUB_OWNER', 'Hishitha-GJ'),
    repo: optionalEnv('GITHUB_REPO', 'react_project_Health_Insurance_Claim_Management'),
  },
  cursor: {
    apiKey: optionalEnv('CURSOR_API_KEY'),
    model: optionalEnv('CURSOR_MODEL', 'composer-2.5'),
    dryRun: boolEnv('CURSOR_DRY_RUN', false),
  },
  validation: {
    timeoutMs: Number(optionalEnv('VALIDATION_TIMEOUT_MS', '600000')),
    skipFrontendBuild: boolEnv('VALIDATION_SKIP_FRONTEND_BUILD', false),
  },
  /** Base URL for approval-summary links (default orchestrator listen URL). */
  publicBaseUrl: optionalEnv(
    'ORCHESTRATOR_PUBLIC_URL',
    `http://${optionalEnv('ORCHESTRATOR_HOST', '127.0.0.1')}:${optionalEnv('ORCHESTRATOR_PORT', '4400')}`,
  ),
  get artifactsRoot(): string {
    return path.isAbsolute(this.artifactsDir)
      ? this.artifactsDir
      : path.join(this.repoRoot, this.artifactsDir);
  },
  get cursorConfigured(): boolean {
    return this.cursor.apiKey.length > 0;
  },
  get githubConfigured(): boolean {
    return this.github.token.length > 0;
  },
};

export function assertRuntimeConfig(): void {
  if (!config.repoRoot) {
    throw new Error('REPO_ROOT must be set');
  }
  if (!config.apiKey) {
    console.warn('[orchestrator] ORCHESTRATOR_API_KEY is not set — /runs endpoints will return 503.');
  }
}
