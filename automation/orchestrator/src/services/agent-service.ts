import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { buildBugFixPrompt } from '../utils/prompt-builder.js';
import { buildPbiTaskPrompt } from '../utils/pbi-task-prompt-builder.js';
import { extractAssistantText, parseStructuredSections } from '../utils/parse-agent-output.js';
import type { AgentRunResult, BugIntakePayload, CommandResult, PbiIntakePayload, PlanTask, WorkItemPlan } from '../types/contracts.js';
import { repoInspectionService } from './repo-inspection-service.js';
import { artifactService } from './artifact-service.js';

function shouldDryRun(): boolean {
  if (config.cursor.dryRun) return true;
  return !config.cursorConfigured;
}

/** Orders tasks so dependencies run first; falls back to declaration order on a cycle. */
function topoSortTasks(tasks: PlanTask[]): PlanTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const ordered: PlanTask[] = [];

  function visit(task: PlanTask, stack: Set<string>): void {
    if (visited.has(task.id) || stack.has(task.id)) return;
    stack.add(task.id);
    for (const depId of task.dependsOn) {
      const dep = byId.get(depId);
      if (dep) visit(dep, stack);
    }
    stack.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  }

  for (const task of tasks) visit(task, new Set());
  return ordered;
}

function extractShellCommand(args: unknown): string | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  if (typeof record.command === 'string') return record.command;
  if (typeof record.cmd === 'string') return record.cmd;
  return undefined;
}

/**
 * Phase 4: invoke @cursor/sdk local agent (or dry-run when unconfigured).
 */
