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
  timedOut?: boolean;
}

const DEFAULT_TIMEOUT_MS = 120_000;

function spawnProcess(
  command: string,
  args: string[],
  options: ExecOptions & { shell?: boolean },
): Promise<ExecResult> {
  const start = Date.now();
  const fullCommand = args.length > 0 ? [command, ...args].join(' ') : command;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode: number, timedOut = false): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command: fullCommand,
        cwd: options.cwd,
        exitCode,
        durationMs: Date.now() - start,
        stdout,
        stderr: timedOut
          ? `${stderr}\n[TIMEOUT] Command killed after ${timeoutMs}ms`.trim()
          : stderr,
        timedOut,
      });
    };

    // On Windows, SIGTERM is ignored. child.kill() without a signal sends SIGTERM on
    // Unix and calls TerminateProcess() on Windows — the only cross-platform option.
    const timer = setTimeout(() => {
      if (!settled) {
        child.kill();
        // finish() is called here so the timeout exit code (124) is set immediately;
        // the subsequent 'close' event is a no-op because settled=true.
        finish(124, true);
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => finish(code ?? 1));
    child.on('error', (error) => {
      stderr += `\n${error.message}`.trimStart();
      finish(1);
    });
  });
}

export async function execCommand(
  command: string,
  args: string[],
  options: ExecOptions,
): Promise<ExecResult> {
  return spawnProcess(command, args, { ...options, shell: false });
}

export async function execShell(commandLine: string, options: ExecOptions): Promise<ExecResult> {
  return spawnProcess(commandLine, [], { ...options, shell: true });
}

function tail(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return text.slice(-max);
}

export function countBuildErrors(output: string): number {
  const tsErrors = output.match(/\berror TS\d+:/g)?.length ?? 0;
  const csErrors = output.match(/\berror CS\d+:/g)?.length ?? 0;
  return tsErrors + csErrors;
}

/** MSB3027/MSB3021 — dotnet cannot overwrite .exe while API is running. */
export function isFileLockBuildFailure(output: string): boolean {
  return /MSB3027|MSB3021|being used by another process|file is locked by/i.test(output);
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
    note: result.timedOut ? `[TIMEOUT] ${note ?? ''}`.trim() : note,
  };
}
