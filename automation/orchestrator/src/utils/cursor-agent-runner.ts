import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { extractAssistantText, mergeAssistantStream } from './parse-agent-output.js';
import type { CommandResult } from '../types/contracts.js';

export interface AgentTurnResult {
  success: boolean;
  text: string;
  agentId?: string;
  agentRunId?: string;
  durationMs?: number;
  commandsExecuted: CommandResult[];
  error?: string;
}

function extractShellCommand(args: unknown): string | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const record = args as Record<string, unknown>;
  if (typeof record.command === 'string') return record.command;
  if (typeof record.cmd === 'string') return record.cmd;
  return undefined;
}

export function shouldDryRunAgent(): boolean {
  if (config.cursor.dryRun) return true;
  return !config.cursorConfigured;
}

/**
 * Creates a fresh `@cursor/sdk` Agent, sends one prompt, streams the run to a
 * JSONL transcript file, and resolves once the run completes. Shared by every
 * pipeline stage that invokes the agent for a single turn (planning, doc
 * updates, test generation, AI review). The multi-turn coding loop in
 * agent-service.ts reuses the same Agent instance across calls instead.
 */
export async function runSingleAgentTurn(
  transcriptPath: string,
  prompt: string,
): Promise<AgentTurnResult> {
  await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
  await fs.writeFile(transcriptPath, '', 'utf8');

  const commandsExecuted: CommandResult[] = [];
  const assistantChunks: string[] = [];
  let agentId: string | undefined;
  let agentRunId: string | undefined;

  try {
    const { Agent } = await import('@cursor/sdk');
    const agent = await Agent.create({
      apiKey: config.cursor.apiKey,
      model: { id: config.cursor.model },
      local: { cwd: config.repoRoot },
    });
    agentId = agent.agentId;

    const result = await sendAndCollect(agent, prompt, transcriptPath, commandsExecuted, assistantChunks);
    agentRunId = result.agentRunId;
    agent.close();

    return {
      success: result.status !== 'error',
      text: mergeAssistantStream(assistantChunks, result.waitResult),
      agentId,
      agentRunId,
      durationMs: result.durationMs,
      commandsExecuted,
      error: result.status === 'error' ? 'AGENT_ERROR' : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown agent error';
    return {
      success: false,
      text: mergeAssistantStream(assistantChunks),
      agentId,
      agentRunId,
      commandsExecuted,
      error: message,
    };
  }
}

/**
 * Loosely typed on purpose — the `@cursor/sdk` stream event union is broad (status/assistant/
 * tool_call/etc.) and we only read a few common fields defensively across all of them.
 */
async function sendAndCollect(
  agent: { send: (prompt: string) => Promise<any> }, // eslint-disable-line @typescript-eslint/no-explicit-any
  prompt: string,
  transcriptPath: string,
  commandsExecuted: CommandResult[],
  assistantChunks: string[],
): Promise<{ agentRunId: string; status: string; durationMs?: number; waitResult?: string }> {
  const run = await agent.send(prompt);

  for await (const event of run.stream()) {
    await fs.appendFile(transcriptPath, `${JSON.stringify(event)}\n`, 'utf8');

    if (event.type === 'assistant' && event.message) {
      const text = extractAssistantText(event.message.content);
      if (text) assistantChunks.push(text);
    }

    if (event.type === 'tool_call' && event.status === 'completed') {
      const shellCmd = extractShellCommand(event.args);
      if (shellCmd) {
        commandsExecuted.push({
          name: `agent.tool.${event.name ?? 'unknown'}`,
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

  return { agentRunId: run.id, status: waitResult.status, durationMs: waitResult.durationMs, waitResult: waitResult.result };
}
