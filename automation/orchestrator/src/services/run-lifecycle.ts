import { config } from '../config.js';
import { agentService } from './agent-service.js';
import { analysisService } from './analysis-service.js';
import { approvalSummaryService } from './approval-summary-service.js';
import { artifactService } from './artifact-service.js';
import { gitService } from './git-service.js';
import { prService } from './pr-service.js';
import { runStore } from './run-store.js';
import {
  canApprove,
  canCancel,
  canCreatePr,
  canReject,
  isTerminalStatus,
} from './run-status.js';
import { validationService } from './validation-service.js';
import { buildPullRequestContent } from '../utils/pr-body-builder.js';
import type { BugIntakePayload, CreatePrRequest, RunResult } from '../types/contracts.js';

/**
 * Orchestrates run state transitions (Phase 6 approval gate).
 *
 * Pipeline: queued → analyzing → patch_created → validating → awaiting_approval
 * Review:   awaiting_approval → approved | rejected
 * PR:       approved → pr_created (Phase 7, explicit createPr or /create-pr)
 */
export class RunLifecycleService {
  async startRun(intake: BugIntakePayload): Promise<RunResult> {
    if (config.repoLock && runStore.hasActiveRun()) {
      const err = new Error('REPO_LOCK_HELD');
      (err as Error & { statusCode: number }).statusCode = 503;
      throw err;
    }

    const existing = runStore.findByMessageId(intake.messageId);
    if (existing) {
      const err = new Error('DUPLICATE_MESSAGE_ID');
      (err as Error & { statusCode: number; existingRunId: string }).statusCode = 409;
      (err as Error & { existingRunId: string }).existingRunId = existing.runId;
      throw err;
    }

    const run = runStore.create(intake);
    await artifactService.writeIntake(run.runId, intake);
    await artifactService.appendLog(run.runId, { event: 'run_created', status: run.status });

    void this.executePipeline(run.runId);
    return run;
  }

  private async executePipeline(runId: string): Promise<void> {
    const run = runStore.get(runId);
    if (!run) return;

    const branchName = run.git!.branchName;
    const baseBranch = run.git!.baseBranch;

    try {
      const branchResult = await gitService.createFeatureBranch(branchName, baseBranch);
      await artifactService.appendLog(runId, { step: 'git.createFeatureBranch', ...branchResult });
      if (!branchResult.success) {
        throw new Error(branchResult.error ?? 'Failed to create feature branch');
      }

      runStore.update(runId, {
        git: {
          ...run.git!,
          branchName: branchResult.branchName,
          baseBranch: branchResult.baseBranch,
          implementationNote: branchResult.warnings.join(' ') || undefined,
        },
      });

      await this.transition(runId, 'analyzing');
      const analysisResult = await analysisService.analyze(run.intake);
      await artifactService.appendLog(runId, { step: 'analysis.analyze', ...analysisResult });
      await artifactService.writeJsonArtifact(runId, 'repo-inspection.json', {
        warnings: analysisResult.repoWarnings,
        commands: analysisResult.commands,
      });

      const agentResult = await agentService.runCursorAgent(runId, run.intake, baseBranch);
      await artifactService.appendLog(runId, { step: 'agent.runCursorAgent', ...agentResult });
      await artifactService.writeAnalysisArtifacts(runId, analysisResult, agentResult);

      if (!agentResult.success && agentResult.mode === 'cursor') {
        throw new Error(agentResult.error ?? 'Cursor agent run failed');
      }

      const { commits, commands: commitCommands } = await gitService.listCommitsSinceBase(baseBranch);
      await artifactService.appendLog(runId, { step: 'git.listCommits', commits });

      await this.transition(runId, 'patch_created');

      await this.transition(runId, 'validating');
      const validationResult = await validationService.runLocalValidation();
      await artifactService.appendLog(runId, { step: 'validation.runLocalValidation', ...validationResult });
      await artifactService.writeValidationArtifacts(runId, validationResult);

      const allCommands = [
        ...branchResult.commands,
        ...analysisResult.commands,
        ...agentResult.commandsExecuted,
        ...commitCommands,
        ...validationResult.commands,
      ];
      await artifactService.writeJsonArtifact(runId, 'commands.json', { commands: allCommands });

      const final = runStore.update(runId, {
        status: 'awaiting_approval',
        analysis: {
          bugSummary: agentResult.bugSummary || analysisResult.bugSummary,
          rootCauseSummary: agentResult.rootCauseSummary || analysisResult.rootCauseSummary,
          changedFiles: agentResult.changedFiles,
          agentRunId: agentResult.agentRunId,
          implementationNote: agentResult.implementationNote,
        },
        validation: {
          passed: validationResult.passed,
          buildPassed: validationResult.buildPassed,
          testsPassed: validationResult.testsPassed,
          strictMode: validationResult.strictMode,
          testSummary: validationResult.testSummary,
          failureReason: validationResult.failureReason,
          commands: validationResult.commands,
          build: validationResult.build,
          tests: validationResult.tests,
          testGapRecommendations: validationResult.testGapRecommendations,
          implementationNote: validationResult.implementationNote,
        },
        git: {
          ...run.git!,
          branchName: branchResult.branchName,
          baseBranch: branchResult.baseBranch,
          commits,
          implementationNote:
            agentResult.mode === 'dry_run'
              ? 'Branch created; agent dry-run (no patch).'
              : `Patch on ${branchResult.branchName}; not pushed until approved.`,
        },
        error: null,
      });

      await this.writeApprovalArtifacts(final);
      await artifactService.writeRunSnapshot(final);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pipeline error';
      const failed = runStore.update(runId, {
        status: 'failed',
        error: { code: 'PIPELINE_ERROR', message },
      });
      await artifactService.appendLog(runId, { event: 'pipeline_failed', message });
      await artifactService.writeRunSnapshot(failed);
      runStore.releaseLock(runId);
    }
  }

