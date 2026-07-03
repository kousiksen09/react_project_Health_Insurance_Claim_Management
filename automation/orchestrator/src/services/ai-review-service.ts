import path from 'node:path';
import { config } from '../config.js';
import { runSingleAgentTurn, shouldDryRunAgent } from '../utils/cursor-agent-runner.js';
import type { AiReviewSummary } from '../types/contracts.js';
import { artifactService } from './artifact-service.js';
import { gitService } from './git-service.js';

function buildReviewPrompt(diff: string, truncated: boolean): string {
  return `# Automated code review

Review the diff below as a careful senior engineer would before merge. Look for: correctness
bugs, missing null/empty checks, security issues (injection, auth bypass, secrets), obvious
performance problems, and anything that contradicts the surrounding code's conventions.
Do not comment on formatting or style nits.

This is a **read-only review** — do not edit any file.

${truncated ? '_(diff truncated to fit context — review what is shown)_\n' : ''}
\`\`\`diff
${diff || '(no diff available)'}
\`\`\`

## Required output format

End your final message with exactly this fenced block:

\`\`\`
<REVIEW>
{
  "issuesFound": 0,
  "highSeverityCount": 0,
  "summary": "one paragraph overview of the review"
}
</REVIEW>
\`\`\`
`;
}

function parseReview(text: string): { issuesFound: number; highSeverityCount: number; summary: string } | null {
  const match = text.match(/<REVIEW>([\s\S]*?)<\/REVIEW>/i);
  if (!match) return null;
  try {
    const raw = match[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(raw) as { issuesFound?: number; highSeverityCount?: number; summary?: string };
    return {
      issuesFound: Number(parsed.issuesFound ?? 0),
      highSeverityCount: Number(parsed.highSeverityCount ?? 0),
      summary: String(parsed.summary ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Non-blocking AI review pass over the full diff, run just before Gate 2. Surfaced in the
 * approval summary alongside validation results; a reviewer decides what to do with it.
 */
export const aiReviewService = {
  async review(runId: string, baseBranch: string): Promise<AiReviewSummary> {
    if (shouldDryRunAgent()) {
      return { ran: false, issuesFound: 0, highSeverityCount: 0, summary: 'AI review skipped (dry-run / CURSOR_API_KEY not set).' };
    }

    const { diff, truncated } = await gitService.getDiff(baseBranch);
    if (!diff.trim()) {
      return { ran: false, issuesFound: 0, highSeverityCount: 0, summary: 'No diff to review.' };
    }

    const prompt = buildReviewPrompt(diff, truncated);
    const transcriptPath = path.join(config.artifactsRoot, runId, 'ai-review-transcript.jsonl');
    const result = await runSingleAgentTurn(transcriptPath, prompt);
    await artifactService.writeTextArtifact(runId, 'ai-review.md', result.text || '(no assistant text captured)');

    if (!result.success) {
      return { ran: false, issuesFound: 0, highSeverityCount: 0, summary: `AI review agent turn failed: ${result.error ?? 'unknown error'}` };
    }

    const parsed = parseReview(result.text);
    if (!parsed) {
      return { ran: true, issuesFound: 0, highSeverityCount: 0, summary: 'Review completed but structured summary could not be parsed — see ai-review.md.', reviewArtifact: 'ai-review.md' };
    }

    return { ran: true, ...parsed, reviewArtifact: 'ai-review.md' };
  },
};
