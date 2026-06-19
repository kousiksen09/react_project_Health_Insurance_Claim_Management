import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export interface ValidationStepSpec {
  enabled: boolean;
  cwd: string;
  command: string;
  skipReason?: string;
}

export interface ValidationCommandPlan {
  backendProjectRel: string;
  backendSolutionRel: string;
  frontendProjectRel: string;
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

const BACKEND_PROJECT = 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI';
const BACKEND_SOLUTION = 'HealthInsuranceClaimAPI';
const BACKEND_TESTS = 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests';
const FRONTEND = 'healthinsuranceclaim_frontend';

function envCommand(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function envCwd(name: string, fallback: string): string {
  return envCommand(name) ?? fallback;
}

async function pathExists(repoRoot: string, relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
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
 * Detect repo-specific validation commands with optional env overrides.
 */
export async function detectValidationPlan(): Promise<ValidationCommandPlan> {
  const repoRoot = config.repoRoot;
  const hasBackend = await pathExists(repoRoot, path.join(BACKEND_PROJECT, 'HealthInsuranceClaimAPI.csproj'));
  const hasFrontend = await pathExists(repoRoot, path.join(FRONTEND, 'package.json'));
  const hasBackendTests = await pathExists(
    repoRoot,
    path.join(BACKEND_TESTS, 'HealthInsuranceClaimAPI.Tests.csproj'),
  );
  const scripts = hasFrontend ? await readPackageScripts(repoRoot, FRONTEND) : {};

  const backendBuildCmd = envCommand('VALIDATION_BACKEND_BUILD_CMD') ?? 'dotnet build --verbosity minimal';
  const backendBuildCwd = envCwd('VALIDATION_BACKEND_BUILD_CWD', BACKEND_SOLUTION);
  const backendTestCmd =
    envCommand('VALIDATION_BACKEND_TEST_CMD') ?? (hasBackendTests ? 'dotnet test --no-build --verbosity minimal' : '');
  const backendTestCwd = envCwd('VALIDATION_BACKEND_TEST_CWD', BACKEND_SOLUTION);

  const frontendBuildCmd = envCommand('VALIDATION_FRONTEND_BUILD_CMD') ?? (scripts.build ? 'npm run build' : '');
  const frontendBuildCwd = envCwd('VALIDATION_FRONTEND_BUILD_CWD', FRONTEND);
  const frontendTestCmd =
    envCommand('VALIDATION_FRONTEND_TEST_CMD') ??
    (scripts.test ? 'npm test' : scripts['test:unit'] ? 'npm run test:unit' : '');

  const frontendTestCwd = envCwd('VALIDATION_FRONTEND_TEST_CWD', FRONTEND);
  const skipFrontendBuild = config.validation.skipFrontendBuild;

  const envOverride = Boolean(
    envCommand('VALIDATION_BACKEND_BUILD_CMD') ||
      envCommand('VALIDATION_BACKEND_TEST_CMD') ||
      envCommand('VALIDATION_FRONTEND_BUILD_CMD') ||
      envCommand('VALIDATION_FRONTEND_TEST_CMD'),
  );

  return {
    backendProjectRel: BACKEND_PROJECT,
    backendSolutionRel: BACKEND_SOLUTION,
    frontendProjectRel: FRONTEND,
    backendTestProjectRel: hasBackendTests ? BACKEND_TESTS : null,
    build: {
      backend: {
        enabled: hasBackend,
        cwd: path.join(repoRoot, backendBuildCwd),
        command: backendBuildCmd,
        skipReason: hasBackend ? undefined : 'Backend project not found',
      },
      frontend: {
        enabled: hasFrontend && Boolean(frontendBuildCmd) && !skipFrontendBuild,
        cwd: path.join(repoRoot, frontendBuildCwd),
        command: frontendBuildCmd,
        skipReason: !hasFrontend
          ? 'Frontend project not found'
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
        cwd: path.join(repoRoot, backendTestCwd),
        command: backendTestCmd,
        skipReason: !hasBackend
          ? 'Backend project not found'
          : !hasBackendTests
            ? 'No backend test project detected'
            : !backendTestCmd
              ? 'Backend test command not configured'
              : undefined,
      },
      frontend: {
        enabled: hasFrontend && Boolean(frontendTestCmd),
        cwd: path.join(repoRoot, frontendTestCwd),
        command: frontendTestCmd,
        skipReason: !hasFrontend
          ? 'Frontend project not found'
          : !frontendTestCmd
            ? 'No frontend test script in package.json'
            : undefined,
      },
    },
    source: envOverride ? 'env_override' : 'detected',
  };
}
