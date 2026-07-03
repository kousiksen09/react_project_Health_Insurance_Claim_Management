import { config } from '../config.js';
import { adoClient } from './ado-client.js';
import { prService } from './pr-service.js';
import type { ReleaseState } from '../types/contracts.js';
import { adoRefOf } from '../utils/intake-helpers.js';
import type { RunResult } from '../types/contracts.js';

function nextTag(existingTags: string[], impact: 'patch' | 'minor' | 'major'): string {
  const semver = existingTags
    .map((t) => t.match(/^v?(\d+)\.(\d+)\.(\d+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] ?? [0, 0, 0];

  const [major, minor, patch] = semver;
  if (impact === 'major') return `v${major + 1}.0.0`;
  if (impact === 'minor') return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

/**
 * Final stage: merge the approved PR, cut a semver tag, and close the loop in ADO.
 * Triggered by POST /runs/:id/uat-approve (or directly after PR creation for the
 * bug-fix pipeline once ADO/CI wiring for that flow is enabled).
 */
export const releaseService = {
  async release(run: RunResult): Promise<ReleaseState> {
    const prNumber = run.git?.prNumber;
    if (!prNumber) {
      return { merged: false, adoClosed: false, error: 'No PR number on this run — cannot release.' };
    }

    const commitTitle = `${run.type === 'pbi' ? 'feat' : 'fix'}: ${run.git?.branchName ?? run.runId}`;
    const merge = await prService.mergePullRequest(prNumber, commitTitle);
    if (!merge.ok || !merge.sha) {
      return { merged: false, adoClosed: false, error: merge.error ?? 'PR merge failed' };
    }

    const impact = run.plan?.releaseImpact ?? 'patch';
    const existingTags = await prService.listTagNames();
    const tag = nextTag(existingTags, impact);
    const tagResult = await prService.createTag(tag, merge.sha, `Release ${tag} — ${commitTitle}`);

    const adoRef = adoRefOf(run.intake);
    let adoClosed = false;
    if (adoRef && config.adoConfigured) {
      const state = config.ado.states.done;
      const comment = `Released as ${tag} (merge commit ${merge.sha.slice(0, 7)}). PR: ${run.git?.prUrl ?? 'n/a'}`;
      const update = await adoClient.updateState(adoRef.workItemId, state, comment);
      adoClosed = update.ok;
    }

    return {
      merged: true,
      mergeCommitSha: merge.sha,
      tag: tagResult.ok ? tag : undefined,
      releasedAt: new Date().toISOString(),
      adoClosed,
      error: !tagResult.ok ? `Merged but tag creation failed: ${tagResult.error}` : undefined,
    };
  },
};
