import type { RunResult, RunStatus } from '../types/contracts.js';

/** Statuses where the pipeline has finished and a reviewer may act. */
export const REVIEWABLE_STATUS: RunStatus = 'awaiting_approval';

/** Terminal statuses — no further pipeline work. */
export const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set([
  'approved',
  'rejected',
  'pr_created',
  'failed',
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

export function canCreatePr(run: RunResult): boolean {
  return run.status === 'approved' && run.approval.status === 'approved' && !run.git?.prUrl;
}

/** In-flight pipeline statuses where operational cancel is allowed. */
export function canCancel(run: RunResult): boolean {
  return ['queued', 'analyzing', 'patch_created', 'validating'].includes(run.status);
}

export const STATUS_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  queued: ['analyzing', 'failed'],
  analyzing: ['patch_created', 'failed'],
  patch_created: ['validating', 'failed'],
  validating: ['awaiting_approval', 'failed'],
  awaiting_approval: ['approved', 'rejected', 'failed'],
  approved: ['pr_created', 'failed'],
  rejected: [],
  pr_created: [],
  failed: [],
};

export function assertTransition(from: RunStatus, to: RunStatus): void {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}
