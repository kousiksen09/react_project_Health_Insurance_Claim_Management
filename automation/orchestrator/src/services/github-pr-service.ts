import { config } from '../config.js';
import type { PullRequestResult } from '../types/contracts.js';

interface GitHubPullRequest {
  number: number;
  html_url: string;
  title: string;
  body: string | null;
  draft: boolean;
}

async function githubRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  if (!config.githubConfigured) {
    return { ok: false, status: 503, error: 'GITHUB_TOKEN is not configured' };
  }

  const url = `https://api.github.com${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.github.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'bugfix-orchestrator/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
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
        (data as { message?: string } | undefined)?.message ||
        text.slice(0, 500) ||
        `GitHub API ${response.status}`;
      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'GitHub request failed',
    };
  }
}

/**
 * Phase 7: create GitHub PR via REST API (no auto-merge). Used when GIT_PROVIDER=github.
 */
export const githubPrService = {
  phase: 'Phase 7',

  async findOpenPullRequest(headBranch: string): Promise<GitHubPullRequest | null> {
    const owner = config.github.owner;
    const repo = config.github.repo;
    const head = `${owner}:${headBranch}`;
    const result = await githubRequest<GitHubPullRequest[]>(
      'GET',
      `/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(head)}`,
    );
    if (!result.ok || !result.data?.length) {
      return null;
    }
    return result.data[0];
  },

  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequestResult> {
    const owner = config.github.owner;
    const repo = config.github.repo;

    const existing = await this.findOpenPullRequest(params.head);
    if (existing) {
      return {
        success: true,
        prUrl: existing.html_url,
        prNumber: existing.number,
        title: existing.title,
        body: existing.body ?? params.body,
        draft: existing.draft,
        alreadyExisted: true,
      };
    }

    const result = await githubRequest<GitHubPullRequest>('POST', `/repos/${owner}/${repo}/pulls`, {
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      draft: params.draft ?? false,
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
      prUrl: result.data.html_url,
      prNumber: result.data.number,
      title: result.data.title,
      body: result.data.body ?? params.body,
      draft: result.data.draft,
      alreadyExisted: false,
    };
  },

  async mergePullRequest(
    prNumber: number,
    commitTitle?: string,
  ): Promise<{ ok: boolean; sha?: string; error?: string }> {
    const owner = config.github.owner;
    const repo = config.github.repo;
    const result = await githubRequest<{ sha: string; merged: boolean; message?: string }>(
      'PUT',
      `/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      { merge_method: 'squash', commit_title: commitTitle },
    );
    if (!result.ok || !result.data?.merged) {
      return { ok: false, error: result.error ?? result.data?.message ?? 'Merge failed' };
    }
    return { ok: true, sha: result.data.sha };
  },

  async listTagNames(): Promise<string[]> {
    const owner = config.github.owner;
    const repo = config.github.repo;
    const result = await githubRequest<Array<{ name: string }>>('GET', `/repos/${owner}/${repo}/tags?per_page=100`);
    if (!result.ok || !result.data) return [];
    return result.data.map((t) => t.name);
  },

  async createTag(tagName: string, sha: string, message: string): Promise<{ ok: boolean; error?: string }> {
    const owner = config.github.owner;
    const repo = config.github.repo;
    const tagObj = await githubRequest<{ sha: string }>('POST', `/repos/${owner}/${repo}/git/tags`, {
      tag: tagName,
      message,
      object: sha,
      type: 'commit',
    });
    if (!tagObj.ok || !tagObj.data) {
      return { ok: false, error: tagObj.error ?? 'Failed to create tag object' };
    }
    const ref = await githubRequest('POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/tags/${tagName}`,
      sha: tagObj.data.sha,
    });
    if (!ref.ok) {
      return { ok: false, error: ref.error ?? 'Failed to create tag ref' };
    }
    return { ok: true };
  },
};
