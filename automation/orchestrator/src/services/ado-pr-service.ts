import { config } from '../config.js';
import type { PullRequestResult } from '../types/contracts.js';

interface AdoPullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  isDraft: boolean;
  status: string;
  lastMergeSourceCommit?: { commitId: string };
  lastMergeCommit?: { commitId: string };
}

interface AdoRef {
  name: string;
  objectId: string;
}

const ZERO_OBJECT_ID = '0000000000000000000000000000000000000000';

function repoBase(): string {
  const org = config.ado.org;
  const project = encodeURIComponent(config.ado.project);
  const repo = encodeURIComponent(config.ado.repo);
  return `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}`;
}

function webPrUrl(pullRequestId: number): string {
  const org = config.ado.org;
  const project = encodeURIComponent(config.ado.project);
  const repo = encodeURIComponent(config.ado.repo);
  return `https://dev.azure.com/${org}/${project}/_git/${repo}/pullrequest/${pullRequestId}`;
}

async function adoGitRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  if (!config.adoRepoConfigured) {
    return { ok: false, status: 503, error: config.prProviderMissingMessage };
  }

  const url = `${repoBase()}${path}${path.includes('?') ? '&' : '?'}api-version=7.1`;
  const auth = Buffer.from(`:${config.ado.pat}`).toString('base64');

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const message =
        (data as { message?: string } | undefined)?.message || text.slice(0, 500) || `Azure DevOps API ${response.status}`;
      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Azure DevOps request failed',
    };
  }
}

/**
 * Azure Repos equivalent of pr-service.ts, used when GIT_PROVIDER=ado-repos.
 * Same PullRequestResult contract as the GitHub implementation so run-lifecycle.ts /
 * release-service.ts never need to know which host owns the git repo.
 */
export const adoPrService = {
  phase: 'Phase 7 (Azure Repos)',

  async findOpenPullRequest(headBranch: string): Promise<AdoPullRequest | null> {
    const result = await adoGitRequest<{ value: AdoPullRequest[] }>(
      'GET',
      `/pullrequests?searchCriteria.status=active&searchCriteria.sourceRefName=${encodeURIComponent(`refs/heads/${headBranch}`)}`,
    );
    if (!result.ok || !result.data?.value?.length) {
      return null;
    }
    return result.data.value[0];
  },

  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequestResult> {
    const existing = await this.findOpenPullRequest(params.head);
    if (existing) {
      return {
        success: true,
        prUrl: webPrUrl(existing.pullRequestId),
        prNumber: existing.pullRequestId,
        title: existing.title,
        body: existing.description ?? params.body,
        draft: existing.isDraft,
        alreadyExisted: true,
      };
    }

    const result = await adoGitRequest<AdoPullRequest>('POST', '/pullrequests', {
      sourceRefName: `refs/heads/${params.head}`,
      targetRefName: `refs/heads/${params.base}`,
      title: params.title,
      description: params.body,
      isDraft: params.draft ?? false,
    });

    if (!result.ok || !result.data) {
      return {
        success: false,
        prUrl: null,
        prNumber: null,
        title: params.title,
        body: params.body,
        draft: params.draft ?? false,
        alreadyExisted: false,
        error: result.error ?? 'Failed to create pull request',
      };
    }

    return {
      success: true,
      prUrl: webPrUrl(result.data.pullRequestId),
      prNumber: result.data.pullRequestId,
      title: result.data.title,
      body: result.data.description ?? params.body,
      draft: result.data.isDraft,
      alreadyExisted: false,
    };
  },

  async mergePullRequest(
    prNumber: number,
    commitTitle?: string,
  ): Promise<{ ok: boolean; sha?: string; error?: string }> {
    const current = await adoGitRequest<AdoPullRequest>('GET', `/pullrequests/${prNumber}`);
    if (!current.ok || !current.data?.lastMergeSourceCommit?.commitId) {
      return { ok: false, error: current.error ?? 'Failed to read pull request before merge' };
    }

    const result = await adoGitRequest<AdoPullRequest>('PATCH', `/pullrequests/${prNumber}`, {
      status: 'completed',
      lastMergeSourceCommit: { commitId: current.data.lastMergeSourceCommit.commitId },
      completionOptions: {
        mergeStrategy: 'squash',
        mergeCommitMessage: commitTitle,
        deleteSourceBranch: false,
      },
    });

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error ?? 'Merge failed' };
    }
    if (result.data.status !== 'completed' || !result.data.lastMergeCommit?.commitId) {
      return { ok: false, error: `Merge did not complete (status: ${result.data.status})` };
    }
    return { ok: true, sha: result.data.lastMergeCommit.commitId };
  },

  async listTagNames(): Promise<string[]> {
    const result = await adoGitRequest<{ value: AdoRef[] }>('GET', '/refs?filter=tags');
    if (!result.ok || !result.data) return [];
    return result.data.value.map((r) => r.name.replace(/^refs\/tags\//, ''));
  },

  async createTag(tagName: string, sha: string, message: string): Promise<{ ok: boolean; error?: string }> {
    const tagObj = await adoGitRequest<{ objectId: string }>('POST', '/annotatedtags', {
      name: tagName,
      taggedObject: { objectId: sha },
      message,
    });
    if (!tagObj.ok || !tagObj.data) {
      return { ok: false, error: tagObj.error ?? 'Failed to create tag object' };
    }

    const ref = await adoGitRequest<unknown>('POST', '/refs', [
      { name: `refs/tags/${tagName}`, oldObjectId: ZERO_OBJECT_ID, newObjectId: tagObj.data.objectId },
    ]);
    if (!ref.ok) {
      return { ok: false, error: ref.error ?? 'Failed to create tag ref' };
    }
    return { ok: true };
  },
};
