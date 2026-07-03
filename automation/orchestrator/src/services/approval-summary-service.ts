import { config } from '../config.js';
import type { ApprovalReviewSummary, RunResult } from '../types/contracts.js';
import { canApprove, canReject } from './run-status.js';
import { coreOf } from '../utils/intake-helpers.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildChecklist(run: RunResult): string[] {
  const items: string[] = [];
  const validation = run.validation;
  const changed = run.analysis?.changedFiles ?? [];

  items.push(`Review ${changed.length} changed file(s) on branch ${run.git?.branchName ?? 'n/a'}`);
  if (validation) {
    items.push(validation.buildPassed ? 'Backend build passed' : `Backend build failed${validation.failureReason ? `: ${validation.failureReason}` : ''}`);
    items.push(validation.testsPassed ? `Tests passed (${validation.testSummary})` : `Tests need attention (${validation.testSummary})`);
  }
  if (run.coverage?.ran) {
    items.push(run.coverage.weak ? `Coverage below ${run.coverage.minThresholdPct}% on at least one changed file — see coverage-delta.json` : 'Coverage meets the configured threshold on changed files');
  }
  if (run.aiReview?.ran) {
    items.push(run.aiReview.highSeverityCount > 0 ? `AI review flagged ${run.aiReview.highSeverityCount} high-severity issue(s) — see ai-review.md` : `AI review: ${run.aiReview.issuesFound} issue(s) found, none high severity`);
  }
  items.push(run.type === 'pbi' ? 'Confirm the diff matches the approved plan (see plan.md)' : 'Confirm root cause and fix match the reported bug');
  items.push('Approve only if acceptable for a PR (PR creation is a separate step for bug fixes; automatic for PBIs)');
  return items;
}

