import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { detectBackendDir, detectBackendTestDir, detectFrontendDir } from './project-detection.js';

export interface ValidationStepSpec {
  enabled: boolean;
  cwd: string;
  command: string;
  skipReason?: string;
}

export interface ValidationCommandPlan {
  backendProjectRel: string | null;
  backendSolutionRel: string | null;
  frontendProjectRel: string | null;
  backendTestProjectRel: string | null;
  build: {
    backend: ValidationStepSpec;
    frontend: ValidationStepSpec;
  };
  test: {
    backend: ValidationStepSpec;
    frontend: ValidationStepSpec;
  };
  source: 'detected' | 'env_override';
}

function envCommand(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function dirExists(repoRoot: string, relativePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readPackageScripts(repoRoot: string, frontendRel: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(repoRoot, frontendRel, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Detect repo-specific validation commands and directories.
 *
 * Resolution order per project (backend/frontend):
 *  1. Explicit VALIDATION_*_CWD env override — trusted directly (existence-checked, not
 *     gated on any particular project-file name), so this always works regardless of repo shape.
 *  2. Generic shallow auto-detection (see project-detection.ts) — looks for *.sln/*.csproj or
 *     package.json at the repo root or one level down. Bounded and timeout-safe.
 *  3. Not found — step is disabled with a clear skipReason.
 */
export async function detectValidationPlan(): Promise<ValidationCommandPlan> {
  const repoRoot = config.repoRoot;

  const backendBuildCwdOverride = envCommand('VALIDATION_BACKEND_BUILD_CWD');
  const backendTestCwdOverride = envCommand('VALIDATION_BACKEND_TEST_CWD');
  const frontendCwdOverride = envCommand('VALIDATION_FRONTEND_BUILD_CWD') ?? envCommand('VALIDATION_FRONTEND_TEST_CWD');

  const backendDir = backendBuildCwdOverride ?? backendTestCwdOverride ?? (await detectBackendDir(repoRoot));
  const frontendDir = frontendCwdOverride ?? (await detectFrontendDir(repoRoot));
  const backendTestDir = backendTestCwdOverride ?? (await detectBackendTestDir(repoRoot));

  const hasBackend = backendDir !== null && (await dirExists(repoRoot, backendDir));
  const hasFrontend = frontendDir !== null && (await dirExists(repoRoot, frontendDir));
  const hasBackendTests = backendTestDir !== null && (await dirExists(repoRoot, backendTestDir));

  const scripts = hasFrontend && frontendDir ? await readPackageScripts(repoRoot, frontendDir) : {};

  const backendBuildCmd = envCommand('VALIDATION_BACKEND_BUILD_CMD') ?? 'dotnet build --verbosity minimal';
  const backendTestCmd =
    envCommand('VALIDATION_BACKEND_TEST_CMD') ?? (hasBackendTests ? 'dotnet test --no-build --verbosity minimal' : '');

  const frontendBuildCmd = envCommand('VALIDATION_FRONTEND_BUILD_CMD') ?? (scripts.build ? 'npm run build' : '');
  const frontendTestCmd =
    envCommand('VALIDATION_FRONTEND_TEST_CMD') ??
    (scripts.test ? 'npm test' : scripts['test:unit'] ? 'npm run test:unit' : '');

  const skipFrontendBuild = config.validation.skipFrontendBuild;

  const envOverride = Boolean(
    backendBuildCwdOverride ||
      backendTestCwdOverride ||
      frontendCwdOverride ||
      envCommand('VALIDATION_BACKEND_BUILD_CMD') ||
      envCommand('VALIDATION_BACKEND_TEST_CMD') ||
      envCommand('VALIDATION_FRONTEND_BUILD_CMD') ||
      envCommand('VALIDATION_FRONTEND_TEST_CMD'),
  );

  return {
    backendProjectRel: backendDir,
    backendSolutionRel: backendDir,
    frontendProjectRel: frontendDir,
    backendTestProjectRel: hasBackendTests ? backendTestDir : null,
    build: {
      backend: {
        enabled: hasBackend,
        cwd: path.join(repoRoot, backendDir ?? ''),
        command: backendBuildCmd,
        skipReason: hasBackend
          ? undefined
          : 'No backend project detected — set VALIDATION_BACKEND_BUILD_CWD in .env',
      },
      frontend: {
        enabled: hasFrontend && Boolean(frontendBuildCmd) && !skipFrontendBuild,
        cwd: path.join(repoRoot, frontendDir ?? ''),
        command: frontendBuildCmd,
        skipReason: !hasFrontend
          ? 'No frontend project detected — set VALIDATION_FRONTEND_BUILD_CWD in .env'
          : skipFrontendBuild
            ? 'VALIDATION_SKIP_FRONTEND_BUILD=true'
            : !frontendBuildCmd
              ? 'No frontend build script detected'
              : undefined,
      },
    },
    test: {
      backend: {
        enabled: hasBackend && Boolean(backendTestCmd),
        cwd: path.join(repoRoot, backendTestDir ?? backendDir ?? ''),
        command: backendTestCmd,
        skipReason: !hasBackend
          ? 'No backend project detected'
          : !hasBackendTests
            ? 'No backend test project detected — set VALIDATION_BACKEND_TEST_CWD in .env'
            : !backendTestCmd
              ? 'Backend test command not configured'
              : undefined,
      },
      frontend: {
        enabled: hasFrontend && Boolean(frontendTestCmd),
        cwd: path.join(repoRoot, frontendDir ?? ''),
        command: frontendTestCmd,
        skipReason: !hasFrontend
          ? 'No frontend project detected'
          : !frontendTestCmd
            ? 'No frontend test script in package.json'
            : undefined,
      },
    },
    source: envOverride ? 'env_override' : 'detected',
  };
}
