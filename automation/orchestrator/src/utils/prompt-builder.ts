import type { BugIntakePayload } from '../types/contracts.js';
import type { RepoInspection } from '../services/repo-inspection-service.js';

export function buildBugFixPrompt(intake: BugIntakePayload, inspection: RepoInspection): string {
  const { bug } = intake;

  const steps =
    bug.stepsToReproduce?.map((step, i) => `${i + 1}. ${step}`).join('\n') ?? '(not provided)';

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
  if (inspection.warnings.length > 0) {
    projectHints.push('');
    projectHints.push('**Repo warnings:**');
    inspection.warnings.forEach((w) => projectHints.push(`- ${w}`));
  }

  const affectedAreaSection = bug.affectedArea
    ? `\n**Primary file(s) to investigate:** \`${bug.affectedArea}\``
    : '';

  const componentGuide = bug.component === 'frontend'
    ? `\n**Frontend fix guidance:**
- Check the relevant component under \`src/features/<domain>/components/\`
- If data is stale, invalidate RTK Query cache tags (e.g. \`invalidatesTags\` in the mutation endpoint)
- If a UI element shows when it shouldn't, add a filter in the component using data from the store
- Prefer fixing the component over adding hacks; keep changes to ≤ 3 files`
    : bug.component === 'backend'
    ? `\n**Backend fix guidance:**
- Check the service layer first (\`<Name>Service.cs\`), then the controller
- Prefer adding a WHERE clause or .Where() LINQ filter over changing business logic broadly
- Do not change migration files; do not add new DB columns`
    : bug.component === 'fullstack'
    ? `\n**Full-stack fix guidance:**
- Start from the backend endpoint and trace to the frontend component
- Fix the data source (service/query) first, then the display logic
- Keep the API contract unchanged if possible (no breaking field renames)`
    : '';

  return `# Bug fix task — automated orchestrator

You are a coding agent fixing a reported bug in a local git checkout.
Work incrementally, make the smallest correct change, and stop when done.

---

## Repository layout

- Root: \`${inspection.repoRoot}\`
- Current branch: stay on the current feature branch (do **not** switch branches)
- Base branch: \`${inspection.defaultBranch}\`

${projectHints.join('\n') || '_(project layout not detected)_'}

---

## Bug report

| Field | Value |
|-------|-------|
| **Title** | ${bug.title} |
| **Component** | ${bug.component ?? 'unknown'} |
| **Severity** | ${bug.severity ?? 'medium'} |
| **Environment** | ${bug.environment ?? 'local-dev'} |
${affectedAreaSection}

**Description:**
${bug.description}

**Steps to reproduce:**
${steps}

**Expected behaviour:** ${bug.expectedBehavior ?? '(not provided)'}

**Actual behaviour:** ${bug.actualBehavior ?? '(not provided)'}

${componentGuide}

---

## Hard constraints

- Make the smallest correct fix — touch the minimum number of files
- Do **not** create commits, push, open PRs, or run deploy commands
- Do **not** change unrelated code, formatting, or imports
- Do **not** add test files unless directly needed to reproduce the bug
- If the fix requires understanding data flow, read the relevant files first
- If blocked (missing context, ambiguous requirement), explain what is missing — do not guess

---

## Required output format

End your **final message** with exactly these two markdown headings (nothing else after them):

## Summary
(one concise paragraph — what you changed and why it fixes the bug)

## Root Cause
(brief explanation — why the bug existed before your change)
`;
}
