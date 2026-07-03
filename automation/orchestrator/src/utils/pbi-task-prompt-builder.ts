import type { PbiIntakePayload, PlanTask, WorkItemPlan } from '../types/contracts.js';

/** One turn of the multi-turn coding loop — the agent already saw the full plan when it authored it. */
export function buildPbiTaskPrompt(
  intake: PbiIntakePayload,
  plan: WorkItemPlan,
  task: PlanTask,
  attempt: number,
): string {
  const acLines = plan.acceptanceCriteria
    .map((ac) => `- **${ac.id}**: Given ${ac.given}, when ${ac.when}, then ${ac.then}`)
    .join('\n');

  const retryNote =
    attempt > 1
      ? `\n**This is a retry.** The previous attempt at this task did not produce the expected changes. ` +
        `Re-read the task and the files involved before trying again, and explain what went wrong if you hit the same issue.\n`
      : '';

  return `# Implement task ${task.id}: ${task.title}

This is part of the approved plan for PBI #${intake.ado.workItemId} (${intake.pbi.title}). The full
plan was approved by a human reviewer; you already have the plan context from the planning
turn. Implement **only this task** now — do not implement other tasks from the plan yet.
${retryNote}
## Task details

- **Layer:** ${task.layer}
- **Change type:** ${task.changeType}
- **Files (expected, may adjust if the real layout differs):** ${task.files.join(', ') || '(determine from context)'}
- **Depends on:** ${task.dependsOn.join(', ') || 'none — first task or independent'}

## Acceptance criteria this PBI must satisfy overall

${acLines}

## Edge cases to keep in mind while implementing this task

${plan.edgeCases.map((e) => `- ${e}`).join('\n')}

## Hard constraints

- Implement only task ${task.id}. Do not start other tasks.
- Make the smallest correct change that satisfies this task's intent.
- Do not create commits, push, open PRs, or run deploy commands.
- Do not modify files unrelated to this task.
- If you discover the task needs a different file layout than listed above, prefer adjusting
  within the same directory/module rather than restructuring the codebase.

## Required output format

End your final message with:

## Task Result
(one paragraph: what you changed, and confirmation it's ready for the next task or for tests)
`;
}
