import type { RunResult } from '../types/contracts.js';
import { config } from '../config.js';
import { coreOf } from './intake-helpers.js';

export interface PullRequestBody {
  title: string;
  body: string;
  riskNotes: string[];
}

function buildRiskNotes(run: RunResult): string[] {
  const notes: string[] = [];
  const validation = run.validation;
  const analysis = run.analysis;
  const changedCount = analysis?.changedFiles?.length ?? 0;

  notes.push('This PR was opened by the automation orchestrator after manual approval.');
  notes.push('**Do not auto-merge** — review the diff on GitHub before merging.');

  if (analysis?.implementationNote?.includes('dry-run')) {
    notes.push('Agent ran in dry-run mode; patch may be incomplete or absent.');
  }
  if (changedCount === 0) {
    notes.push('No changed files detected — verify the branch contains the expected changes.');
  } else if (changedCount > 5) {
    notes.push(`Wide touch surface (${changedCount} files) — extra scrutiny recommended.`);
  }
  if (validation && !validation.buildPassed) {
    notes.push('Local backend and/or frontend build did not fully pass validation.');
  }
  if (validation && !validation.testsPassed) {
    notes.push('Local automated tests did not fully pass or were not run.');
  }
  if (validation?.failureReason) {
    notes.push(`Validation note: ${validation.failureReason}`);
  }
  if (validation?.testGapRecommendations?.length) {
    notes.push('Test coverage is minimal; see validation test gap recommendations in run artifacts.');
  }
  if (validation && !validation.strictMode && validation.build?.frontend && !validation.build.frontend.success) {
    notes.push('Frontend production build failed but demo policy (STRICT_VALIDATION=false) allowed approval.');
  }
  if (run.coverage?.ran && run.coverage.weak) {
    notes.push(`Coverage below ${run.coverage.minThresholdPct}% threshold on at least one changed file — see coverage-delta.json.`);
  }
  if (run.aiReview?.ran && run.aiReview.highSeverityCount > 0) {
    notes.push(`AI review flagged ${run.aiReview.highSeverityCount} high-severity issue(s) — see ai-review.md.`);
  }

  notes.push('No auto-merge or deployment is triggered directly by PR creation — see the deploy/UAT gates.');
  return notes;
}

export function buildPullRequestContent(run: RunResult, overrides?: { title?: string; bodyPrefix?: string }): PullRequestBody {
  const { intake, analysis, validation, git, approval, plan, runId } = run;
  const core = coreOf(intake);
  const changedFiles = analysis?.changedFiles ?? [];
  const riskNotes = buildRiskNotes(run);

  const kind = run.type === 'pbi' ? 'feat' : 'fix';
  const title = overrides?.title?.trim() || `${kind}: ${core.title}`.slice(0, 256);

  const validationLines = validation
    ? [
        `| Check | Result |`,
        `|-------|--------|`,
        `| Overall passed | ${validation.passed} |`,
        `| Build passed | ${validation.buildPassed} |`,
        `| Tests passed | ${validation.testsPassed} |`,
        `| Test summary | ${validation.testSummary} |`,
        run.coverage?.ran ? `| Coverage | ${run.coverage.weak ? 'below threshold' : 'ok'} (min ${run.coverage.minThresholdPct}%) |` : '',
        validation.failureReason ? `| Failure reason | ${validation.failureReason} |` : '',
      ].filter(Boolean)
    : ['_(validation not available)_'];

  const planSection = plan
    ? [
        `## Plan`,
        plan.summary,
        '',
        `- Acceptance criteria: ${plan.acceptanceCriteriaCount}`,
        `- Tasks implemented: ${plan.taskCount}`,
        `- Estimated LOC: ${plan.estimatedTotalLoc}`,
        `- Release impact: ${plan.releaseImpact}`,
        plan.openQuestions.length > 0 ? `- Open questions at plan time: ${plan.openQuestions.join('; ')}` : '',
        `- Full plan: \`automation/artifacts/${runId}/plan.md\``,
        '',
      ].filter(Boolean)
    : [];

  const aiReviewSection = run.aiReview?.ran
    ? [`## AI review`, `${run.aiReview.issuesFound} issue(s) found, ${run.aiReview.highSeverityCount} high severity.`, run.aiReview.summary, '']
    : [];

  const adoClosingLine = core.ado ? `Closes AB#${core.ado.workItemId}` : '';

  const body = [
    overrides?.bodyPrefix ? `${overrides.bodyPrefix}\n` : '',
    adoClosingLine,
    adoClosingLine ? '' : '',
    `## Summary`,
    analysis?.bugSummary || core.description,
    '',
    `## ${run.type === 'pbi' ? 'Approach' : 'Root cause'}`,
    analysis?.rootCauseSummary || '_Not determined by agent._',
    '',
    ...planSection,
    `## Branch`,
    `- **Feature branch:** \`${git?.branchName ?? 'n/a'}\``,
    `- **Base branch:** \`${git?.baseBranch ?? config.defaultBaseBranch}\``,
    `- **Run ID:** \`${runId}\``,
    core.ado ? `- **ADO work item:** [${core.ado.workItemType} #${core.ado.workItemId}](${core.ado.workItemUrl})` : '',
    '',
    `## Files changed (${changedFiles.length})`,
    changedFiles.length > 0 ? changedFiles.map((f) => `- \`${f}\``).join('\n') : '- _(none detected)_',
    '',
    `## Local validation results`,
    ...validationLines,
    '',
    ...aiReviewSection,
    `## Risk notes`,
    ...riskNotes.map((n) => `- ${n}`),
    '',
    `## Approval`,
    `- **Approved by:** ${approval.approvedBy ?? 'n/a'}`,
    approval.approvedAt ? `- **Approved at:** ${approval.approvedAt}` : '',
    approval.comment ? `- **Reviewer comment:** ${approval.comment}` : '',
    '',
    `---`,
    `_Generated by the automation orchestrator. Artifacts: \`${run.artifactsPath}\`_`,
  ]
    .filter(Boolean)
    .join('\n');

  return { title, body, riskNotes };
}
