import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { execCommand, toCommandResult } from '../utils/exec.js';
import type { CommandResult } from '../types/contracts.js';

export interface RepoInspection {
  repoRoot: string;
  exists: boolean;
  isGitRepo: boolean;
  defaultBranch: string;
  currentBranch?: string;
  remotes: string[];
  dirtyFiles: string[];
  projects: {
    frontend?: string;
    backend?: string;
  };
  commands: CommandResult[];
  warnings: string[];
}

const FRONTEND_REL = 'healthinsuranceclaim_frontend';
const BACKEND_REL = 'HealthInsuranceClaimAPI/HealthInsuranceClaimAPI';

export const repoInspectionService = {
  async inspect(): Promise<RepoInspection> {
    const repoRoot = config.repoRoot;
    const commands: CommandResult[] = [];
    const warnings: string[] = [];

    let exists = false;
    try {
      await fs.access(repoRoot);
      exists = true;
    } catch {
      return {
        repoRoot,
        exists: false,
        isGitRepo: false,
        defaultBranch: config.defaultBaseBranch,
        remotes: [],
        dirtyFiles: [],
        projects: {},
        commands,
        warnings: ['REPO_ROOT does not exist or is not accessible'],
      };
    }

    const gitDir = await execCommand('git', ['rev-parse', '--git-dir'], { cwd: repoRoot });
    commands.push(toCommandResult('git.rev-parse', gitDir));
    const isGitRepo = gitDir.exitCode === 0;

    if (!isGitRepo) {
      warnings.push('REPO_ROOT is not a git repository');
      return {
        repoRoot,
        exists,
        isGitRepo: false,
        defaultBranch: config.defaultBaseBranch,
        remotes: [],
        dirtyFiles: [],
        projects: await detectProjects(repoRoot),
        commands,
        warnings,
      };
    }

    const branch = await execCommand('git', ['branch', '--show-current'], { cwd: repoRoot });
    commands.push(toCommandResult('git.branch', branch));

    const remotesResult = await execCommand('git', ['remote'], { cwd: repoRoot });
    commands.push(toCommandResult('git.remote', remotesResult));
    const remotes = remotesResult.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const status = await execCommand('git', ['status', '--porcelain'], { cwd: repoRoot });
    commands.push(toCommandResult('git.status', status));
    const dirtyFiles = status.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3));

    if (dirtyFiles.length > 0) {
      warnings.push(`Working tree has ${dirtyFiles.length} uncommitted change(s) before run`);
    }

    return {
      repoRoot,
      exists,
      isGitRepo,
      defaultBranch: config.defaultBaseBranch,
      currentBranch: branch.stdout.trim() || undefined,
      remotes,
      dirtyFiles,
      projects: await detectProjects(repoRoot),
      commands,
      warnings,
    };
  },
};

async function detectProjects(repoRoot: string): Promise<RepoInspection['projects']> {
  const projects: RepoInspection['projects'] = {};
  try {
    await fs.access(path.join(repoRoot, FRONTEND_REL, 'package.json'));
    projects.frontend = FRONTEND_REL;
  } catch {
    /* not present */
  }
  try {
    await fs.access(path.join(repoRoot, BACKEND_REL, 'HealthInsuranceClaimAPI.csproj'));
    projects.backend = BACKEND_REL;
  } catch {
    /* not present */
  }
  return projects;
}
