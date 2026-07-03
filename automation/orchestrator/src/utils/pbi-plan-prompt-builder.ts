import type { PbiIntakePayload } from '../types/contracts.js';
import type { RepoInspection } from '../services/repo-inspection-service.js';

/**
 * Planning-only prompt (Gate 1). The agent must NOT edit any file in this phase —
 * it may only read the repo to ground its plan. Hard constraints below enforce this.
 */
export function buildPbiPlanPrompt(intake: PbiIntakePayload, inspection: RepoInspection): string {
  const { pbi } = intake;

  const projectHints: string[] = [];
  if (inspection.projects.frontend) {
    projectHints.push(`- **Frontend** (React + TypeScript + Vite): \`${inspection.projects.frontend}\``);
    projectHints.push(`  - State management: Redux Toolkit (\`src/app/store.ts\`, \`src/features/\`)`);
    projectHints.push(`  - API calls via RTK Query (\`src/features/<domain>/services/<domain>Api.ts\`)`);
    projectHints.push(`  - Component pattern: \`src/features/<domain>/components/<Component>.tsx\``);
  }
  if (inspection.projects.backend) {
    projectHints.push(`- **Backend** (ASP.NET Core 8 Web API, C#): \`${inspection.projects.backend}\``);
    projectHints.push(`  - Services: \`<Name>Service.cs\`, Controllers: \`<Name>Controller.cs\``);
    projectHints.push(`  - DTOs in \`DTOs/\`, models in \`Models/\`, EF Core via \`Data/AppDbContext.cs\``);
  }

  return `# PBI planning task — automated orchestrator (Gate 1 — plan only, do not code)

You are a senior engineer planning the implementation of a Product Backlog Item (PBI) in a
local git checkout. This phase is **read-only**: you may explore the repository (list files,
read files, run read-only commands like \`git log\`, \`git diff\`) but you must **not** create,
modify, or delete any file. A human will review your plan before any code is written.

---

## Repository layout

- Root: \`${inspection.repoRoot}\`
- Base branch: \`${inspection.defaultBranch}\`
- Stay on the current branch; do not switch or create branches.

${projectHints.join('\n') || '_(project layout not detected)_'}

---

## PBI (ADO Work Item #${intake.ado.workItemId})

**Title:** ${pbi.title}

**Description:**
${pbi.description}

**Acceptance criteria (as authored in ADO):**
${pbi.acceptanceCriteria?.trim() || '_(none provided — you must draft them from the description)_'}

**Story points:** ${pbi.storyPoints ?? 'not estimated'}
**Priority:** ${intake.pbi.priority ?? 'not set'}

---

## What you must produce

1. Explore the repository enough to understand where this feature belongs (relevant
   components, services, DTOs, routes, tests).
2. If acceptance criteria were not provided, draft clear Given/When/Then ACs from the
   description.
3. Break the work into small, ordered, independently reviewable tasks. Each task should
   touch as few files as reasonably possible and declare its dependencies on other tasks.
4. Enumerate edge cases relevant to this feature (empty/null inputs, unauthorized access,
   concurrent updates, large inputs, network failure, invalid state transitions, etc. — pick
   the ones that actually apply to this PBI, not a generic boilerplate list).
5. For every (acceptance criterion, edge case) pair that matters, confirm your task list
   actually covers it — this is your scenario validation pass. If a case is not covered,
   either add a task for it or explicitly note it as \`outOfScope\`.
6. Flag risks (schema/DB migrations, breaking API contract changes, cross-cutting changes,
   ambiguous requirements) so a human reviewer can weigh in before coding starts.
7. If anything is genuinely ambiguous or missing that you cannot reasonably infer from the
   codebase, add it to \`openQuestions\` instead of guessing.

---

## Hard constraints

- **Do not create, edit, or delete any file.** Do not run build, test, install, or git
  write commands (no \`git add\`, \`git commit\`, \`git checkout -b\`, \`npm install\`, etc.).
- Only use read-only tools: reading files, listing directories, \`git log\`/\`git diff\`/\`git show\`,
  grep/search.
- Keep the plan realistic and scoped to this PBI — do not propose unrelated refactors.
- Prefer smaller, more numerous tasks over large ones; each task's \`estimateLoc\` should be
  a genuine estimate (lines added + changed), not a placeholder.

---

## Required output format

End your **final message** with exactly one fenced block starting with \`<PLAN>\` and ending
with \`</PLAN>\`, containing a single JSON object and nothing else inside the fence. Do not
add commentary inside the fence. The JSON must match this shape exactly:

\`\`\`
<PLAN>
{
  "summary": "one paragraph describing the approach",
  "acceptanceCriteria": [
    { "id": "AC1", "given": "...", "when": "...", "then": "..." }
  ],
  "affectedAreas": [ { "layer": "frontend|backend|db|infra", "path": "relative/path" } ],
  "tasks": [
    {
      "id": "T1",
      "title": "short task title",
      "layer": "frontend|backend|db|infra|other",
      "files": ["relative/path/one.ts"],
      "changeType": "add|modify|delete",
      "estimateLoc": 40,
      "dependsOn": []
    }
  ],
  "edgeCases": ["edge case 1", "edge case 2"],
  "scenarioCoverage": [
    { "acId": "AC1", "edgeCase": "edge case 1", "covered": true, "note": "handled by T1" }
  ],
  "risks": [ { "level": "high|med|low", "text": "..." } ],
  "openQuestions": ["..."],
  "outOfScope": ["..."],
  "requiresMigration": false,
  "requiresApiContractChange": false,
  "estimatedTotalLoc": 120,
  "releaseImpact": "patch|minor|major"
}
</PLAN>
\`\`\`

You may write normal prose before the fence to explain your reasoning, but the fence itself
must contain only valid JSON.
`;
}
