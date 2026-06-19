import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import type { AgentRunResult, AnalysisResult, BugIntakePayload, RunResult, ValidationResult } from '../types/contracts.js';

/**
 * Persist per-run artifacts under automation/artifacts/<runId>/.
 */
export const artifactService = {
  async ensureRunDirectory(runId: string): Promise<string> {
    const dir = path.join(config.artifactsRoot, runId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  },

  async writeIntake(runId: string, intake: BugIntakePayload): Promise<void> {
    const dir = await this.ensureRunDirectory(runId);
    await fs.writeFile(path.join(dir, 'intake.json'), JSON.stringify(intake, null, 2), 'utf8');
  },

  async appendLog(runId: string, event: Record<string, unknown>): Promise<void> {
    const dir = await this.ensureRunDirectory(runId);
    const line = JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n';
    await fs.appendFile(path.join(dir, 'run-log.jsonl'), line, 'utf8');
  },

  async writeTextArtifact(runId: string, filename: string, content: string): Promise<string> {
    const dir = await this.ensureRunDirectory(runId);
    await fs.writeFile(path.join(dir, filename), content, 'utf8');
    return filename;
  },

  async writeJsonArtifact(runId: string, filename: string, data: unknown): Promise<void> {
    const dir = await this.ensureRunDirectory(runId);
    await fs.writeFile(path.join(dir, filename), JSON.stringify(data, null, 2), 'utf8');
  },

  async writeAnalysisArtifacts(
    runId: string,
    analysis: AnalysisResult,
    agent: AgentRunResult,
  ): Promise<void> {
    await this.writeTextArtifact(runId, 'bug-summary.md', agent.bugSummary || analysis.bugSummary);
    await this.writeTextArtifact(
      runId,
      'root-cause.md',
      agent.rootCauseSummary || analysis.rootCauseSummary,
    );
    await this.writeJsonArtifact(runId, 'changed-files.json', {
      mode: agent.mode,
      files: agent.changedFiles,
    });
  },

  async writeValidationArtifacts(runId: string, validation: ValidationResult): Promise<void> {
    await this.writeJsonArtifact(runId, 'validation.json', validation);
    await this.writeTextArtifact(
      runId,
      'validation-summary.md',
      [
        `# Validation summary`,
        ``,
        `- **passed:** ${validation.passed}`,
        `- **buildPassed:** ${validation.buildPassed}`,
        `- **testsPassed:** ${validation.testsPassed}`,
        `- **strictMode:** ${validation.strictMode}`,
        `- **testSummary:** ${validation.testSummary}`,
        validation.failureReason ? `- **failureReason:** ${validation.failureReason}` : '',
        validation.implementationNote ? `- **note:** ${validation.implementationNote}` : '',
        ``,
        `## Test gap recommendations`,
        ...validation.testGapRecommendations.map(
          (rec) =>
            `- **[${rec.priority}] ${rec.layer}** ${rec.title}\n  - ${rec.description}\n  - Path: \`${rec.suggestedPath}\``,
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  },

  async writeRunSnapshot(run: RunResult): Promise<void> {
    const dir = await this.ensureRunDirectory(run.runId);
    await fs.writeFile(path.join(dir, 'run-result.json'), JSON.stringify(run, null, 2), 'utf8');
  },

  listArtifactFiles(): string[] {
    return [
      'intake.json',
      'run-log.jsonl',
      'run-result.json',
      'bug-summary.md',
      'root-cause.md',
      'changed-files.json',
      'commands.json',
      'validation.json',
      'validation-summary.md',
      'approval.json',
      'approval-email.txt',
      'pr-body.md',
      'pr-result.json',
      'agent-prompt.md',
      'agent-transcript.jsonl',
      'agent-transcript.md',
    ];
  },
};