export const agentService = {
  phase: 'Phase 4',

  async runCursorAgent(
    runId: string,
    intake: BugIntakePayload,
    baseBranch: string,
  ): Promise<AgentRunResult> {
    const inspection = await repoInspectionService.inspect();
    const prompt = buildBugFixPrompt(intake, inspection);
    await artifactService.writeTextArtifact(runId, 'agent-prompt.md', prompt);

    if (shouldDryRun()) {
      const note = config.cursorConfigured
        ? 'CURSOR_DRY_RUN=true — agent not invoked.'
        : 'CURSOR_API_KEY not set — agent not invoked.';

      await artifactService.writeTextArtifact(
        runId,
        'agent-transcript.md',
        `# Dry run\n\n${note}\n\nPrompt saved to agent-prompt.md.\n`,
      );

      return {
        mode: 'dry_run',
        success: true,
        bugSummary: intake.bug.description.slice(0, 500),
        rootCauseSummary: 'Agent dry-run — root cause not determined.',
        changedFiles: [],
        commandsExecuted: inspection.commands,
        promptArtifact: 'agent-prompt.md',
        transcriptArtifact: 'agent-transcript.md',
        implementationNote: note,
      };
    }

    const transcriptPath = path.join(config.artifactsRoot, runId, 'agent-transcript.jsonl');
    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(transcriptPath, '', 'utf8');

    const commandsExecuted: CommandResult[] = [...inspection.commands];
    const assistantChunks: string[] = [];
    let agentId: string | undefined;
    let agentRunId: string | undefined;
    let durationMs: number | undefined;

    try {
      const { Agent } = await import('@cursor/sdk');

      const agent = await Agent.create({
        apiKey: config.cursor.apiKey,
        model: { id: config.cursor.model },
        local: { cwd: config.repoRoot },
      });

      agentId = agent.agentId;
      const run = await agent.send(prompt);
      agentRunId = run.id;

      for await (const event of run.stream()) {
        await fs.appendFile(transcriptPath, `${JSON.stringify(event)}\n`, 'utf8');

        if (event.type === 'assistant') {
          const text = extractAssistantText(event.message.content);
          if (text) assistantChunks.push(text);
        }

        if (event.type === 'tool_call' && event.status === 'completed') {
          const shellCmd = extractShellCommand(event.args);
          if (shellCmd) {
            commandsExecuted.push({
              name: `agent.tool.${event.name}`,
              command: shellCmd,
              cwd: config.repoRoot,
              exitCode: 0,
              durationMs: 0,
              note: 'Captured from Cursor SDK tool_call event',
            });
          }
        }
      }

      const waitResult = await run.wait();
      durationMs = waitResult.durationMs;
      if (waitResult.result) {
        assistantChunks.push(waitResult.result);
      }

      agent.close();

      const fullText = assistantChunks.join('\n').trim();
      const sections = parseStructuredSections(fullText);
      const { gitService } = await import('./git-service.js');
      const { files, commands: gitCommands } = await gitService.listChangedFiles(baseBranch);
      commandsExecuted.push(...gitCommands);

      await artifactService.writeTextArtifact(runId, 'agent-transcript.md', fullText || '(no assistant text captured)');

      if (waitResult.status === 'error') {
        return {
          mode: 'cursor',
          success: false,
          agentRunId,
          agentId,
          bugSummary: sections.summary ?? intake.bug.title,
          rootCauseSummary: sections.rootCause ?? 'Agent run ended with error.',
          changedFiles: files,
          commandsExecuted,
          promptArtifact: 'agent-prompt.md',
          transcriptArtifact: 'agent-transcript.jsonl',
          durationMs,
          error: 'CURSOR_AGENT_ERROR',
        };
      }

      return {
        mode: 'cursor',
        success: true,
        agentRunId,
        agentId,
        bugSummary: sections.summary ?? intake.bug.title,
        rootCauseSummary: sections.rootCause ?? 'See agent transcript for analysis.',
        changedFiles: files,
        commandsExecuted,
        promptArtifact: 'agent-prompt.md',
        transcriptArtifact: 'agent-transcript.jsonl',
        durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown agent error';
      await artifactService.appendLog(runId, { event: 'agent_error', message });
      await artifactService.writeTextArtifact(
        runId,
        'agent-transcript.md',
        `# Agent error\n\n${message}\n`,
      );

      return {
        mode: 'cursor',
        success: false,
        agentRunId,
        agentId,
        bugSummary: intake.bug.title,
        rootCauseSummary: 'Agent failed before completing analysis.',
        changedFiles: [],
        commandsExecuted,
        promptArtifact: 'agent-prompt.md',
        transcriptArtifact: 'agent-transcript.jsonl',
        durationMs,
        error: message,
      };
    }
  },

  /**
   * Coding stage for the PBI pipeline (post Gate 1). Runs the approved plan's tasks in
   * dependency order on a single Agent conversation so later tasks retain context from
   * earlier ones. Each task gets one retry if the agent errors or reports no changes.
   */
  async runCursorAgentForPlan(
    runId: string,
    intake: PbiIntakePayload,
    plan: WorkItemPlan,
    baseBranch: string,
  ): Promise<AgentRunResult> {
    if (shouldDryRun()) {
      const note = config.cursorConfigured
        ? 'CURSOR_DRY_RUN=true — agent not invoked.'
        : 'CURSOR_API_KEY not set — agent not invoked.';
      await artifactService.writeTextArtifact(runId, 'agent-transcript.md', `# Dry run\n\n${note}\n`);
      return {
        mode: 'dry_run',
        success: true,
        bugSummary: plan.summary,
        rootCauseSummary: 'PBI dry-run — no tasks executed.',
        changedFiles: [],
        commandsExecuted: [],
        promptArtifact: 'plan-prompt.md',
        transcriptArtifact: 'agent-transcript.md',
        implementationNote: note,
      };
    }

    const orderedTasks = topoSortTasks(plan.tasks);
    const commandsExecuted: CommandResult[] = [];
    const taskSummaries: string[] = [];
    let agentId: string | undefined;
    const failedTasks: string[] = [];

    try {
      const { Agent } = await import('@cursor/sdk');
      const agent = await Agent.create({
        apiKey: config.cursor.apiKey,
        model: { id: config.cursor.model },
        local: { cwd: config.repoRoot },
      });
      agentId = agent.agentId;

      for (const task of orderedTasks) {
        let taskOk = false;
        let lastError: string | undefined;

        for (let attempt = 1; attempt <= 2 && !taskOk; attempt++) {
          const prompt = buildPbiTaskPrompt(intake, plan, task, attempt);
          const transcriptPath = path.join(config.artifactsRoot, runId, `task-${task.id}.jsonl`);
          await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
          await fs.writeFile(transcriptPath, '', 'utf8');

          const assistantChunks: string[] = [];
          try {
            const run = await agent.send(prompt);
            for await (const event of run.stream()) {
              await fs.appendFile(transcriptPath, `${JSON.stringify(event)}\n`, 'utf8');
              if (event.type === 'assistant') {
                const text = extractAssistantText(event.message.content);
                if (text) assistantChunks.push(text);
              }
              if (event.type === 'tool_call' && event.status === 'completed') {
                const shellCmd = extractShellCommand(event.args);
                if (shellCmd) {
                  commandsExecuted.push({
                    name: `agent.tool.${event.name}`,
                    command: shellCmd,
                    cwd: config.repoRoot,
                    exitCode: 0,
                    durationMs: 0,
                    note: `task=${task.id} attempt=${attempt}`,
                  });
                }
              }
            }
            const waitResult = await run.wait();
            if (waitResult.result) assistantChunks.push(waitResult.result);

            const text = assistantChunks.join('\n').trim();
            await artifactService.writeTextArtifact(runId, `task-${task.id}.md`, text || '(no assistant text captured)');

            if (waitResult.status === 'error') {
              lastError = `Task ${task.id} attempt ${attempt} ended with agent error`;
              continue;
            }
            taskOk = true;
            taskSummaries.push(`- **${task.id}** (${task.title}): ${text.slice(0, 300)}`);
          } catch (taskError) {
            lastError = taskError instanceof Error ? taskError.message : `Task ${task.id} failed`;
          }
        }

        if (!taskOk) {
          failedTasks.push(task.id);
          await artifactService.appendLog(runId, { event: 'task_failed', taskId: task.id, error: lastError });
        }
      }

      agent.close();

      const { gitService } = await import('./git-service.js');
      const { files, commands: gitCommands } = await gitService.listChangedFiles(baseBranch);
      commandsExecuted.push(...gitCommands);

      await artifactService.writeTextArtifact(
        runId,
        'agent-transcript.md',
        [`# Coding stage — ${orderedTasks.length} task(s)`, '', ...taskSummaries].join('\n'),
      );

      if (failedTasks.length > 0) {
        return {
          mode: 'cursor',
          success: false,
          agentId,
          bugSummary: plan.summary,
          rootCauseSummary: `Task(s) failed after retry: ${failedTasks.join(', ')}`,
          changedFiles: files,
          commandsExecuted,
          promptArtifact: 'plan-prompt.md',
          transcriptArtifact: 'agent-transcript.md',
          error: 'CODING_TASK_FAILED',
        };
      }

      return {
        mode: 'cursor',
        success: true,
        agentId,
        bugSummary: plan.summary,
        rootCauseSummary: `Implemented ${orderedTasks.length} task(s) from the approved plan.`,
        changedFiles: files,
        commandsExecuted,
        promptArtifact: 'plan-prompt.md',
        transcriptArtifact: 'agent-transcript.md',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown coding-stage error';
      await artifactService.appendLog(runId, { event: 'coding_stage_error', message });
      return {
        mode: 'cursor',
        success: false,
        agentId,
        bugSummary: plan.summary,
        rootCauseSummary: 'Coding stage failed before completing tasks.',
        changedFiles: [],
        commandsExecuted,
        promptArtifact: 'plan-prompt.md',
        transcriptArtifact: 'agent-transcript.md',
        error: message,
      };
    }
  },
};
