import type { BugIntakePayload } from '../types/contracts.js';
import type { RepoInspection } from '../services/repo-inspection-service.js';

export function buildBugFixPrompt(intake: BugIntakePayload, inspection: RepoInspection): string {
  const { bug } = intake;
  const steps =
    bug.stepsToReproduce?.map((step, index) => `${index + 1}. ${step}`).join('\n') ?? '(not provided)';

  const projectHints = [
    inspection.projects.frontend ? `- Frontend: \`${inspection.projects.frontend}\`` : null,
    inspection.projects.backend ? `- Backend: \`${inspection.projects.backend}\`` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `# Bug fix task (orchestrator demo)

You are fixing a reported bug in a local checkout. Work incrementally and keep the change minimal.

## Repository
- Root: \`${inspection.repoRoot}\`
- Branch: stay on the current feature branch (do not switch branches)
- Base branch: \`${inspection.defaultBranch}\`
${projectHints || '- (project layout not detected)'}

## Bug report
**Title:** ${bug.title}

**Component:** ${bug.component ?? 'unknown'}
**Severity:** ${bug.severity ?? 'medium'}
**Affected area:** ${bug.affectedArea ?? '(not specified)'}
**Environment:** ${bug.environment ?? '(not specified)'}

**Description:**
${bug.description}

**Steps to reproduce:**
${steps}

**Expected:** ${bug.expectedBehavior ?? '(not provided)'}
**Actual:** ${bug.actualBehavior ?? '(not provided)'}

## Constraints
- Make the smallest correct fix; avoid unrelated refactors
- Do not create commits unless needed to complete the fix
- Do not push, open PRs, or run deploy commands
- Prefer editing files under the affected area when possible
- If blocked, explain what is missing instead of guessing

## Required closing sections
End your final message with exactly these markdown headings:

## Summary
(one short paragraph describing what you changed)

## Root Cause
(brief explanation of why the bug occurred)
`;
}
