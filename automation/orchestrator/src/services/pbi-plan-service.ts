import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { buildPbiPlanPrompt } from '../utils/pbi-plan-prompt-builder.js';
import { extractAssistantText } from '../utils/parse-agent-output.js';
import { workItemPlanSchema } from '../types/schemas.js';
import type { PbiIntakePayload, PlanSummary, WorkItemPlan } from '../types/contracts.js';
import { repoInspectionService } from './repo-inspection-service.js';
import { artifactService } from './artifact-service.js';

export interface PlanRunResult {
  success: boolean;
  plan?: WorkItemPlan;
  planSummary?: PlanSummary;
  agentId?: string;
  agentRunId?: string;
  autoBlocked: boolean;
  autoBlockReason: string | null;
  error?: string;
}

function shouldDryRun(): boolean {
  if (config.cursor.dryRun) return true;
  return !config.cursorConfigured;
}

function extractPlanJson(text: string): unknown {
  const match = text.match(/<PLAN>([\s\S]*?)<\/PLAN>/i);
  if (!match) {
    throw new Error('Agent response did not contain a <PLAN>...</PLAN> block');
  }
  const raw = match[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(raw);
}

function toPlanSummary(plan: WorkItemPlan): PlanSummary {
  return {
    summary: plan.summary,
    acceptanceCriteriaCount: plan.acceptanceCriteria.length,
    taskCount: plan.tasks.length,
    edgeCaseCount: plan.edgeCases.length,
    openQuestions: plan.openQuestions,
    risks: plan.risks,
    requiresMigration: plan.requiresMigration,
    requiresApiContractChange: plan.requiresApiContractChange,
    estimatedTotalLoc: plan.estimatedTotalLoc,
    releaseImpact: plan.releaseImpact,
  };
}

/** Auto-block rules: the pipeline refuses to proceed to human review for plans that are too risky to review casually. */
function checkAutoBlock(plan: WorkItemPlan): { blocked: boolean; reason: string | null } {
  if (plan.requiresMigration) {
    return { blocked: true, reason: 'Plan requires a database/schema migration — split into a separate reviewed PBI.' };
  }
  if (plan.estimatedTotalLoc > config.plan.maxLoc) {
    return {
      blocked: true,
      reason: `Estimated ${plan.estimatedTotalLoc} LOC exceeds MAX_PLAN_LOC=${config.plan.maxLoc} — split the PBI into smaller stories.`,
    };
  }
  const highRisks = plan.risks.filter((r) => r.level === 'high');
  if (highRisks.length > 0) {
    return {
      blocked: true,
      reason: `High-risk item(s) flagged: ${highRisks.map((r) => r.text).join('; ')}`,
    };
  }
  return { blocked: false, reason: null };
}

function renderPlanMarkdown(plan: WorkItemPlan, intake: PbiIntakePayload): string {
  const lines: string[] = [];
  lines.push(`# Plan — ${intake.pbi.title}`);
  lines.push('');
  lines.push(`ADO Work Item: [#${intake.ado.workItemId}](${intake.ado.workItemUrl})`);
  lines.push('');
  lines.push('## Summary');
  lines.push(plan.summary);
  lines.push('');
  lines.push('## Acceptance criteria');
  for (const ac of plan.acceptanceCriteria) {
    lines.push(`- **${ac.id}** — Given ${ac.given}, when ${ac.when}, then ${ac.then}`);
  }
  lines.push('');
  lines.push('## Tasks');
  lines.push('| ID | Title | Layer | Change | Files | Est. LOC | Depends on |');
  lines.push('|----|-------|-------|--------|-------|----------|------------|');
  for (const t of plan.tasks) {
    lines.push(
      `| ${t.id} | ${t.title} | ${t.layer} | ${t.changeType} | ${t.files.join(', ') || '(tbd)'} | ${t.estimateLoc} | ${t.dependsOn.join(', ') || '-'} |`,
    );
  }
  lines.push('');
  lines.push(`**Estimated total LOC:** ${plan.estimatedTotalLoc} · **Release impact:** ${plan.releaseImpact}`);
  lines.push('');
  lines.push('## Edge cases & scenario coverage');
  lines.push('| Acceptance criterion | Edge case | Covered | Note |');
  lines.push('|----------------------|-----------|---------|------|');
  for (const row of plan.scenarioCoverage) {
    lines.push(`| ${row.acId} | ${row.edgeCase} | ${row.covered ? 'yes' : 'NO'} | ${row.note ?? ''} |`);
  }
  if (plan.scenarioCoverage.length === 0) {
    lines.push('| _(none provided)_ | | | |');
  }
  lines.push('');
  lines.push('Edge cases considered: ' + (plan.edgeCases.join('; ') || '(none)'));
  lines.push('');
  lines.push('## Risks');
  lines.push(
    plan.risks.length > 0
      ? plan.risks.map((r) => `- **[${r.level}]** ${r.text}`).join('\n')
      : '_(none flagged)_',
  );
  lines.push('');
  lines.push('## Open questions');
  lines.push(plan.openQuestions.length > 0 ? plan.openQuestions.map((q) => `- ${q}`).join('\n') : '_(none)_');
  lines.push('');
  lines.push('## Out of scope');
  lines.push(plan.outOfScope.length > 0 ? plan.outOfScope.map((q) => `- ${q}`).join('\n') : '_(none)_');
  lines.push('');
  lines.push(`Requires migration: **${plan.requiresMigration}** · Requires API contract change: **${plan.requiresApiContractChange}**`);
  return lines.join('\n');
}

/**
 * Gate 1 — planning stage. Runs a read-only agent turn that must not touch any file,
 * produces a structured plan validated against workItemPlanSchema, and applies
 * auto-block rules before the plan is ever shown to a human reviewer.
 */
export const pbiPlanService = {
  async createPlan(runId: string, intake: PbiIntakePayload): Promise<PlanRunResult> {
    const inspection = await repoInspectionService.inspect();
    const prompt = buildPbiPlanPrompt(intake, inspection);
    await artifactService.writeTextArtifact(runId, 'plan-prompt.md', prompt);

    if (shouldDryRun()) {
      const note = config.cursorConfigured
        ? 'CURSOR_DRY_RUN=true — planning agent not invoked.'
        : 'CURSOR_API_KEY not set — planning agent not invoked.';
      await artifactService.writeTextArtifact(runId, 'plan-transcript.md', `# Dry run\n\n${note}\n`);
      return {
        success: false,
        autoBlocked: false,
        autoBlockReason: null,
        error: `PLANNING_DRY_RUN: ${note}`,
      };
    }

    const transcriptPath = path.join(config.artifactsRoot, runId, 'plan-transcript.jsonl');
    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.writeFile(transcriptPath, '', 'utf8');

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

      const run = await agent.send(prompt);
      agentRunId = run.id;

      for await (const event of run.stream()) {
        await fs.appendFile(transcriptPath, `${JSON.stringify(event)}\n`, 'utf8');
        if (event.type === 'assistant') {
          const text = extractAssistantText(event.message.content);
          if (text) assistantChunks.push(text);
        }
      }

      const waitResult = await run.wait();
      if (waitResult.result) assistantChunks.push(waitResult.result);
      agent.close();

      const fullText = assistantChunks.join('\n').trim();
      await artifactService.writeTextArtifact(runId, 'plan-transcript.md', fullText || '(no assistant text captured)');

      if (waitResult.status === 'error') {
        return { success: false, agentId, agentRunId, autoBlocked: false, autoBlockReason: null, error: 'PLANNING_AGENT_ERROR' };
      }

      const rawPlan = extractPlanJson(fullText);
      const parsed = workItemPlanSchema.safeParse(rawPlan);
      if (!parsed.success) {
        await artifactService.writeJsonArtifact(runId, 'plan-parse-error.json', parsed.error.flatten());
        return {
          success: false,
          agentId,
          agentRunId,
          autoBlocked: false,
          autoBlockReason: null,
          error: `PLAN_SCHEMA_INVALID: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
        };
      }

      const plan = parsed.data as WorkItemPlan;
      const autoBlock = checkAutoBlock(plan);

      await artifactService.writeJsonArtifact(runId, 'plan.json', plan);
      await artifactService.writeTextArtifact(runId, 'plan.md', renderPlanMarkdown(plan, intake));
      if (plan.openQuestions.length > 0) {
        await artifactService.writeTextArtifact(
          runId,
          'plan-questions.md',
          plan.openQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
        );
      }

      return {
        success: true,
        plan,
        planSummary: toPlanSummary(plan),
        agentId,
        agentRunId,
        autoBlocked: autoBlock.blocked,
        autoBlockReason: autoBlock.reason,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown planning error';
      await artifactService.appendLog(runId, { event: 'plan_error', message });
      await artifactService.writeTextArtifact(runId, 'plan-transcript.md', `# Planning error\n\n${message}\n`);
      return { success: false, agentId, agentRunId, autoBlocked: false, autoBlockReason: null, error: message };
    }
  },
};
