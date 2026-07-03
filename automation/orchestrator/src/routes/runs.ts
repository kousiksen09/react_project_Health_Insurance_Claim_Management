import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { runLifecycle } from '../services/run-lifecycle.js';
import { artifactService } from '../services/artifact-service.js';
import { runStore } from '../services/run-store.js';
import type { WorkItemIntakePayload } from '../types/contracts.js';
import {
  approvePlanSchema,
  approveRunSchema,
  cancelRunSchema,
  createPrSchema,
  deployStatusSchema,
  rejectPlanSchema,
  rejectRunSchema,
  uatApproveSchema,
  uatRejectSchema,
  workItemIntakeSchema,
} from '../types/schemas.js';

function handleError(res: import('express').Response, error: unknown): void {
  const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
  const existingRunId = (error as { existingRunId?: string }).existingRunId;

  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request payload', details: error.flatten() } });
    return;
  }

  if (error instanceof Error) {
    if (error.message === 'DUPLICATE_MESSAGE_ID') {
      res.status(409).json({ error: { code: 'DUPLICATE_MESSAGE_ID', message: 'A run already exists for this messageId', existingRunId } });
      return;
    }
    if (error.message === 'REPO_LOCK_HELD') {
      res.status(503).json({ error: { code: 'REPO_LOCK_HELD', message: 'Another run is active. Wait for completion or cancel it.', activeRunId: runStore.getActiveRunId() } });
      return;
    }
    if (error.message === 'RUN_NOT_FOUND') {
      res.status(404).json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } });
      return;
    }
    if (statusCode === 501) {
      res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: error.message } });
      return;
    }
    if (statusCode >= 400 && statusCode < 500) {
      res.status(statusCode).json({ error: { code: 'BAD_REQUEST', message: error.message } });
      return;
    }
  }

  console.error('[runs]', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } });
}

export const runsRouter = Router();

runsRouter.post('/start', async (req, res) => {
  try {
    // Older bug payloads (and email/chat demo scripts) omit `type` entirely — default to 'bug'
    // so the discriminated union validates without touching every existing caller.
    const body = req.body && typeof req.body === 'object' && !('type' in req.body) ? { ...req.body, type: 'bug' } : req.body;
    const intake = workItemIntakeSchema.parse(body) as WorkItemIntakePayload;
    const run = await runLifecycle.startRun(intake);
    res.status(201).json({
      runId: run.runId,
      status: run.status,
      type: run.type,
      branchName: run.git?.branchName,
      createdAt: run.createdAt,
      links: {
        self: `/runs/${run.runId}`,
        artifacts: `/runs/${run.runId}/artifacts`,
        approvalSummary: `/runs/${run.runId}/approval-summary`,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.get('/:id', (req, res) => {
  const run = runStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } });
    return;
  }
  res.json(run);
});

runsRouter.get('/:id/approval-summary', (req, res) => {
  try {
    const summary = runLifecycle.getApprovalSummary(req.params.id);
    res.json(summary);
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.get('/:id/plan', async (req, res) => {
  const run = runStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } });
    return;
  }
  try {
    const planMarkdown = await fs.readFile(path.join(config.artifactsRoot, req.params.id, 'plan.md'), 'utf8');
    res.json({ runId: run.runId, status: run.status, planApproval: run.planApproval, plan: run.plan, planMarkdown });
  } catch {
    res.status(404).json({ error: { code: 'PLAN_NOT_FOUND', message: 'No plan artifact for this run yet' } });
  }
});

runsRouter.get('/:id/artifacts', (req, res) => {
  const run = runStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } });
    return;
  }
  res.json({
    runId: run.runId,
    artifactsPath: run.artifactsPath,
    files: artifactService.listArtifactFiles(),
    note: 'Artifacts are written under automation/artifacts/<runId>/ as the pipeline progresses.',
  });
});

// --- Gate 1: plan approval (PBI pipeline only) ---

runsRouter.post('/:id/approve-plan', (req, res) => {
  try {
    const body = approvePlanSchema.parse(req.body);
    const run = runLifecycle.approvePlan(req.params.id, body.approvedBy, body.comment);
    res.json({ runId: run.runId, status: run.status, planApproval: run.planApproval, message: 'Plan approved. Coding started.' });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/reject-plan', (req, res) => {
  try {
    const body = rejectPlanSchema.parse(req.body);
    const run = runLifecycle.rejectPlan(req.params.id, body.rejectedBy, body.reason);
    res.json({ runId: run.runId, status: run.status, planApproval: run.planApproval, message: 'Plan rejected. No code will be written for this run.' });
  } catch (error) {
    handleError(res, error);
  }
});

// --- Gate 2: patch approval (both pipelines) ---

runsRouter.post('/:id/approve', (req, res) => {
  try {
    const body = approveRunSchema.parse(req.body);
    const run = runLifecycle.approve(req.params.id, body.approvedBy, body.comment, body.createPr);
    res.json({
      runId: run.runId,
      status: run.status,
      approval: run.approval,
      message: run.type === 'pbi'
        ? 'Approved. Doc update + PR creation started automatically.'
        : body.createPr
          ? 'Approved. PR creation started (push + GitHub PR).'
          : 'Approved. No PR created — call POST /runs/:id/create-pr when ready.',
    });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/reject', (req, res) => {
  try {
    const body = rejectRunSchema.parse(req.body);
    const run = runLifecycle.reject(req.params.id, body.rejectedBy, body.reason);
    res.json({ runId: run.runId, status: run.status, approval: run.approval, message: 'Run rejected. No PR will be created.' });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/create-pr', async (req, res) => {
  try {
    const body = createPrSchema.parse(req.body ?? {});
    const run = await runLifecycle.createPr(req.params.id, body);
    if (run.status === 'failed') {
      res.status(502).json({ runId: run.runId, status: run.status, git: run.git, error: run.error });
      return;
    }
    res.status(201).json({ runId: run.runId, status: run.status, git: run.git, message: run.git?.prUrl ? `PR created: ${run.git.prUrl}` : 'PR step completed' });
  } catch (error) {
    handleError(res, error);
  }
});

// --- Post-PR lifecycle: deploy status (from n8n/CI) + UAT gate ---

runsRouter.post('/:id/deploy-status', async (req, res) => {
  try {
    const body = deployStatusSchema.parse(req.body);
    const run = await runLifecycle.reportDeployStatus(req.params.id, body);
    res.json({ runId: run.runId, status: run.status, deploy: run.deploy });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/uat-approve', async (req, res) => {
  try {
    const body = uatApproveSchema.parse(req.body);
    const run = await runLifecycle.uatApprove(req.params.id, body.approvedBy, body.comment);
    res.json({ runId: run.runId, status: run.status, uat: run.uat, release: run.release });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/uat-reject', (req, res) => {
  try {
    const body = uatRejectSchema.parse(req.body);
    const run = runLifecycle.uatReject(req.params.id, body.rejectedBy, body.reason);
    res.json({ runId: run.runId, status: run.status, uat: run.uat });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/cancel', (req, res) => {
  try {
    const body = cancelRunSchema.parse(req.body);
    const run = runLifecycle.cancel(req.params.id, body.cancelledBy, body.reason);
    res.json({ runId: run.runId, status: run.status });
  } catch (error) {
    handleError(res, error);
  }
});
