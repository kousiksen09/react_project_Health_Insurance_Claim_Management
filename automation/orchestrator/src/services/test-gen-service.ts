import path from 'node:path';
import { config } from '../config.js';
import { runSingleAgentTurn, shouldDryRunAgent } from '../utils/cursor-agent-runner.js';
import type { PbiIntakePayload, WorkItemPlan } from '../types/contracts.js';
import { artifactService } from './artifact-service.js';
import { gitService } from './git-service.js';

export interface TestGenResult {
  ran: boolean;
  addedOrModified: string[];
  note?: string;
  error?: string;
}

function buildTestGenPrompt(intake: PbiIntakePayload, plan: WorkItemPlan, changedFiles: string[]): string {
  const acLines = plan.acceptanceCriteria
    .map((ac) => `- **${ac.id}**: Given ${ac.given}, when ${ac.when}, then ${ac.then}`)
    .join('\n');

  return `# Add tests for PBI #${intake.ado.workItemId}: ${intake.pbi.title}

The implementation for this PBI is complete on the current branch. Add or extend automated
tests (Vitest for frontend, xUnit for backend — match whatever the repo already uses) that
cover the acceptance criteria and edge cases below.

## Files changed by this PBI so far

${changedFiles.map((f) => `- \`${f}\``).join('\n') || '(none detected — inspect the git diff yourself)'}

## Acceptance criteria to cover

${acLines}

## Edge cases to cover

${plan.edgeCases.map((e) => `- ${e}`).join('\n')}

## Hard constraints

- Only add or extend test files; do not change production code unless a test reveals an
  actual bug in the implementation, in which case fix it minimally and explain why.
- Follow the existing test file naming and structure conventions in this repo.
- Do not create commits, push, or open PRs.

## Required output format

End your final message with:

## Test Summary
(one paragraph: which files you added/changed and what they cover)
`;
}

/**
 * Post-coding stage: asks the agent to add/extend tests for the files it just changed.
 * Failure here does not fail the run — it's recorded as a note so validation and the
 * Gate 2 reviewer can see coverage was attempted.
 */
export const testGenService = {
  async generateTests(runId: string, intake: PbiIntakePayload, plan: WorkItemPlan, baseBranch: string): Promise<TestGenResult> {
    if (shouldDryRunAgent()) {
      return { ran: false, addedOrModified: [], note: 'CURSOR_API_KEY not set or dry-run — test generation skipped.' };
    }

    const { files: filesBefore } = await gitService.listChangedFiles(baseBranch);
    const prompt = buildTestGenPrompt(intake, plan, filesBefore);
    const transcriptPath = path.join(config.artifactsRoot, runId, 'test-gen-transcript.jsonl');

    const result = await runSingleAgentTurn(transcriptPath, prompt);
    await artifactService.writeTextArtifact(runId, 'test-gen-transcript.md', result.text || '(no assistant text captured)');

    if (!result.success) {
      return { ran: true, addedOrModified: [], error: result.error, note: 'Test generation agent turn failed; proceeding without generated tests.' };
    }

    const { files: filesAfter } = await gitService.listChangedFiles(baseBranch);
    const newlyTouched = filesAfter.filter((f) => !filesBefore.includes(f));

    return { ran: true, addedOrModified: newlyTouched };
  },
};
