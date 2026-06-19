import type { BugIntakePayload } from '../types/contracts.js';
import type { AnalysisResult } from '../types/contracts.js';
import { repoInspectionService } from './repo-inspection-service.js';

/**
 * Phase 4: inspect REPO_ROOT and derive a structured bug summary from intake.
 */
export const analysisService = {
  phase: 'Phase 4',

  async analyze(intake: BugIntakePayload): Promise<AnalysisResult> {
    const inspection = await repoInspectionService.inspect();
    const { bug } = intake;

    const componentHint = bug.component && bug.component !== 'unknown' ? ` (${bug.component})` : '';
    const areaHint = bug.affectedArea ? ` Area: ${bug.affectedArea}.` : '';

    const projectNotes: string[] = [];
    if (inspection.projects.frontend) projectNotes.push(`frontend at ${inspection.projects.frontend}`);
    if (inspection.projects.backend) projectNotes.push(`backend at ${inspection.projects.backend}`);

    const repoNote =
      projectNotes.length > 0
        ? `Detected ${projectNotes.join(' and ')}.`
        : 'Project layout not fully detected.';

    const bugSummary = [
      bug.title,
      bug.description.slice(0, 400),
      componentHint,
      areaHint,
      repoNote,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rootCauseSummary =
      bug.actualBehavior && bug.expectedBehavior
        ? `Expected: ${bug.expectedBehavior}. Actual: ${bug.actualBehavior}.`
        : 'Root cause will be refined by the Cursor agent after patching.';

    return {
      bugSummary,
      rootCauseSummary,
      repoWarnings: inspection.warnings,
      commands: inspection.commands,
    };
  },
};
