import { config } from '../config.js';
import { githubPrService } from './github-pr-service.js';
import { adoPrService } from './ado-pr-service.js';
import type { PullRequestResult } from '../types/contracts.js';

export interface PrService {
  phase: string;
  createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequestResult>;
  mergePullRequest(prNumber: number, commitTitle?: string): Promise<{ ok: boolean; sha?: string; error?: string }>;
  listTagNames(): Promise<string[]>;
  createTag(tagName: string, sha: string, message: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Provider facade: run-lifecycle.ts and release-service.ts always call `prService.*`
 * without knowing which host owns the git repo. Set GIT_PROVIDER=ado-repos to route
 * PR/merge/tag calls to Azure Repos instead of GitHub.
 */
export const prService: PrService = config.gitProvider === 'ado-repos' ? adoPrService : githubPrService;
