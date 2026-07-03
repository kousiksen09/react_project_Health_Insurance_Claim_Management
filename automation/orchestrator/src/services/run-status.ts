import type { RunResult, RunStatus } from '../types/contracts.js';

/** Statuses where a human may act on the patch approval gate (Gate 2). */
export const REVIEWABLE_STATUS: RunStatus = 'awaiting_approval';

/** Statuses where a human may act on the plan approval gate (Gate 1, PBI pipeline only). */
export const PLAN_REVIEWABLE_STATUS: RunStatus = 'awaiting_plan_approval';

/** Terminal statuses — no further pipeline work. */
export const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set([
  'rejected',
  'pr_created',
  'plan_rejected',
  'deploy_failed',
  'uat_rejected',
  'released',
  'failed',
  // 'approved' remains non-terminal for the bug pipeline (create-pr still pending),
  // but is terminal in isolation once no further automatic step is queued.
]);

/** Statuses where the pipeline is actively running (not waiting for human input or terminal). */
export const IN_FLIGHT_STATUSES: ReadonlySet<RunStatus> = new Set([
  'queued',
  'analyzing',
  'patch_created',
  'validating',
  'planning',
  'plan_approved',
  'coding',
  'test_generation',
  'ai_review',
  'doc_update',
  'deploying',
]);

export function isTerminalStatus(status: RunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canApprove(run: RunResult): boolean {
  return run.status === REVIEWABLE_STATUS && run.approval.status === 'pending';
}

export function canReject(run: RunResult): boolean {
  return run.status === REVIEWABLE_STATUS && run.approval.status === 'pending';
}

export function canApprovePlan(run: RunResult): boolean {
  return run.status === PLAN_REVIEWABLE_STATUS && run.planApproval.status === 'pending';
}

export function canRejectPlan(run: RunResult): boolean {
  return run.status === PLAN_REVIEWABLE_STATUS && run.planApproval.status === 'pending';
}

export function canCreatePr(run: RunResult): boolean {
  return run.status === 'approved' && run.approval.status === 'approved' && !run.git?.prUrl;
}

export function canReportDeploy(run: RunResult): boolean {
  return run.status === 'pr_created' || run.status === 'deploying';
}

export function canUatDecide(run: RunResult): boolean {
  return run.status === 'awaiting_uat' && run.uat.status === 'pending';
}

/** In-flight pipeline statuses where operational cancel is allowed. */
export function canCancel(run: RunResult): boolean {
  return IN_FLIGHT_STATUSES.has(run.status);
}

export const STATUS_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  queued: ['analyzing', 'planning', 'failed'],

  // Bug-fix pipeline
  analyzing: ['patch_created', 'failed'],
  patch_created: ['validating', 'failed'],
  validating: ['ai_review', 'failed'],
  awaiting_approval: ['approved', 'rejected', 'failed'],
  approved: ['pr_created', 'doc_update', 'failed'],
  rejected: [],
  pr_created: ['deploying', 'failed'],

  // PBI pipeline (planning gate precedes coding)
  planning: ['awaiting_plan_approval', 'plan_rejected', 'failed'],
  awaiting_plan_approval: ['plan_approved', 'plan_rejected', 'failed'],
  plan_approved: ['coding', 'failed'],
  plan_rejected: [],
  coding: ['test_generation', 'failed'],
  test_generation: ['validating', 'failed'],
  ai_review: ['awaiting_approval', 'failed'],
  doc_update: ['pr_created', 'failed'],

  // Shared post-PR lifecycle
  deploying: ['deployed', 'deploy_failed', 'failed'],
  deployed: ['awaiting_uat', 'failed'],
  deploy_failed: [],
  awaiting_uat: ['released', 'uat_rejected', 'failed'],
  uat_rejected: [],
  released: [],
  failed: [],
};

export function assertTransition(from: RunStatus, to: RunStatus): void {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}
