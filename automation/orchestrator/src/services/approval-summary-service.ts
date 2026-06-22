import { config } from '../config.js';
import type { ApprovalReviewSummary, RunResult } from '../types/contracts.js';
import { canApprove, canReject } from './run-status.js';

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
    items.push(
      validation.buildPassed
        ? 'Backend build passed'
        : `Backend build failed${validation.failureReason ? `: ${validation.failureReason}` : ''}`,
    );
    items.push(
      validation.testsPassed
        ? `Tests passed (${validation.testSummary})`
        : `Tests need attention (${validation.testSummary})`,
    );
  }
  items.push('Confirm root cause and fix match the reported bug');
  items.push('Approve only if acceptable for a PR (PR creation is a separate step)');
  return items;
}

export function buildApprovalReviewSummary(run: RunResult): ApprovalReviewSummary {
  const validation = run.validation;
  const analysis = run.analysis;
  const changedFiles = analysis?.changedFiles ?? [];
  const pending = canApprove(run);

  const recommendedAction = pending
    ? validation?.passed
      ? 'review_and_approve'
      : 'review_with_caution'
    : run.approval.status === 'approved'
      ? 'already_approved'
      : run.approval.status === 'rejected'
        ? 'already_rejected'
        : 'none';

  const subject = `[Review] Bug fix ready: ${run.intake.bug.title} (${run.runId})`;

  const bodyPlain = [
    `Bug-fix run ${run.runId} is ready for manual review.`,
    '',
    `Title: ${run.intake.bug.title}`,
    `Reporter: ${run.intake.reporter.email}`,
    `Branch: ${run.git?.branchName ?? 'n/a'}`,
    `Status: ${run.status}`,
    '',
    'Summary:',
    analysis?.bugSummary ?? '(not available)',
    '',
    'Root cause:',
    analysis?.rootCauseSummary ?? '(not available)',
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
    `<h2>Bug-fix review: ${escapeHtml(run.intake.bug.title)}</h2>`,
    `<p><strong>Run ID:</strong> ${escapeHtml(run.runId)}</p>`,
    `<p><strong>Branch:</strong> <code>${escapeHtml(run.git?.branchName ?? 'n/a')}</code></p>`,
    `<p><strong>Reporter:</strong> ${escapeHtml(run.intake.reporter.email)}</p>`,
    `<h3>Summary</h3><p>${escapeHtml(analysis?.bugSummary ?? '(not available)')}</p>`,
    `<h3>Root cause</h3><p>${escapeHtml(analysis?.rootCauseSummary ?? '(not available)')}</p>`,
    `<h3>Changed files (${changedFiles.length})</h3>`,
    changedFiles.length > 0
      ? `<ul>${changedFiles.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('')}</ul>`
      : '<p>(none)</p>',
    `<h3>Validation</h3>`,
    `<ul>`,
    `<li>passed: ${validation?.passed ?? 'n/a'}</li>`,
    `<li>buildPassed: ${validation?.buildPassed ?? 'n/a'}</li>`,
    `<li>testsPassed: ${validation?.testsPassed ?? 'n/a'}</li>`,
    `<li>testSummary: ${escapeHtml(validation?.testSummary ?? 'n/a')}</li>`,
    validation?.failureReason
      ? `<li>failureReason: ${escapeHtml(validation.failureReason)}</li>`
      : '',
    `</ul>`,
    pending
      ? `<p><em>Awaiting your approve or reject decision. PR is not created automatically.</em></p>`
      : `<p><em>Decision: ${run.approval.status}</em></p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const base = config.publicBaseUrl.replace(/\/$/, '');

  return {
    runId: run.runId,
    status: run.status,
    decision: run.approval.status,
    recommendedAction,
    bug: {
      title: run.intake.bug.title,
      description: run.intake.bug.description,
      severity: run.intake.bug.severity ?? 'medium',
      component: run.intake.bug.component ?? 'unknown',
      reporterEmail: run.intake.reporter.email,
      reporterName: run.intake.reporter.name,
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
    email: {
      subject,
      bodyPlain,
      bodyHtml,
    },
    api: {
      approve: {
        method: 'POST',
        path: `/runs/${run.runId}/approve`,
        bodyExample: {
          approvedBy: 'reviewer@example.com',
          comment: 'Looks good',
          createPr: false,
        },
        note: 'Set createPr true only after explicit review. Phase 7 implements push/PR.',
      },
      reject: {
        method: 'POST',
        path: `/runs/${run.runId}/reject`,
        bodyExample: {
          rejectedBy: 'reviewer@example.com',
          reason: 'Fix scope too broad',
        },
      },
      createPr: {
        method: 'POST',
        path: `/runs/${run.runId}/create-pr`,
        note: 'Requires status approved and GITHUB_TOKEN. Does not auto-merge.',
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
