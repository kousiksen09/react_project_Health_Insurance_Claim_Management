import type { CommandResult, TestCounts, TestGapRecommendation, ValidationResult } from '../types/contracts.js';
import { config } from '../config.js';
import { countBuildErrors, execShell, toCommandResult } from '../utils/exec.js';
import { detectValidationPlan, type ValidationCommandPlan, type ValidationStepSpec } from './validation-config.js';

function parseDotnetTestCounts(output: string): TestCounts {
  const summary =
    output.match(/Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)/i) ??
    output.match(/Total tests:\s*(\d+)\.\s*Passed:\s*(\d+)\.\s*Failed:\s*(\d+)\.\s*Skipped:\s*(\d+)/i);

  if (!summary) {
    const passed = output.match(/Passed!\s/i) ? 1 : 0;
    return { passed, failed: 0, skipped: 0 };
  }

  if (summary[0].includes('Total tests')) {
    const total = Number(summary[1]);
    const passed = Number(summary[2]);
    const failed = Number(summary[3]);
    const skipped = Number(summary[4]);
    return { passed, failed, skipped: skipped || Math.max(0, total - passed - failed) };
  }

  return {
    failed: Number(summary[1]),
    passed: Number(summary[2]),
    skipped: Number(summary[3]),
  };
}

function parseNpmTestCounts(output: string, exitCode: number): TestCounts {
  const passed = output.match(/\b(\d+) passed\b/i)?.[1];
  const failed = output.match(/\b(\d+) failed\b/i)?.[1];
  const skipped = output.match(/\b(\d+) skipped\b/i)?.[1];

  if (passed || failed) {
    return {
      passed: Number(passed ?? 0),
      failed: Number(failed ?? 0),
      skipped: Number(skipped ?? 0),
    };
  }

  return {
    passed: exitCode === 0 ? 1 : 0,
    failed: exitCode === 0 ? 0 : 1,
    skipped: 0,
  };
}

function buildTestGapRecommendations(plan: ValidationCommandPlan): TestGapRecommendation[] {
  const recommendations: TestGapRecommendation[] = [];

  if (!plan.backendTestProjectRel) {
    recommendations.push({
      layer: 'backend',
      priority: 'high',
      title: 'Add xUnit smoke project HealthInsuranceClaimAPI.Tests',
      description:
        'Create HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests with 2–3 fast unit tests (ClaimStatus enum, RegisterCustomerDto.ValidateAge).',
      suggestedPath: 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests/',
      rationale: 'Enables dotnet test in validation without database or HTTP.',
    });
  } else {
    recommendations.push({
      layer: 'backend',
      priority: 'medium',
      title: 'Add AuthService inactive-user regression test',
      description:
        'Test that inactive users receive a distinct error message from invalid credentials (AuthService.cs).',
      suggestedPath: 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests/AuthServiceTests.cs',
      rationale: 'Covers demo bug A4 with a focused service-level assertion.',
    });
  }

  if (!plan.test.frontend.enabled) {
    recommendations.push({
      layer: 'frontend',
      priority: 'high',
      title: 'Add Vitest smoke test for notification type labels',
      description:
        'Extract notification type → label map to a pure function and test ClaimSubmitted → "Claim Submitted".',
      suggestedPath:
        'healthinsuranceclaim_frontend/src/features/notifications/__tests__/notificationLabels.test.ts',
      rationale: 'Smallest regression guard for demo bug A1 without full tsc build.',
    });
    recommendations.push({
      layer: 'frontend',
      priority: 'medium',
      title: 'Add npm test script with vitest',
      description: 'Add vitest + @testing-library/react; wire "test": "vitest run" in package.json.',
      suggestedPath: 'healthinsuranceclaim_frontend/package.json',
      rationale: 'Allows orchestrator to run frontend unit tests in validation.',
    });
  }

  return recommendations;
}

async function runStep(
  name: string,
  step: ValidationStepSpec,
  timeoutMs: number,
): Promise<{ command: CommandResult; success: boolean; output: string; errorCount?: number }> {
  if (!step.enabled) {
    return {
      command: {
        name,
        command: step.command || '(skipped)',
        cwd: step.cwd,
        exitCode: 0,
        durationMs: 0,
        note: step.skipReason ?? 'skipped',
      },
      success: true,
      output: '',
    };
  }

  const result = await execShell(step.command, { cwd: step.cwd, timeoutMs });
  const output = `${result.stdout}\n${result.stderr}`;
  const isBuild = name.includes('build');
  return {
    command: toCommandResult(name, result),
    success: result.exitCode === 0,
    output,
    errorCount: isBuild ? countBuildErrors(output) : undefined,
  };
}

/**
 * Phase 5: run repo-specific build and test commands; return structured validation results.
 */
