import path from 'node:path';
import { config } from '../config.js';
import { runSingleAgentTurn, shouldDryRunAgent } from '../utils/cursor-agent-runner.js';
import { titleOf } from '../utils/intake-helpers.js';
import type { WorkItemIntakePayload } from '../types/contracts.js';
import { artifactService } from './artifact-service.js';
import { gitService } from './git-service.js';

export interface DocUpdateResult {
  ran: boolean;
  updatedFiles: string[];
  note?: string;
  error?: string;
}

function buildDocPrompt(intake: WorkItemIntakePayload, changedFiles: string[]): string {
  return `# Update documentation for: ${titleOf(intake)}

The implementation on this branch is approved and about to become a pull request. Update
project documentation to reflect the change:

- Update \`README.md\` only if this change affects setup, usage, or a documented feature.
- Add an entry to \`CHANGELOG.md\` if one exists at the repo root; create a short "Unreleased"
  section if the file exists but has no such section. Do not create a CHANGELOG.md if none
  exists.
- Update any API documentation under \`docs/\` if this change adds/modifies an endpoint.

## Files changed by this work item

${changedFiles.map((f) => `- \`${f}\``).join('\n') || '(none detected)'}

## Hard constraints

- Only touch documentation files. Do not change source code.
- If none of the above apply, make no changes and say so — do not pad the README with
  unnecessary detail.
- Do not create commits, push, or open PRs.

## Required output format

End your final message with:

## Doc Update Summary
(one paragraph: which doc files you changed, or why none needed changes)
`;
}

/**
 * Runs between the patch approval gate and PR creation. Best-effort: failures here do not
 * block PR creation, they're just recorded as a note in the run.
 */
export const docService = {
  async updateDocs(runId: string, intake: WorkItemIntakePayload, baseBranch: string): Promise<DocUpdateResult> {
    if (shouldDryRunAgent()) {
      return { ran: false, updatedFiles: [], note: 'Doc update skipped (dry-run / CURSOR_API_KEY not set).' };
    }

    const { files: filesBefore } = await gitService.listChangedFiles(baseBranch);
    const prompt = buildDocPrompt(intake, filesBefore);
    const transcriptPath = path.join(config.artifactsRoot, runId, 'doc-update-transcript.jsonl');
    const result = await runSingleAgentTurn(transcriptPath, prompt);
    await artifactService.writeTextArtifact(runId, 'doc-update.md', result.text || '(no assistant text captured)');

    if (!result.success) {
      return { ran: true, updatedFiles: [], error: result.error, note: 'Doc update agent turn failed; proceeding without doc changes.' };
    }

    const { files: filesAfter } = await gitService.listChangedFiles(baseBranch);
    const updatedFiles = filesAfter.filter((f) => !filesBefore.includes(f));
    return { ran: true, updatedFiles };
  },
};
