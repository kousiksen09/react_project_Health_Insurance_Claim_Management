import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { execShell, toCommandResult } from '../utils/exec.js';
import type { CommandResult, CoverageDeltaSummary, CoverageFileDelta } from '../types/contracts.js';

interface IstanbulSummaryEntry {
  lines: { pct: number };
}
type IstanbulSummary = Record<string, IstanbulSummaryEntry>;

async function readPackageScripts(repoRoot: string, frontendRel: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(repoRoot, frontendRel, 'package.json'), 'utf8');
    return (JSON.parse(raw) as { scripts?: Record<string, string> }).scripts ?? {};
  } catch {
    return {};
  }
}

async function readCoverageSummary(summaryPath: string): Promise<IstanbulSummary | null> {
  try {
    const raw = await fs.readFile(summaryPath, 'utf8');
    return JSON.parse(raw) as IstanbulSummary;
  } catch {
    return null;
  }
}

/**
 * Best-effort coverage reporting for the files a run touched. Only runs when the repo
 * already has coverage tooling wired up (an npm `coverage`/`test:coverage` script, or a
 * cobertura-producing `dotnet test` setup) — it does not install or configure tooling.
 * When unavailable, returns `ran: false` with a clear note rather than fabricating numbers.
 */
export const coverageService = {
  async measureFrontend(
    changedFiles: string[],
    timeoutMs: number,
  ): Promise<{ files: CoverageFileDelta[]; command?: CommandResult; note?: string }> {
    const frontendRel = 'healthinsuranceclaim_frontend';
    const repoRoot = config.repoRoot;
    const scripts = await readPackageScripts(repoRoot, frontendRel);
    const coverageScript = scripts['test:coverage'] ? 'npm run test:coverage' : scripts.coverage ? 'npm run coverage' : null;

    const frontendFiles = changedFiles.filter((f) => f.startsWith(frontendRel) && /\.(tsx?|jsx?)$/.test(f));
    if (!coverageScript || frontendFiles.length === 0) {
      return {
        files: [],
        note: !coverageScript
          ? 'No `coverage`/`test:coverage` npm script found — frontend coverage skipped.'
          : undefined,
      };
    }

    const result = await execShell(coverageScript, { cwd: path.join(repoRoot, frontendRel), timeoutMs });
    const command = toCommandResult('coverage.frontend', result);

    const summary = await readCoverageSummary(path.join(repoRoot, frontendRel, 'coverage', 'coverage-summary.json'));
    if (!summary) {
      return { files: [], command, note: 'Coverage script ran but coverage-summary.json was not produced (check reporter config).' };
    }

    const files: CoverageFileDelta[] = frontendFiles.map((f) => {
      const absKey = Object.keys(summary).find((key) => key.replace(/\\/g, '/').endsWith(f.replace(frontendRel + '/', '')));
      const pct = absKey ? summary[absKey].lines.pct : null;
      return { file: f, baseLinePct: null, headLinePct: pct, deltaPct: null };
    });

    return { files, command };
  },

  async measureBackend(
    changedFiles: string[],
    timeoutMs: number,
  ): Promise<{ files: CoverageFileDelta[]; command?: CommandResult; note?: string }> {
    const backendFiles = changedFiles.filter((f) => f.endsWith('.cs'));
    if (backendFiles.length === 0) {
      return { files: [] };
    }

    const testProjectRel = 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI.Tests';
    const repoRoot = config.repoRoot;
    try {
      await fs.access(path.join(repoRoot, testProjectRel, 'HealthInsuranceClaimAPI.Tests.csproj'));
    } catch {
      return { files: [], note: 'No backend test project — backend coverage skipped.' };
    }

    const result = await execShell('dotnet test --collect:"XPlat Code Coverage" --no-build --verbosity minimal', {
      cwd: path.join(repoRoot, 'HealthInsuranceClaimAPI'),
      timeoutMs,
    });
    const command = toCommandResult('coverage.backend', result);
    const overallMatch = `${result.stdout}${result.stderr}`.match(/Line coverage:\s*([\d.]+)%/i);

    if (!overallMatch) {
      return {
        files: [],
        command,
        note: 'dotnet test ran but no coverlet coverage output was found — add the coverlet.collector package to enable backend coverage.',
      };
    }

    const pct = Number(overallMatch[1]);
    // Per-file backend coverage requires parsing the cobertura XML; report one overall row
    // for the changed backend files rather than fabricating per-file numbers.
    return {
      files: [{ file: `backend (overall, ${backendFiles.length} file(s) changed)`, baseLinePct: null, headLinePct: pct, deltaPct: null }],
      command,
    };
  },

  async measure(changedFiles: string[], timeoutMs: number): Promise<CoverageDeltaSummary> {
    const [frontend, backend] = await Promise.all([
      this.measureFrontend(changedFiles, timeoutMs),
      this.measureBackend(changedFiles, timeoutMs),
    ]);

    const files = [...frontend.files, ...backend.files];
    const ran = files.length > 0;
    const minThresholdPct = config.coverage.minFilePct;
    const weak = files.some((f) => f.headLinePct !== null && f.headLinePct < minThresholdPct);
    const notes = [frontend.note, backend.note].filter(Boolean).join(' ');

    return {
      ran,
      weak,
      minThresholdPct,
      files,
      note: notes || undefined,
    };
  },
};
