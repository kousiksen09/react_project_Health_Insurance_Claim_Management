import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { adoClient } from './ado-client.js';
import { agentService } from './agent-service.js';
import { aiReviewService } from './ai-review-service.js';
import { analysisService } from './analysis-service.js';
import { approvalSummaryService } from './approval-summary-service.js';
import { artifactService } from './artifact-service.js';
import { coverageService } from './coverage-service.js';
import { deployService } from './deploy-service.js';
import { docService } from './doc-service.js';
import { gitService } from './git-service.js';
import { pbiPlanService } from './pbi-plan-service.js';
import { prService } from './pr-service.js';
import { releaseService } from './release-service.js';
import { runStore } from './run-store.js';
import {
  canApprove,
  canApprovePlan,
  canCancel,
  canCreatePr,
  canReject,
  canRejectPlan,
  canReportDeploy,
  canUatDecide,
  isTerminalStatus,
} from './run-status.js';
import { testGenService } from './test-gen-service.js';
import { validationService } from './validation-service.js';
import { webhookService } from './webhook-service.js';
import { buildPullRequestContent } from '../utils/pr-body-builder.js';
import { adoRefOf, isPbiIntake, titleOf } from '../utils/intake-helpers.js';
import type {
  CreatePrRequest,
  DeployStatusRequest,
  RunResult,
  WorkItemIntakePayload,
} from '../types/contracts.js';

function errorWithStatus(message: string, statusCode: number, extra?: Record<string, unknown>): Error {
  const err = new Error(message) as Error & { statusCode: number } & Record<string, unknown>;
  err.statusCode = statusCode;
  if (extra) Object.assign(err, extra);
  return err;
}

/** Best-effort ADO comment/state helper — never throws, just logs on failure. */
async function notifyAdo(intake: WorkItemIntakePayload, fn: (workItemId: number) => Promise<{ ok: boolean; error?: string }>): Promise<void> {
  const ref = adoRefOf(intake);
  if (!ref || !config.adoConfigured) return;
  const result = await fn(ref.workItemId);
  if (!result.ok) {
    console.warn(`[run-lifecycle] ADO notify failed for work item ${ref.workItemId}: ${result.error}`);
  }
}

/**
 * Orchestrates run state transitions across two pipelines:
 *
 *  Bug-fix (unchanged):  queued -> analyzing -> patch_created -> validating -> ai_review
 *                         -> awaiting_approval -> approved -> pr_created
 *
 *  PBI (Gate 1 + full SDLC): queued -> planning -> awaiting_plan_approval -> plan_approved
 *                         -> coding -> test_generation -> validating -> ai_review
 *                         -> awaiting_approval -> approved -> doc_update -> pr_created
 *
 *  Shared post-PR lifecycle (both pipelines, once wired to CI/ADO):
 *    pr_created -> deploying -> deployed -> awaiting_uat -> released
 */
export class RunLifecycleService {
  async startRun(intake: WorkItemIntakePayload): Promise<RunResult> {
    if (config.repoLock && runStore.hasActiveRun()) {
      throw errorWithStatus('REPO_LOCK_HELD', 503);
    }

    const existing = runStore.findByMessageId(intake.messageId);
    if (existing) {
      throw errorWithStatus('DUPLICATE_MESSAGE_ID', 409, { existingRunId: existing.runId });
    }

    const run = runStore.create(intake);
    await artifactService.writeIntake(run.runId, intake);
    await artifactService.appendLog(run.runId, { event: 'run_created', status: run.status, type: run.type });
    void webhookService.emit('run.created', run);

    if (isPbiIntake(intake)) {
      void this.executePbiPipeline(run.runId);
    } else {
      void this.executeBugPipeline(run.runId);
    }
    return run;
  }

  private async transition(runId: string, status: RunResult['status']): Promise<RunResult> {
    const updated = runStore.setStatus(runId, status);
    await artifactService.appendLog(runId, { event: 'status_change', status });
    return updated;
  }

