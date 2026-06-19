import { config } from '../config.js';
import { execCommand, toCommandResult } from '../utils/exec.js';
import type { CommandResult, GitBranchResult, GitPushResult } from '../types/contracts.js';

async function runGit(
  name: string,
  args: string[],
  commands: CommandResult[],
  note?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await execCommand('git', args, { cwd: config.repoRoot });
  commands.push(toCommandResult(name, result, note));
  return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Phase 4: create feature branch from DEFAULT_BASE_BRANCH (no push).
 * Phase 7: commit pending changes and push after approval.
 */
export const gitService = {
  phase: 'Phase 7',

  async createFeatureBranch(branchName: string, baseBranch = config.defaultBaseBranch): Promise<GitBranchResult> {
    const commands: CommandResult[] = [];
    const warnings: string[] = [];

    const gitDir = await runGit('git.rev-parse', ['rev-parse', '--git-dir'], commands);
    if (gitDir.exitCode !== 0) {
      return {
        success: false,
        branchName,
        baseBranch,
        commands,
        warnings,
        error: 'REPO_ROOT is not a git repository',
      };
    }

    const status = await runGit('git.status', ['status', '--porcelain'], commands);
    if (status.stdout.trim() && !config.allowDirtyRepo) {
      return {
        success: false,
        branchName,
        baseBranch,
        commands,
        warnings: ['Working tree is not clean. Set ALLOW_DIRTY_REPO=true to override.'],
        error: 'DIRTY_WORKING_TREE',
      };
    }
    if (status.stdout.trim()) {
      warnings.push('Proceeding with dirty working tree (ALLOW_DIRTY_REPO=true)');
    }

    const fetch = await runGit('git.fetch', ['fetch', 'origin', baseBranch], commands, 'best-effort');
    if (fetch.exitCode !== 0) {
      warnings.push(`git fetch origin ${baseBranch} failed — using local ${baseBranch}`);
    }

    const checkoutBase = await runGit('git.checkout-base', ['checkout', baseBranch], commands);
    if (checkoutBase.exitCode !== 0) {
      return {
        success: false,
        branchName,
        baseBranch,
        commands,
        warnings,
        error: `Failed to checkout ${baseBranch}`,
      };
    }

    const createBranch = await runGit('git.checkout-branch', ['checkout', '-B', branchName], commands);
    if (createBranch.exitCode !== 0) {
      return {
        success: false,
        branchName,
        baseBranch,
        commands,
        warnings,
        error: `Failed to create branch ${branchName}`,
      };
    }

    return {
      success: true,
      branchName,
      baseBranch,
      commands,
      warnings,
    };
  },

  async listChangedFiles(baseBranch: string): Promise<{ files: string[]; commands: CommandResult[] }> {
    const commands: CommandResult[] = [];

    const diff = await runGit('git.diff-name-only', ['diff', '--name-only', baseBranch, 'HEAD'], commands);
    const unstaged = await runGit('git.diff-unstaged', ['diff', '--name-only'], commands);
    const untracked = await runGit('git.ls-files-untracked', ['ls-files', '--others', '--exclude-standard'], commands);

    const files = new Set<string>();
    for (const output of [diff.stdout, unstaged.stdout, untracked.stdout]) {
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) files.add(trimmed.replace(/\\/g, '/'));
      }
    }

    return { files: [...files].sort(), commands };
  },

  async listCommitsSinceBase(baseBranch: string): Promise<{
    commits: Array<{ sha: string; message: string }>;
    commands: CommandResult[];
  }> {
    const commands: CommandResult[] = [];
    const log = await runGit(
      'git.log',
      ['log', `${baseBranch}..HEAD`, '--pretty=format:%H|%s'],
      commands,
    );

    const commits = log.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sha, ...rest] = line.split('|');
        return { sha: sha ?? '', message: rest.join('|') };
      });

    return { commits, commands };
  },

  async commitPendingChanges(branchName: string, message: string): Promise<{
    committed: boolean;
    commands: CommandResult[];
    error?: string;
  }> {
    const commands: CommandResult[] = [];

    const checkout = await runGit('git.checkout', ['checkout', branchName], commands);
    if (checkout.exitCode !== 0) {
      return { committed: false, commands, error: `Failed to checkout ${branchName}` };
    }

    const status = await runGit('git.status', ['status', '--porcelain'], commands);
    if (!status.stdout.trim()) {
      return { committed: false, commands };
    }

    const add = await runGit('git.add', ['add', '-A'], commands);
    if (add.exitCode !== 0) {
      return { committed: false, commands, error: 'git add failed' };
    }

    const commit = await runGit('git.commit', ['commit', '-m', message], commands);
    if (commit.exitCode !== 0) {
      return { committed: false, commands, error: commit.stderr || 'git commit failed' };
    }

    return { committed: true, commands };
  },

  async pushBranch(branchName: string, commitMessage?: string): Promise<GitPushResult> {
    const commands: CommandResult[] = [];
    let commitCreated = false;

    if (commitMessage) {
      const commitResult = await this.commitPendingChanges(branchName, commitMessage);
      commands.push(...commitResult.commands);
      commitCreated = commitResult.committed;
      if (commitResult.error) {
        return {
          success: false,
          branchName,
          pushed: false,
          commitCreated,
          commands,
          error: commitResult.error,
        };
      }
    }

    const checkout = await runGit('git.checkout', ['checkout', branchName], commands);
    if (checkout.exitCode !== 0) {
      return {
        success: false,
        branchName,
        pushed: false,
        commitCreated: false,
        commands,
        error: `Failed to checkout ${branchName} before push`,
      };
    }

    const push = await runGit('git.push', ['push', '-u', 'origin', branchName], commands);
    if (push.exitCode !== 0) {
      return {
        success: false,
        branchName,
        pushed: false,
        commitCreated: commitMessage ? commitCreated : false,
        commands,
        error: push.stderr || push.stdout || 'git push failed',
      };
    }

    return {
      success: true,
      branchName,
      pushed: true,
      commitCreated: Boolean(commitMessage),
      commands,
    };
  },
};
