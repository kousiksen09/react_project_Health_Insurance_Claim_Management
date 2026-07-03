import type { AdoWorkItemRef, BugIntakePayload, PbiIntakePayload, WorkItemIntakePayload } from '../types/contracts.js';

/** Normalized view over BugIntakePayload | PbiIntakePayload for code that doesn't care which pipeline it's in. */
export interface WorkItemCore {
  type: 'bug' | 'pbi';
  title: string;
  description: string;
  severity: string;
  component: 'frontend' | 'backend' | 'fullstack' | 'unknown';
  affectedArea?: string;
  acceptanceCriteria?: string;
  reporterEmail: string;
  reporterName?: string;
  ado?: AdoWorkItemRef;
}

export function intakeType(intake: WorkItemIntakePayload): 'bug' | 'pbi' {
  return intake.type === 'pbi' ? 'pbi' : 'bug';
}

export function isPbiIntake(intake: WorkItemIntakePayload): intake is PbiIntakePayload {
  return intake.type === 'pbi';
}

export function isBugIntake(intake: WorkItemIntakePayload): intake is BugIntakePayload {
  return !isPbiIntake(intake);
}

/** Flattens either payload shape into a single core view used by prompt builders and summaries. */
export function coreOf(intake: WorkItemIntakePayload): WorkItemCore {
  if (isPbiIntake(intake)) {
    return {
      type: 'pbi',
      title: intake.pbi.title,
      description: intake.pbi.description,
      severity: intake.pbi.priority ? `P${intake.pbi.priority}` : 'medium',
      component: 'unknown',
      acceptanceCriteria: intake.pbi.acceptanceCriteria,
      reporterEmail: intake.reporter.email,
      reporterName: intake.reporter.name,
      ado: intake.ado,
    };
  }

  return {
    type: 'bug',
    title: intake.bug.title,
    description: intake.bug.description,
    severity: intake.bug.severity ?? 'medium',
    component: intake.bug.component ?? 'unknown',
    affectedArea: intake.bug.affectedArea,
    reporterEmail: intake.reporter.email,
    reporterName: intake.reporter.name,
    ado: intake.metadata.ado,
  };
}

/** ADO ref regardless of pipeline — used to post comments / transition state back to the work item. */
export function adoRefOf(intake: WorkItemIntakePayload): AdoWorkItemRef | undefined {
  return isPbiIntake(intake) ? intake.ado : intake.metadata.ado;
}

export function titleOf(intake: WorkItemIntakePayload): string {
  return coreOf(intake).title;
}