  private failRun(runId: string, code: string, message: string): RunResult {
    const failed = runStore.update(runId, { status: 'failed', error: { code, message } });
    void artifactService.appendLog(runId, { event: 'pipeline_failed', code, message });
    void artifactService.writeRunSnapshot(failed);
    void webhookService.emit('run.failed', failed);
    runStore.releaseLock(runId);
    return failed;
  }

  // ---------------------------------------------------------------------
  // Bug-fix pipeline (existing behavior, extended only with the AI review step)
  // ---------------------------------------------------------------------

  private async executeBugPipeline(runId: string): Promise<void> {
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
        git: { ...run.git!, branchName: branchResult.branchName, baseBranch: branchResult.baseBranch, implementationNote: branchResult.warnings.join(' ') || undefined },
      });

      await this.transition(runId, 'analyzing');
      if (run.intake.type === 'pbi') throw new Error('INTERNAL: bug pipeline received a pbi intake');
      const analysisResult = await analysisService.analyze(run.intake);
      await artifactService.appendLog(runId, { step: 'analysis.analyze', ...analysisResult });
      await artifactService.writeJsonArtifact(runId, 'repo-inspection.json', { warnings: analysisResult.repoWarnings, commands: analysisResult.commands });

      const agentResult = await agentService.runCursorAgent(runId, run.intake, baseBranch);
      await artifactService.appendLog(runId, { step: 'agent.runCursorAgent', ...agentResult });
      await artifactService.writeAnalysisArtifacts(runId, analysisResult, agentResult);

      if (!agentResult.success && agentResult.mode === 'cursor') {
        throw new Error(agentResult.error ?? 'Cursor agent run failed');
      }

      const { commits, commands: commitCommands } = await gitService.listCommitsSinceBase(baseBranch);
      await this.transition(runId, 'patch_created');
      await this.transition(runId, 'validating');
      const validationResult = await validationService.runLocalValidation();
      await artifactService.appendLog(runId, { step: 'validation.runLocalValidation', ...validationResult });
      await artifactService.writeValidationArtifacts(runId, validationResult);

      await this.transition(runId, 'ai_review');
      const aiReview = await aiReviewService.review(runId, baseBranch);
      await artifactService.appendLog(runId, { step: 'ai-review.review', ...aiReview });

      const allCommands = [...branchResult.commands, ...analysisResult.commands, ...agentResult.commandsExecuted, ...commitCommands, ...validationResult.commands];
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
        aiReview,
        git: {
          ...run.git!,
          branchName: branchResult.branchName,
          baseBranch: branchResult.baseBranch,
          commits,
          implementationNote: agentResult.mode === 'dry_run' ? 'Branch created; agent dry-run (no patch).' : `Patch on ${branchResult.branchName}; not pushed until approved.`,
        },
        error: null,
      });

      await this.writeApprovalArtifacts(final);
      await artifactService.writeRunSnapshot(final);
      void webhookService.emit('patch.awaiting_approval', final);
    } catch (error) {
      this.failRun(runId, 'PIPELINE_ERROR', error instanceof Error ? error.message : 'Unknown pipeline error');
    }
  }

  // ---------------------------------------------------------------------
  // PBI pipeline — Gate 1 (plan) precedes any code being written
  // ---------------------------------------------------------------------

  private async executePbiPipeline(runId: string): Promise<void> {
    const run = runStore.get(runId);
    if (!run || !isPbiIntake(run.intake)) return;
    const intake = run.intake;

    const branchName = run.git!.branchName;
    const baseBranch = run.git!.baseBranch;

    try {
      const branchResult = await gitService.createFeatureBranch(branchName, baseBranch);
      await artifactService.appendLog(runId, { step: 'git.createFeatureBranch', ...branchResult });
      if (!branchResult.success) {
        throw new Error(branchResult.error ?? 'Failed to create feature branch');
      }
      runStore.update(runId, {
        git: { ...run.git!, branchName: branchResult.branchName, baseBranch: branchResult.baseBranch, implementationNote: branchResult.warnings.join(' ') || undefined },
      });

      await this.transition(runId, 'planning');
      const planResult = await pbiPlanService.createPlan(runId, intake);
      await artifactService.appendLog(runId, { step: 'pbiPlan.createPlan', success: planResult.success, autoBlocked: planResult.autoBlocked, error: planResult.error });

      if (!planResult.success || !planResult.plan || !planResult.planSummary) {
        throw new Error(planResult.error ?? 'Planning stage failed to produce a valid plan');
      }

      if (planResult.autoBlocked) {
        const blocked = runStore.update(runId, {
          status: 'plan_rejected',
          plan: planResult.planSummary,
          planApproval: {
            ...run.planApproval,
            status: 'rejected',
            autoBlocked: true,
            autoBlockReason: planResult.autoBlockReason,
            rejectedReason: planResult.autoBlockReason,
          },
        });
        await artifactService.writeRunSnapshot(blocked);
        void webhookService.emit('plan.rejected', blocked);
        await notifyAdo(intake, (id) =>
          adoClient.addComment(id, `Plan auto-blocked by orchestrator: ${planResult.autoBlockReason}\nRun: ${runId}`),
        );
        runStore.releaseLock(runId);
        return;
      }

      const awaitingPlan = runStore.update(runId, {
        status: 'awaiting_plan_approval',
        plan: planResult.planSummary,
        planApproval: { ...run.planApproval, status: 'pending' },
      });
      await artifactService.writeRunSnapshot(awaitingPlan);
      void webhookService.emit('plan.awaiting_approval', awaitingPlan);
      await notifyAdo(intake, (id) =>
        adoClient.addComment(
          id,
          `Plan ready for review (run ${runId}).\n${planResult.planSummary!.taskCount} task(s), ${planResult.planSummary!.estimatedTotalLoc} est. LOC.\nApprove in chat: approve-plan ${runId}`,
        ),
      );
      // Lock stays held until a human approves/rejects the plan — mirrors Gate 2 behavior.
    } catch (error) {
      this.failRun(runId, 'PLANNING_PIPELINE_ERROR', error instanceof Error ? error.message : 'Unknown planning error');
    }
  }

  private async executePbiCodingOnward(runId: string): Promise<void> {
    const run = runStore.get(runId);
    if (!run || !isPbiIntake(run.intake) || !run.plan) return;
    const intake = run.intake;
    const baseBranch = run.git!.baseBranch;

    try {
      // plan.json artifact is the source of truth for tasks; PlanSummary on the run is a slice of it.
      const planPath = path.join(config.artifactsRoot, runId, 'plan.json');
      const plan = JSON.parse(await fs.readFile(planPath, 'utf8')) as import('../types/contracts.js').WorkItemPlan;

      await this.transition(runId, 'coding');
      const agentResult = await agentService.runCursorAgentForPlan(runId, intake, plan, baseBranch);
      await artifactService.appendLog(runId, { step: 'agent.runCursorAgentForPlan', success: agentResult.success, error: agentResult.error });
      if (!agentResult.success) {
        throw new Error(agentResult.error ?? 'Coding stage failed');
      }

      await this.transition(runId, 'test_generation');
      const testGenResult = await testGenService.generateTests(runId, intake, plan, baseBranch);
      await artifactService.appendLog(runId, { step: 'testGen.generateTests', ...testGenResult });

      const { commits, commands: commitCommands } = await gitService.listCommitsSinceBase(baseBranch);
      await this.transition(runId, 'validating');
      const validationResult = await validationService.runLocalValidation();
      await artifactService.writeValidationArtifacts(runId, validationResult);

      const { files: changedFiles } = await gitService.listChangedFiles(baseBranch);
      const coverage = await coverageService.measure(changedFiles, config.validation.timeoutMs);
      await artifactService.writeJsonArtifact(runId, 'coverage-delta.json', coverage);

      await this.transition(runId, 'ai_review');
      const aiReview = await aiReviewService.review(runId, baseBranch);

      const allCommands = [...agentResult.commandsExecuted, ...commitCommands, ...validationResult.commands];
      await artifactService.writeJsonArtifact(runId, 'commands.json', { commands: allCommands });

      const final = runStore.update(runId, {
        status: 'awaiting_approval',
        analysis: {
          bugSummary: agentResult.bugSummary,
          rootCauseSummary: agentResult.rootCauseSummary,
          changedFiles,
          agentRunId: agentResult.agentRunId,
          implementationNote: testGenResult.note,
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
        coverage,
        aiReview,
        git: { ...run.git!, commits, implementationNote: `Patch on ${run.git!.branchName}; not pushed until approved.` },
        error: null,
      });

      await this.writeApprovalArtifacts(final);
      await artifactService.writeRunSnapshot(final);
      void webhookService.emit('patch.awaiting_approval', final);
    } catch (error) {
      this.failRun(runId, 'CODING_PIPELINE_ERROR', error instanceof Error ? error.message : 'Unknown coding error');
    }
  }

  // ---------------------------------------------------------------------
  // Gate 1 — plan approval (PBI pipeline only)
  // ---------------------------------------------------------------------

  approvePlan(runId: string, approvedBy: string, comment?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canApprovePlan(run)) {
      throw errorWithStatus(`Plan cannot be approved (status: ${run.status}, planApproval: ${run.planApproval.status})`, 400);
    }

    const updated = runStore.update(runId, {
      status: 'plan_approved',
      planApproval: { ...run.planApproval, status: 'approved', approvedBy, approvedAt: new Date().toISOString() },
      error: null,
    });
    void artifactService.appendLog(runId, { event: 'plan_approved', approvedBy, comment });
    void artifactService.writeRunSnapshot(updated);
    void webhookService.emit('plan.approved', updated);
    void notifyAdo(run.intake, (id) => adoClient.updateState(id, config.ado.states.planApproved, `Plan approved by ${approvedBy}. Coding started.`));

    void this.executePbiCodingOnward(runId);
    return updated;
  }

  rejectPlan(runId: string, rejectedBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canRejectPlan(run)) {
      throw errorWithStatus(`Plan cannot be rejected (status: ${run.status}, planApproval: ${run.planApproval.status})`, 400);
    }

    const updated = runStore.update(runId, {
      status: 'plan_rejected',
      planApproval: { ...run.planApproval, status: 'rejected', rejectedBy, rejectedAt: new Date().toISOString(), rejectedReason: reason ?? `Rejected by ${rejectedBy}` },
      error: null,
    });
    runStore.releaseLock(runId);
    void artifactService.appendLog(runId, { event: 'plan_rejected', rejectedBy, reason });
    void artifactService.writeRunSnapshot(updated);
    void webhookService.emit('plan.rejected', updated);
    void notifyAdo(run.intake, (id) => adoClient.addComment(id, `Plan rejected by ${rejectedBy}: ${reason ?? '(no reason given)'}`));
    return updated;
  }

  // ---------------------------------------------------------------------
  // Gate 2 — patch approval (shared by both pipelines)
  // ---------------------------------------------------------------------

  getApprovalSummary(runId: string): ReturnType<typeof approvalSummaryService.build> {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    return approvalSummaryService.build(run);
  }

  approve(runId: string, approvedBy: string, comment?: string, createPr = false): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canApprove(run)) {
      throw errorWithStatus(`Run cannot be approved (status: ${run.status}, approval: ${run.approval.status})`, 400);
    }

    const updated = runStore.update(runId, {
      status: 'approved',
      approval: { ...run.approval, status: 'approved', approvedBy, approvedAt: new Date().toISOString(), comment: comment ?? null },
      error: null,
    });

    void artifactService.appendLog(runId, { event: 'approved', approvedBy, createPr });
    void this.writeApprovalArtifacts(updated);
    void artifactService.writeRunSnapshot(updated);
    void webhookService.emit('patch.approved', updated);
    void notifyAdo(run.intake, (id) => adoClient.addComment(id, `Patch approved by ${approvedBy}.`));

    if (run.type === 'pbi') {
      // PBI pipeline always proceeds to doc-update -> PR automatically after approval.
      void this.executeDocUpdateAndPr(runId, approvedBy);
    } else if (createPr) {
      void this.executeCreatePr(runId, approvedBy, {});
    } else {
      // Bug pipeline keeps the original two-step approve-then-create-pr flow.
      runStore.releaseLock(runId);
    }

    return updated;
  }

  reject(runId: string, rejectedBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canReject(run)) {
      throw errorWithStatus(`Run cannot be rejected (status: ${run.status}, approval: ${run.approval.status})`, 400);
    }

    const updated = runStore.update(runId, {
      status: 'rejected',
      approval: { ...run.approval, status: 'rejected', rejectedBy, rejectedAt: new Date().toISOString(), rejectedReason: reason ?? `Rejected by ${rejectedBy}` },
      error: null,
    });

    runStore.releaseLock(runId);
    void artifactService.appendLog(runId, { event: 'rejected', rejectedBy, reason });
    void this.writeApprovalArtifacts(updated);
    void artifactService.writeRunSnapshot(updated);
    void webhookService.emit('patch.rejected', updated);
    void notifyAdo(run.intake, (id) => adoClient.addComment(id, `Patch rejected by ${rejectedBy}: ${reason ?? '(no reason given)'}`));
    return updated;
  }

  private async executeDocUpdateAndPr(runId: string, approvedBy: string): Promise<void> {
    const run = runStore.get(runId);
    if (!run) return;
    try {
      await this.transition(runId, 'doc_update');
      const docResult = await docService.updateDocs(runId, run.intake, run.git!.baseBranch);
      await artifactService.appendLog(runId, { step: 'doc.updateDocs', ...docResult });
      await this.executeCreatePr(runId, approvedBy, {});
    } catch (error) {
      this.failRun(runId, 'DOC_UPDATE_ERROR', error instanceof Error ? error.message : 'Doc update stage failed');
    }
  }

  // ---------------------------------------------------------------------
  // PR creation (shared)
  // ---------------------------------------------------------------------

  private async executeCreatePr(runId: string, requestedBy: string, options: CreatePrRequest = {}): Promise<void> {
    const run = runStore.get(runId);
    if (!run || !canCreatePr(run)) return;

    if (!config.prProviderConfigured) {
      const failed = runStore.update(runId, { status: 'failed', error: { code: 'GIT_PROVIDER_NOT_CONFIGURED', message: config.prProviderMissingMessage } });
      await artifactService.writeRunSnapshot(failed);
      runStore.releaseLock(runId);
      return;
    }

    const branchName = run.git!.branchName;
    const baseBranch = run.git!.baseBranch;
    const commitMessage = `${run.type === 'pbi' ? 'feat' : 'fix'}: ${titleOf(run.intake)}`.slice(0, 200);

    try {
      const pushResult = await gitService.pushBranch(branchName, commitMessage);
      await artifactService.appendLog(runId, { step: 'git.pushBranch', ...pushResult });
      if (!pushResult.success) {
        throw new Error(pushResult.error ?? 'git push failed');
      }

      const { commits } = await gitService.listCommitsSinceBase(baseBranch);
      const prContent = buildPullRequestContent(run, { title: options.title, bodyPrefix: options.body });
      await artifactService.writeTextArtifact(runId, 'pr-body.md', prContent.body);

      const prResult = await prService.createPullRequest({ title: prContent.title, body: prContent.body, head: branchName, base: baseBranch, draft: options.draft ?? false });
      await artifactService.writeJsonArtifact(runId, 'pr-result.json', prResult);
      await artifactService.appendLog(runId, { step: 'pr.createPullRequest', requestedBy, ...prResult });

      if (!prResult.success) {
        throw new Error(prResult.error ?? 'PR creation failed');
      }

      const final = runStore.update(runId, {
        status: 'pr_created',
        git: { ...run.git!, branchName, baseBranch, commits, pushed: true, prUrl: prResult.prUrl, prNumber: prResult.prNumber ?? undefined, implementationNote: prResult.alreadyExisted ? 'Existing open PR linked for this branch.' : 'PR created; not auto-merged.' },
        error: null,
      });

      await artifactService.writeRunSnapshot(final);
      void webhookService.emit('pr.created', final);
      void notifyAdo(run.intake, (id) => adoClient.addComment(id, `PR created: ${prResult.prUrl}`));
      // Local git work is done; release the repo lock so the next run can proceed.
      runStore.releaseLock(runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PR pipeline failed';
      const failed = runStore.update(runId, {
        status: 'failed',
        error: { code: 'PR_CREATION_FAILED', message: `${message} (requested by ${requestedBy})` },
        git: { ...run.git!, pushed: run.git?.pushed ?? false },
      });
      await artifactService.appendLog(runId, { event: 'pr_failed', message, requestedBy });
      await artifactService.writeRunSnapshot(failed);
      void webhookService.emit('run.failed', failed);
      runStore.releaseLock(runId);
    }
  }

  async createPr(runId: string, options: CreatePrRequest = {}): Promise<RunResult> {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canCreatePr(run)) throw errorWithStatus(`Run must be approved before PR creation (status: ${run.status})`, 400);
    if (!config.prProviderConfigured) throw errorWithStatus(config.prProviderMissingMessage, 503);

    await this.executeCreatePr(runId, run.approval.approvedBy ?? 'orchestrator@local', options);
    const updated = runStore.get(runId);
    if (!updated) throw new Error('RUN_NOT_FOUND');
    return updated;
  }

  // ---------------------------------------------------------------------
  // Post-PR lifecycle: deploy status (from n8n/CI) -> UAT gate -> release
  // ---------------------------------------------------------------------

  async reportDeployStatus(runId: string, report: DeployStatusRequest): Promise<RunResult> {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canReportDeploy(run)) {
      throw errorWithStatus(`Run cannot accept a deploy status report (status: ${run.status})`, 400);
    }

    if (run.status === 'pr_created') {
      await this.transition(runId, 'deploying');
    }

    const environment = report.environment ?? run.deploy?.environment ?? 'staging';

    if (report.status === 'in_progress') {
      const updated = runStore.update(runId, { deploy: { status: 'in_progress', environment, startedAt: run.deploy?.startedAt ?? new Date().toISOString(), url: report.url, pipelineRunUrl: report.pipelineRunUrl, note: report.note } });
      void webhookService.emit('deploy.started', updated);
      void deployService.notifyAdo(updated, report);
      await artifactService.writeRunSnapshot(updated);
      return updated;
    }

    if (report.status === 'succeeded') {
      await this.transition(runId, 'deployed');
      const deployed = runStore.update(runId, { deploy: { status: 'succeeded', environment, url: report.url, pipelineRunUrl: report.pipelineRunUrl, finishedAt: new Date().toISOString(), startedAt: run.deploy?.startedAt } });
      void webhookService.emit('deploy.succeeded', deployed);
      await this.transition(runId, 'awaiting_uat');
      const uatPending = runStore.update(runId, { uat: { ...run.uat, status: 'pending' } });
      void webhookService.emit('uat.awaiting', uatPending);
      void deployService.notifyAdo(uatPending, report);
      await artifactService.writeRunSnapshot(uatPending);
      return uatPending;
    }

    // failed
    const failed = runStore.update(runId, {
      status: 'deploy_failed',
      deploy: { status: 'failed', environment, note: report.note, finishedAt: new Date().toISOString(), startedAt: run.deploy?.startedAt },
      error: { code: 'DEPLOY_FAILED', message: report.note ?? 'Deployment reported failure' },
    });
    void webhookService.emit('deploy.failed', failed);
    void deployService.notifyAdo(failed, report);
    await artifactService.writeRunSnapshot(failed);
    runStore.releaseLock(runId);
    return failed;
  }

  async uatApprove(runId: string, approvedBy: string, comment?: string): Promise<RunResult> {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canUatDecide(run)) throw errorWithStatus(`Run is not awaiting UAT decision (status: ${run.status}, uat: ${run.uat.status})`, 400);

    runStore.update(runId, { uat: { ...run.uat, status: 'approved', approvedBy, approvedAt: new Date().toISOString() } });
    void artifactService.appendLog(runId, { event: 'uat_approved', approvedBy, comment });

    try {
      const release = await releaseService.release(runStore.get(runId)!);
      const final = runStore.update(runId, { status: 'released', release, error: release.error ? { code: 'RELEASE_PARTIAL', message: release.error } : null });
      await artifactService.writeRunSnapshot(final);
      void webhookService.emit('run.released', final);
      return final;
    } catch (error) {
      return this.failRun(runId, 'RELEASE_FAILED', error instanceof Error ? error.message : 'Release failed');
    }
  }

  uatReject(runId: string, rejectedBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (!canUatDecide(run)) throw errorWithStatus(`Run is not awaiting UAT decision (status: ${run.status}, uat: ${run.uat.status})`, 400);

    const updated = runStore.update(runId, {
      status: 'uat_rejected',
      uat: { ...run.uat, status: 'rejected', rejectedBy, rejectedAt: new Date().toISOString(), rejectedReason: reason ?? `Rejected by ${rejectedBy}` },
    });
    void artifactService.appendLog(runId, { event: 'uat_rejected', rejectedBy, reason });
    void artifactService.writeRunSnapshot(updated);
    void webhookService.emit('uat.rejected', updated);
    void notifyAdo(run.intake, (id) => adoClient.addComment(id, `UAT rejected by ${rejectedBy}: ${reason ?? '(no reason given)'}`));
    return updated;
  }

  // ---------------------------------------------------------------------

  private async writeApprovalArtifacts(run: RunResult): Promise<void> {
    const summary = approvalSummaryService.build(run);
    await artifactService.writeJsonArtifact(run.runId, 'approval.json', summary);
    await artifactService.writeTextArtifact(run.runId, 'approval-email.txt', `${summary.email.subject}\n\n${summary.email.bodyPlain}`);
    await artifactService.appendLog(run.runId, { event: 'awaiting_approval', recommendedAction: summary.recommendedAction });
  }

  cancel(runId: string, cancelledBy: string, reason?: string): RunResult {
    const run = runStore.get(runId);
    if (!run) throw errorWithStatus('RUN_NOT_FOUND', 404);
    if (isTerminalStatus(run.status)) {
      throw errorWithStatus(`Cannot cancel run in terminal status ${run.status}`, 409);
    }
    if (!canCancel(run)) {
      throw errorWithStatus(
        run.status === 'awaiting_approval'
          ? 'Use POST /runs/:id/reject to decline a run awaiting approval'
          : run.status === 'awaiting_plan_approval'
            ? 'Use POST /runs/:id/reject-plan to decline a plan awaiting approval'
            : `Cannot cancel run in status ${run.status}`,
        409,
      );
    }

    const updated = runStore.update(runId, { status: 'failed', error: { code: 'CANCELLED', message: reason ?? `Cancelled by ${cancelledBy}` } });
    runStore.releaseLock(runId);
    void artifactService.appendLog(runId, { event: 'cancelled', cancelledBy, reason });
    void artifactService.writeRunSnapshot(updated);
    return updated;
  }
}

export const runLifecycle = new RunLifecycleService();
