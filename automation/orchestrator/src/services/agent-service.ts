import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { buildBugFixPrompt } from '../utils/prompt-builder.js';
import { extractAssistantText, parseStructuredSections } from '../utils/parse-agent-output.js';
import type { AgentRunResult, BugIntakePayload, CommandResult } from '../types/contracts.js';
import { repoInspectionService } from './repo-inspection-service.js';
import { artifactService } from './artifact-service.js';

function shouldDryRun(): boolean {
  if (config.cursor.dryRun) return true;
  return !config.cursorConfigured;
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
};
