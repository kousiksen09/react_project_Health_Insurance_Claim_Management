import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import type { BugIntakePayload, RunResult, RunStatus } from '../types/contracts.js';
import { buildBranchName, createRunId, relativeArtifactsPath } from '../utils/ids.js';

/** Statuses where the pipeline is actively running (not waiting for human input). */
const IN_FLIGHT_STATUSES = new Set<RunStatus>(['queued', 'analyzing', 'patch_created', 'validating']);

interface RunIndex {
  activeRunId: string | null;
  messageIds: Record<string, string>;
}

/**
 * Run store with JSON file persistence under automation/orchestrator/data/.
 *
 * - Survives process restart
 * - Still single-process (REPO_LOCK); not safe for multiple orchestrator instances
 */
class RunStore {
  private runs = new Map<string, RunResult>();
  private messageIndex = new Map<string, string>();
  private activeRunId: string | null = null;
  private initialized = false;

  private get runsDir(): string {
    return path.join(config.dataDir, 'runs');
  }

  private get indexPath(): string {
    return path.join(config.dataDir, 'index.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(this.runsDir, { recursive: true });

    try {
      const raw = await fs.readFile(this.indexPath, 'utf8');
      const index = JSON.parse(raw) as RunIndex;
      this.activeRunId = index.activeRunId;
      for (const [messageId, runId] of Object.entries(index.messageIds ?? {})) {
        this.messageIndex.set(messageId, runId);
      }
      const runIds = new Set(this.messageIndex.values());
      for (const runId of runIds) {
        const run = await this.loadRunFile(runId);
        if (run) this.runs.set(runId, run);
      }
    } catch {
      await this.persistIndex();
    }

    // If the process crashed while a pipeline step was running, that run is stuck
    // forever (lock held, pipeline dead). Recover it to 'failed' so new runs can start.
    if (this.activeRunId) {
      const activeRun = this.runs.get(this.activeRunId);
      if (activeRun && IN_FLIGHT_STATUSES.has(activeRun.status)) {
        console.warn(
          `[run-store] run ${activeRun.runId} was in-flight (${activeRun.status}) at shutdown — marking failed`,
        );
        const recovered: RunResult = {
          ...activeRun,
          status: 'failed',
          updatedAt: new Date().toISOString(),
          error: {
            code: 'CRASHED_ON_RESTART',
            message: `Pipeline was in status '${activeRun.status}' when orchestrator restarted. Submit again.`,
          },
        };
        this.runs.set(this.activeRunId, recovered);
        this.activeRunId = null;
        await this.persistRun(recovered);
        await this.persistIndex();
      }
    }

    this.initialized = true;
  }

  hasActiveRun(): boolean {
    return this.activeRunId !== null;
  }

  getActiveRunId(): string | null {
    return this.activeRunId;
  }

  findByMessageId(messageId: string): RunResult | undefined {
    const runId = this.messageIndex.get(messageId);
    return runId ? this.runs.get(runId) : undefined;
  }

  get(runId: string): RunResult | undefined {
    return this.runs.get(runId);
  }

  create(intake: BugIntakePayload): RunResult {
    const now = new Date().toISOString();
    const runId = createRunId(new Date(intake.receivedAt));
    const branchName = buildBranchName(runId, intake.bug.title);

    const run: RunResult = {
      runId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      intake,
      analysis: undefined,
      validation: undefined,
      git: {
        baseBranch: config.defaultBaseBranch,
        branchName,
        commits: [],
        pushed: false,
        prUrl: null,
      },
      approval: {
        required: true,
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectedReason: null,
      },
      artifactsPath: relativeArtifactsPath(runId),
      error: null,
    };

    this.runs.set(runId, run);
    this.messageIndex.set(intake.messageId, runId);
    if (config.repoLock) {
      this.activeRunId = runId;
    }

    void this.persistRun(run);
    void this.persistIndex();
    return run;
  }

  update(runId: string, patch: Partial<RunResult>): RunResult {
    const current = this.runs.get(runId);
    if (!current) {
      throw new Error(`Run not found: ${runId}`);
    }
    const updated: RunResult = {
      ...current,
      ...patch,
      approval: patch.approval ? { ...current.approval, ...patch.approval } : current.approval,
      git: patch.git ? { ...current.git!, ...patch.git } : current.git,
      analysis: patch.analysis ? { ...current.analysis, ...patch.analysis } : current.analysis,
      validation: patch.validation ? { ...current.validation, ...patch.validation } : current.validation,
      updatedAt: new Date().toISOString(),
    };
    this.runs.set(runId, updated);
    void this.persistRun(updated);
    return updated;
  }

  setStatus(runId: string, status: RunStatus): RunResult {
    return this.update(runId, { status });
  }

  releaseLock(runId: string): void {
    if (this.activeRunId === runId) {
      this.activeRunId = null;
      void this.persistIndex();
    }
  }

  private runFilePath(runId: string): string {
    return path.join(this.runsDir, `${runId}.json`);
  }

  private async loadRunFile(runId: string): Promise<RunResult | undefined> {
    try {
      const raw = await fs.readFile(this.runFilePath(runId), 'utf8');
      return JSON.parse(raw) as RunResult;
    } catch {
      return undefined;
    }
  }

  private async persistRun(run: RunResult): Promise<void> {
    await fs.mkdir(this.runsDir, { recursive: true });
    await fs.writeFile(this.runFilePath(run.runId), JSON.stringify(run, null, 2), 'utf8');
  }

  private async persistIndex(): Promise<void> {
    const index: RunIndex = {
      activeRunId: this.activeRunId,
      messageIds: Object.fromEntries(this.messageIndex.entries()),
    };
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf8');
  }
}

export const runStore = new RunStore();
