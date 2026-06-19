import { spawn } from 'node:child_process';
import type { CommandResult } from '../types/contracts.js';

export interface ExecOptions {
  cwd: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface ExecResult {
  command: string;
  cwd: string;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export async function execCommand(
  command: string,
  args: string[],
  options: ExecOptions,
): Promise<ExecResult> {
  const start = Date.now();
  const fullCommand = [command, ...args].join(' ');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        child.kill('SIGTERM');
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: fullCommand,
        cwd: options.cwd,
        exitCode: code ?? 1,
        durationMs: Date.now() - start,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: fullCommand,
        cwd: options.cwd,
        exitCode: 1,
        durationMs: Date.now() - start,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
      });
    });
  });
}

function tail(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return text.slice(-max);
}

export async function execShell(commandLine: string, options: ExecOptions): Promise<ExecResult> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = spawn(commandLine, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        child.kill('SIGTERM');
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: commandLine,
        cwd: options.cwd,
        exitCode: code ?? 1,
        durationMs: Date.now() - start,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: commandLine,
        cwd: options.cwd,
        exitCode: 1,
        durationMs: Date.now() - start,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
      });
    });
  });
}

export function countBuildErrors(output: string): number {
  const tsErrors = output.match(/\berror TS\d+:/g)?.length ?? 0;
  const csErrors = output.match(/\berror CS\d+:/g)?.length ?? 0;
  return tsErrors + csErrors;
}

export function toCommandResult(name: string, result: ExecResult, note?: string): CommandResult {
  return {
    name,
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    note,
  };
}
