import { Router } from 'express';
import { ZodError } from 'zod';
import { runLifecycle } from '../services/run-lifecycle.js';
import { artifactService } from '../services/artifact-service.js';
import { runStore } from '../services/run-store.js';
import type { BugIntakePayload } from '../types/contracts.js';
import {
  approveRunSchema,
  bugIntakeSchema,
  cancelRunSchema,
  createPrSchema,
  rejectRunSchema,
} from '../types/schemas.js';

function handleError(res: import('express').Response, error: unknown): void {
  const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
  const existingRunId = (error as { existingRunId?: string }).existingRunId;

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Error) {
    if (error.message === 'DUPLICATE_MESSAGE_ID') {
      res.status(409).json({
        error: { code: 'DUPLICATE_MESSAGE_ID', message: 'A run already exists for this messageId', existingRunId },
      });
      return;
    }
    if (error.message === 'REPO_LOCK_HELD') {
      res.status(503).json({
        error: {
          code: 'REPO_LOCK_HELD',
          message: 'Another run is active. Wait for completion or cancel it.',
          activeRunId: runStore.getActiveRunId(),
        },
      });
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
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
  });
}

export const runsRouter = Router();

runsRouter.post('/start', async (req, res) => {
  try {
    const intake = bugIntakeSchema.parse(req.body) as BugIntakePayload;
    const run = await runLifecycle.startRun(intake);
    res.status(201).json({
      runId: run.runId,
      status: run.status,
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

runsRouter.post('/:id/approve', (req, res) => {
  try {
    const body = approveRunSchema.parse(req.body);
    const run = runLifecycle.approve(req.params.id, body.approvedBy, body.comment, body.createPr);
    res.json({
      runId: run.runId,
      status: run.status,
      approval: run.approval,
      message: body.createPr
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
    res.json({
      runId: run.runId,
      status: run.status,
      approval: run.approval,
      message: 'Run rejected. No PR will be created.',
    });
  } catch (error) {
    handleError(res, error);
  }
});

runsRouter.post('/:id/create-pr', async (req, res) => {
  try {
    const body = createPrSchema.parse(req.body ?? {});
    const run = await runLifecycle.createPr(req.params.id, body);
    if (run.status === 'failed') {
      res.status(502).json({
        runId: run.runId,
        status: run.status,
        git: run.git,
        error: run.error,
      });
      return;
    }
    res.status(201).json({
      runId: run.runId,
      status: run.status,
      git: run.git,
      message: run.git?.prUrl ? `PR created: ${run.git.prUrl}` : 'PR step completed',
    });
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