export function buildApprovalReviewSummary(run: RunResult): ApprovalReviewSummary {
  const validation = run.validation;
  const analysis = run.analysis;
  const changedFiles = analysis?.changedFiles ?? [];
  const pending = canApprove(run);
  const core = coreOf(run.intake);

  const recommendedAction = pending
    ? validation?.passed
      ? 'review_and_approve'
      : 'review_with_caution'
    : run.approval.status === 'approved'
      ? 'already_approved'
      : run.approval.status === 'rejected'
        ? 'already_rejected'
        : 'none';

  const subject = `[Review] ${run.type === 'pbi' ? 'Feature' : 'Bug fix'} ready: ${core.title} (${run.runId})`;

  const bodyPlain = [
    `${run.type === 'pbi' ? 'PBI' : 'Bug-fix'} run ${run.runId} is ready for manual review.`,
    '',
    `Title: ${core.title}`,
    `Reporter: ${core.reporterEmail}`,
    `Branch: ${run.git?.branchName ?? 'n/a'}`,
    `Status: ${run.status}`,
    core.ado ? `ADO work item: ${core.ado.workItemUrl}` : '',
    '',
    'Summary:',
    analysis?.bugSummary ?? '(not available)',
    '',
    'Root cause / approach:',
    analysis?.rootCauseSummary ?? '(not available)',
    '',
    run.plan ? `Plan: ${run.plan.taskCount} task(s), ${run.plan.estimatedTotalLoc} est. LOC, release impact ${run.plan.releaseImpact} (see plan.md)` : '',
    '',
    `Changed files (${changedFiles.length}):`,
    ...(changedFiles.length > 0 ? changedFiles.map((f) => `  - ${f}`) : ['  (none)']),
    '',
    'Validation:',
    `- passed: ${validation?.passed ?? 'n/a'}`,
    `- buildPassed: ${validation?.buildPassed ?? 'n/a'}`,
    `- testsPassed: ${validation?.testsPassed ?? 'n/a'}`,
    `- testSummary: ${validation?.testSummary ?? 'n/a'}`,
    validation?.failureReason ? `- failureReason: ${validation.failureReason}` : '',
    run.coverage?.ran ? `- coverage: ${run.coverage.weak ? 'WEAK — below ' + run.coverage.minThresholdPct + '%' : 'ok'} (see coverage-delta.json)` : '',
    run.aiReview?.ran ? `- AI review: ${run.aiReview.issuesFound} issue(s), ${run.aiReview.highSeverityCount} high severity — ${run.aiReview.summary}` : '',
    '',
    'Reviewer checklist:',
    ...buildChecklist(run).map((item, i) => `${i + 1}. ${item}`),
    '',
    'API actions (orchestrator):',
    `  POST /runs/${run.runId}/approve  { "approvedBy": "reviewer@example.com", "createPr": false }`,
    `  POST /runs/${run.runId}/reject   { "rejectedBy": "reviewer@example.com", "reason": "..." }`,
    '',
    run.approval.status !== 'pending'
      ? [
          `Decision: ${run.approval.status}`,
          run.approval.approvedBy ? `  Approved by: ${run.approval.approvedBy}` : '',
          run.approval.rejectedBy ? `  Rejected by: ${run.approval.rejectedBy}` : '',
          run.approval.comment ? `  Comment: ${run.approval.comment}` : '',
          run.approval.rejectedReason ? `  Reason: ${run.approval.rejectedReason}` : '',
        ].filter(Boolean).join('\n')
      : '',
    `Artifacts: ${run.artifactsPath}`,
  ]
    .filter(Boolean)
    .join('\n');

  const bodyHtml = [
    `<h2>${run.type === 'pbi' ? 'Feature' : 'Bug-fix'} review: ${escapeHtml(core.title)}</h2>`,
    `<p><strong>Run ID:</strong> ${escapeHtml(run.runId)}</p>`,
    `<p><strong>Branch:</strong> <code>${escapeHtml(run.git?.branchName ?? 'n/a')}</code></p>`,
    `<p><strong>Reporter:</strong> ${escapeHtml(core.reporterEmail)}</p>`,
    core.ado ? `<p><strong>ADO:</strong> <a href="${escapeHtml(core.ado.workItemUrl)}">#${core.ado.workItemId}</a></p>` : '',
    `<h3>Summary</h3><p>${escapeHtml(analysis?.bugSummary ?? '(not available)')}</p>`,
    `<h3>Root cause / approach</h3><p>${escapeHtml(analysis?.rootCauseSummary ?? '(not available)')}</p>`,
    `<h3>Changed files (${changedFiles.length})</h3>`,
    changedFiles.length > 0 ? `<ul>${changedFiles.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('')}</ul>` : '<p>(none)</p>',
    `<h3>Validation</h3>`,
    `<ul>`,
    `<li>passed: ${validation?.passed ?? 'n/a'}</li>`,
    `<li>buildPassed: ${validation?.buildPassed ?? 'n/a'}</li>`,
    `<li>testsPassed: ${validation?.testsPassed ?? 'n/a'}</li>`,
    `<li>testSummary: ${escapeHtml(validation?.testSummary ?? 'n/a')}</li>`,
    validation?.failureReason ? `<li>failureReason: ${escapeHtml(validation.failureReason)}</li>` : '',
    `</ul>`,
    pending ? `<p><em>Awaiting your approve or reject decision. PR is not created automatically.</em></p>` : `<p><em>Decision: ${run.approval.status}</em></p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const base = config.publicBaseUrl.replace(/\/$/, '');

  return {
    runId: run.runId,
    status: run.status,
    decision: run.approval.status,
    recommendedAction,
    workItem: {
      type: run.type,
      title: core.title,
      description: core.description,
      severity: core.severity,
      component: core.component,
      reporterEmail: core.reporterEmail,
      reporterName: core.reporterName,
      adoUrl: core.ado?.workItemUrl,
    },
    patch: {
      branchName: run.git?.branchName ?? '',
      baseBranch: run.git?.baseBranch ?? config.defaultBaseBranch,
      changedFiles,
      bugSummary: analysis?.bugSummary ?? '',
      rootCauseSummary: analysis?.rootCauseSummary ?? '',
      commitCount: run.git?.commits?.length ?? 0,
    },
    validation: {
      passed: validation?.passed ?? false,
      buildPassed: validation?.buildPassed ?? false,
      testsPassed: validation?.testsPassed ?? false,
      testSummary: validation?.testSummary ?? '',
      failureReason: validation?.failureReason ?? null,
    },
    review: {
      pending,
      canApprove: canApprove(run),
      canReject: canReject(run),
      checklist: buildChecklist(run),
      decision: run.approval.status !== 'pending'
        ? {
            status: run.approval.status,
            by: run.approval.approvedBy ?? run.approval.rejectedBy ?? null,
            at: run.approval.approvedAt ?? run.approval.rejectedAt ?? null,
            comment: run.approval.comment ?? null,
            reason: run.approval.rejectedReason ?? null,
          }
        : null,
    },
    email: { subject, bodyPlain, bodyHtml },
    api: {
      approve: {
        method: 'POST',
        path: `/runs/${run.runId}/approve`,
        bodyExample: { approvedBy: 'reviewer@example.com', comment: 'Looks good', createPr: false },
        note: 'Set createPr true only after explicit review. PBI runs create the PR automatically after doc updates.',
      },
      reject: {
        method: 'POST',
        path: `/runs/${run.runId}/reject`,
        bodyExample: { rejectedBy: 'reviewer@example.com', reason: 'Fix scope too broad' },
      },
      createPr: {
        method: 'POST',
        path: `/runs/${run.runId}/create-pr`,
        note: `Requires status approved and a configured git provider (${config.gitProvider}). Does not auto-merge.`,
      },
    },
    links: {
      self: `${base}/runs/${run.runId}`,
      artifacts: `${base}/runs/${run.runId}/artifacts`,
      approvalSummary: `${base}/runs/${run.runId}/approval-summary`,
    },
    artifactsPath: run.artifactsPath,
  };
}

export const approvalSummaryService = {
  build(run: RunResult): ApprovalReviewSummary {
    return buildApprovalReviewSummary(run);
  },
};