export const validationService = {
  phase: 'Phase 5',

  async runLocalValidation(): Promise<ValidationResult> {
    const plan = await detectValidationPlan();
    const timeoutMs = config.validation.timeoutMs;
    const commands: CommandResult[] = [];
    const strictMode = config.strictValidation;

    const backendBuild = await runStep('validation.backend.build', plan.build.backend, timeoutMs);
    commands.push(backendBuild.command);

    const frontendBuild = await runStep('validation.frontend.build', plan.build.frontend, timeoutMs);
    commands.push(frontendBuild.command);

    const backendTests = await runStep('validation.backend.test', plan.test.backend, timeoutMs);
    commands.push(backendTests.command);

    const frontendTests = await runStep('validation.frontend.test', plan.test.frontend, timeoutMs);
    commands.push(frontendTests.command);

    const backendTestCounts = plan.test.backend.enabled
      ? parseDotnetTestCounts(backendTests.output)
      : { passed: 0, failed: 0, skipped: 0 };
    const frontendTestCounts = plan.test.frontend.enabled
      ? parseNpmTestCounts(frontendTests.output, frontendTests.command.exitCode)
      : { passed: 0, failed: 0, skipped: 0 };

    const backendBuildRequired = plan.build.backend.enabled;
    const frontendBuildRequired = strictMode && plan.build.frontend.enabled;

    const backendBuildOk = !backendBuildRequired || backendBuild.success;
    const frontendBuildOk = !frontendBuildRequired || frontendBuild.success;
    const buildPassed = backendBuildOk && frontendBuildOk;

    const backendTestsRan = plan.test.backend.enabled;
    const frontendTestsRan = plan.test.frontend.enabled;
    const backendTestsOk = !backendTestsRan || (backendTests.success && backendTestCounts.failed === 0);
    const frontendTestsOk = !frontendTestsRan || (frontendTests.success && frontendTestCounts.failed === 0);
    const testsPassed = backendTestsOk && frontendTestsOk;

    const testGapRecommendations = buildTestGapRecommendations(plan);
    const testsWeak =
      (backendTestsRan && backendTestCounts.passed <= 3) ||
      !backendTestsRan ||
      (!frontendTestsRan && plan.frontendProjectRel.length > 0);

    const testSummaryParts: string[] = [];
    if (backendTestsRan) {
      testSummaryParts.push(
        `backend: ${backendTestCounts.passed} passed, ${backendTestCounts.failed} failed, ${backendTestCounts.skipped} skipped`,
      );
    } else {
      testSummaryParts.push('backend: not run');
    }
    if (frontendTestsRan) {
      testSummaryParts.push(
        `frontend: ${frontendTestCounts.passed} passed, ${frontendTestCounts.failed} failed, ${frontendTestCounts.skipped} skipped`,
      );
    } else {
      testSummaryParts.push('frontend: not run');
    }
    if (testsWeak) {
      testSummaryParts.push('coverage: weak — see testGapRecommendations');
    }

    const failureReasons: string[] = [];
    if (!backendBuildOk) {
      failureReasons.push(
        `Backend build failed (exit ${backendBuild.command.exitCode}, ${backendBuild.errorCount ?? 0} compile errors)`,
      );
    }
    if (!frontendBuildOk) {
      failureReasons.push(
        `Frontend build failed (exit ${frontendBuild.command.exitCode}, ${frontendBuild.errorCount ?? 0} compile errors)`,
      );
    }
    if (backendTestsRan && !backendTestsOk) {
      failureReasons.push(`Backend tests failed (${backendTestCounts.failed} failed)`);
    }
    if (frontendTestsRan && !frontendTestsOk) {
      failureReasons.push(`Frontend tests failed (${frontendTestCounts.failed} failed)`);
    }

    const passed = buildPassed && testsPassed;

    let implementationNote: string | undefined;
    if (!strictMode && plan.build.frontend.enabled && !frontendBuild.success) {
      implementationNote =
        'STRICT_VALIDATION=false — frontend build failure does not block approval; backend build and tests are the gate.';
    } else if (testsWeak) {
      implementationNote = 'Test coverage is minimal; see testGapRecommendations for demo-friendly additions.';
    }

    return {
      implemented: true,
      buildPassed,
      testsPassed,
      passed,
      strictMode,
      testSummary: testSummaryParts.join('; '),
      failureReason: failureReasons.length > 0 ? failureReasons.join(' | ') : null,
      commands,
      build: {
        backend: {
          success: backendBuild.success,
          skipped: !plan.build.backend.enabled,
          errorCount: backendBuild.errorCount,
        },
        frontend: {
          success: frontendBuild.success,
          skipped: !plan.build.frontend.enabled,
          errorCount: frontendBuild.errorCount,
        },
      },
      tests: {
        backend: { ...backendTestCounts, ran: backendTestsRan, weak: testsWeak && !backendTestsRan },
        frontend: { ...frontendTestCounts, ran: frontendTestsRan, weak: !frontendTestsRan },
      },
      detectedCommands: plan,
      testGapRecommendations,
      implementationNote,
    };
  },
};
