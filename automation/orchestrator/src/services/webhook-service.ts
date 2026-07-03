import { config } from '../config.js';
import type { RunResult, RunStatus } from '../types/contracts.js';

export type WebhookEventType =
  | 'run.created'
  | 'plan.awaiting_approval'
  | 'plan.approved'
  | 'plan.rejected'
  | 'patch.awaiting_approval'
  | 'patch.approved'
  | 'patch.rejected'
  | 'pr.created'
  | 'deploy.started'
  | 'deploy.succeeded'
  | 'deploy.failed'
  | 'uat.awaiting'
  | 'uat.approved'
  | 'uat.rejected'
  | 'run.released'
  | 'run.failed';

interface WebhookEventPayload {
  event: WebhookEventType;
  runId: string;
  type: RunResult['type'];
  status: RunStatus;
  at: string;
  adoWorkItemId?: number;
  branchName?: string;
  prUrl?: string;
}

/**
 * Fire-and-forget outbound event emitter so n8n (or any subscriber) can react to pipeline
 * state changes without polling GET /runs/:id. Configured with a single sink URL for now;
 * a per-tenant webhook registry is a follow-up once this is used by more than one app.
 */
export const webhookService = {
  async emit(event: WebhookEventType, run: RunResult): Promise<void> {
    if (!config.n8nEventWebhookUrl) return;

    const payload: WebhookEventPayload = {
      event,
      runId: run.runId,
      type: run.type,
      status: run.status,
      at: new Date().toISOString(),
      adoWorkItemId: run.type === 'pbi' && 'ado' in run.intake ? run.intake.ado.workItemId : undefined,
      branchName: run.git?.branchName,
      prUrl: run.git?.prUrl ?? undefined,
    };

    try {
      await fetch(config.n8nEventWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn(`[webhook-service] failed to emit ${event} for ${run.runId}:`, error);
    }
  },
};
