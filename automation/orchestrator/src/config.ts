import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const orchestratorRoot = path.resolve(__dirname, '..');

// Lets multiple orchestrator instances (one per target application) share the same codebase,
// e.g. `$env:ORCHESTRATOR_ENV_FILE='.env.pci'; npm run dev`. Defaults to `.env`.
const envFileName = process.env.ORCHESTRATOR_ENV_FILE?.trim() || '.env';
dotenv.config({ path: path.join(orchestratorRoot, envFileName) });

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
  dataDir: path.isAbsolute(optionalEnv('DATA_DIR', ''))
    ? optionalEnv('DATA_DIR')
    : path.join(orchestratorRoot, optionalEnv('DATA_DIR', 'data')),
  /** Which host hosts the git repo's pull requests / tags. Drives which pr-service implementation is used. */
  gitProvider: (optionalEnv('GIT_PROVIDER', 'github').toLowerCase() === 'ado-repos'
    ? 'ado-repos'
    : 'github') as 'github' | 'ado-repos',
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
  ado: {
    org: optionalEnv('ADO_ORG'),
    project: optionalEnv('ADO_PROJECT'),
    /** Azure Repos git repository name (only needed when GIT_PROVIDER=ado-repos). Defaults to ADO_PROJECT. */
    repo: optionalEnv('ADO_REPO') || optionalEnv('ADO_PROJECT'),
    pat: optionalEnv('ADO_PAT'),
    /** ADO states written by the pipeline as the PBI/bug moves through gates. Override per-process template. */
    states: {
      planApproved: optionalEnv('ADO_STATE_PLAN_APPROVED', 'Active'),
      inReview: optionalEnv('ADO_STATE_IN_REVIEW', 'In Review'),
      resolved: optionalEnv('ADO_STATE_RESOLVED', 'Resolved'),
      done: optionalEnv('ADO_STATE_DONE', 'Closed'),
    },
  },
  plan: {
    maxLoc: Number(optionalEnv('MAX_PLAN_LOC', '400')),
  },
  coverage: {
    minFilePct: Number(optionalEnv('MIN_FILE_COVERAGE', '60')),
  },
  n8nEventWebhookUrl: optionalEnv('N8N_EVENT_WEBHOOK_URL'),
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
  get adoConfigured(): boolean {
    return this.ado.org.length > 0 && this.ado.project.length > 0 && this.ado.pat.length > 0;
  },
  /** True when Azure Repos has everything it needs to create/merge/tag pull requests. */
  get adoRepoConfigured(): boolean {
    return this.ado.org.length > 0 && this.ado.project.length > 0 && this.ado.repo.length > 0 && this.ado.pat.length > 0;
  },
  /** Provider-agnostic gate used before PR creation, regardless of which host owns the git repo. */
  get prProviderConfigured(): boolean {
    return this.gitProvider === 'ado-repos' ? this.adoRepoConfigured : this.githubConfigured;
  },
  get prProviderMissingMessage(): string {
    return this.gitProvider === 'ado-repos'
      ? 'ADO_ORG, ADO_PROJECT, ADO_REPO and ADO_PAT are required for Azure Repos PR creation'
      : 'GITHUB_TOKEN is required for PR creation';
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