  private async transition(runId: string, status: RunResult['status']): Promise<void> {
    runStore.setStatus(runId, status);
    await artifactService.appendLog(runId, { event: 'status_change', status });
  }

  private async writeApprovalArtifacts(run: RunResult): Promise<void> {
    const summary = approvalSummaryService.build(run);
    await artifactService.writeJsonArtifact(run.runId, 'approval.json', summary);
    await artifactService.writeTextArtifact(
      run.runId,
      'approval-email.txt',
      `${summary.email.subject}\n\n${summary.email.bodyPlain}`,
    );
    await artifactService.appendLog(run.runId, {
      event: 'awaiting_approval',
      recommendedAction: summary.recommendedAction,
    });
  }

  getApprovalSummary(runId: string): ReturnType<typeof approvalSummaryService.build> {
    const run = runStore.get(runId);
    if (!run) {
      const err = new Error('RUN_NOT_FOUND');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    return approvalSummaryService.build(run);
  }

  approve(runId: string, approvedBy: string, comment?: string, createPr = false): RunResult {
    const run = runStore.get(runId);
    if (!run) {
      const err = new Error('RUN_NOT_FOUND');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    if (!canApprove(run)) {
      const err = new Error(`Run cannot be approved (status: ${run.status}, approval: ${run.approval.status})`);
      (err as Error & { statusCode: number }).statusCode = 400;
      throw err;
    }

    const updated = runStore.update(runId, {
      status: 'approved',
      approval: {
        ...run.approval,
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
        comment: comment ?? null,
      },
      error: null,
    });

    void artifactService.appendLog(runId, {
      event: 'approved',
      approvedBy,
      createPr,
      note: createPr ? 'PR creation requested' : 'Approved; call POST /runs/:id/create-pr to open PR',
    });
    void this.writeApprovalArtifacts(updated);
    void artifactService.writeRunSnapshot(updated);

    if (createPr) {
      void this.executeCreatePr(runId, approvedBy, {});
    } else {
      runStore.releaseLock(runId);
    }

    return updated;
  }

  reject(runId: string, rejectedBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) {
      const err = new Error('RUN_NOT_FOUND');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    if (!canReject(run)) {
      const err = new Error(`Run cannot be rejected (status: ${run.status}, approval: ${run.approval.status})`);
      (err as Error & { statusCode: number }).statusCode = 400;
      throw err;
    }

    const updated = runStore.update(runId, {
      status: 'rejected',
      approval: {
        ...run.approval,
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason ?? `Rejected by ${rejectedBy}`,
      },
      error: null,
    });

    runStore.releaseLock(runId);
    void artifactService.appendLog(runId, { event: 'rejected', rejectedBy, reason });
    void this.writeApprovalArtifacts(updated);
    void artifactService.writeRunSnapshot(updated);
    return updated;
  }

  private async executeCreatePr(runId: string, requestedBy: string, options: CreatePrRequest = {}): Promise<void> {
    const run = runStore.get(runId);
    if (!run || !canCreatePr(run)) return;

    if (!config.githubConfigured) {
      const failed = runStore.update(runId, {
        status: 'failed',
        error: { code: 'GITHUB_NOT_CONFIGURED', message: 'GITHUB_TOKEN is required for PR creation' },
      });
      await artifactService.writeRunSnapshot(failed);
      runStore.releaseLock(runId);
      return;
    }

    const branchName = run.git!.branchName;
    const baseBranch = run.git!.baseBranch;
    const commitMessage = `fix: ${run.intake.bug.title}`.slice(0, 200);

    try {
      const pushResult = await gitService.pushBranch(branchName, commitMessage);
      await artifactService.appendLog(runId, { step: 'git.pushBranch', ...pushResult });

      if (!pushResult.success) {
        throw new Error(pushResult.error ?? 'git push failed');
      }

      const { commits } = await gitService.listCommitsSinceBase(baseBranch);
      await artifactService.appendLog(runId, { step: 'git.listCommitsAfterPush', commits });

      const prContent = buildPullRequestContent(run, {
        title: options.title,
        bodyPrefix: options.body,
      });
      await artifactService.writeTextArtifact(runId, 'pr-body.md', prContent.body);

      const prResult = await prService.createPullRequest({
        title: prContent.title,
        body: prContent.body,
        head: branchName,
        base: baseBranch,
        draft: options.draft ?? false,
      });
      await artifactService.writeJsonArtifact(runId, 'pr-result.json', prResult);
      await artifactService.appendLog(runId, { step: 'pr.createPullRequest', requestedBy, ...prResult });

      if (!prResult.success) {
        throw new Error(prResult.error ?? 'PR creation failed');
      }

      const final = runStore.update(runId, {
        status: 'pr_created',
        git: {
          ...run.git!,
          branchName,
          baseBranch,
          commits,
          pushed: true,
          prUrl: prResult.prUrl,
          prNumber: prResult.prNumber ?? undefined,
          implementationNote: prResult.alreadyExisted
            ? 'Existing open PR linked for this branch.'
            : 'PR created; not auto-merged.',
        },
        error: null,
      });

      await artifactService.writeRunSnapshot(final);
      runStore.releaseLock(runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PR pipeline failed';
      const failed = runStore.update(runId, {
        status: 'failed',
        error: { code: 'PR_CREATION_FAILED', message: `${message} (requested by ${requestedBy})` },
        git: {
          ...run.git!,
          pushed: run.git?.pushed ?? false,
        },
      });
      await artifactService.appendLog(runId, { event: 'pr_failed', message, requestedBy });
      await artifactService.writeRunSnapshot(failed);
      runStore.releaseLock(runId);
    }
  }

  async createPr(runId: string, options: CreatePrRequest = {}): Promise<RunResult> {
    const run = runStore.get(runId);
    if (!run) {
      const err = new Error('RUN_NOT_FOUND');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    if (!canCreatePr(run)) {
      const err = new Error(`Run must be approved before PR creation (status: ${run.status})`);
      (err as Error & { statusCode: number }).statusCode = 400;
      throw err;
    }
    if (!config.githubConfigured) {
      const err = new Error('GITHUB_TOKEN is not configured');
      (err as Error & { statusCode: number }).statusCode = 503;
      throw err;
    }

    await this.executeCreatePr(runId, run.approval.approvedBy ?? 'orchestrator@local', options);
    const updated = runStore.get(runId);
    if (!updated) {
      throw new Error('RUN_NOT_FOUND');
    }
    return updated;
  }

  cancel(runId: string, cancelledBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) {
      const err = new Error('RUN_NOT_FOUND');
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    if (isTerminalStatus(run.status)) {
      const err = new Error(`Cannot cancel run in terminal status ${run.status}`);
      (err as Error & { statusCode: number }).statusCode = 409;
      throw err;
    }
    if (!canCancel(run)) {
      const err = new Error(
        run.status === 'awaiting_approval'
          ? 'Use POST /runs/:id/reject to decline a run awaiting approval'
          : `Cannot cancel run in status ${run.status}`,
      );
      (err as Error & { statusCode: number }).statusCode = 409;
      throw err;
    }

    const updated = runStore.update(runId, {
      status: 'failed',
      error: { code: 'CANCELLED', message: reason ?? `Cancelled by ${cancelledBy}` },
    });

    runStore.releaseLock(runId);
    void artifactService.appendLog(runId, { event: 'cancelled', cancelledBy, reason });
    void artifactService.writeRunSnapshot(updated);
    return updated;
  }
}

export const runLifecycle = new RunLifecycleService();
