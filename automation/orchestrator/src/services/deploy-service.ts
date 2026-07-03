import { adoClient } from './ado-client.js';
import { adoRefOf } from '../utils/intake-helpers.js';
import { config } from '../config.js';
import type { DeployStatusRequest, RunResult } from '../types/contracts.js';

/**
 * Posts deploy progress back to ADO when configured. State mutation on the run itself
 * happens in run-lifecycle.ts; this service only owns the ADO side-effect so it can be
 * unit-tested / swapped independently of the run state machine.
 */
export const deployService = {
  async notifyAdo(run: RunResult, report: DeployStatusRequest): Promise<void> {
    const adoRef = adoRefOf(run.intake);
    if (!adoRef || !config.adoConfigured) return;

    if (report.status === 'succeeded') {
      const comment = [
        `Deployed to ${report.environment ?? 'staging'}.`,
        report.url ? `URL: ${report.url}` : '',
        report.pipelineRunUrl ? `Pipeline run: ${report.pipelineRunUrl}` : '',
        'Ready for UAT — reply in chat with `uat-approve ' + run.runId + '` once verified.',
      ]
        .filter(Boolean)
        .join('\n');
      await adoClient.updateState(adoRef.workItemId, config.ado.states.inReview, comment);
    } else if (report.status === 'failed') {
      await adoClient.addComment(
        adoRef.workItemId,
        `Deployment to ${report.environment ?? 'staging'} failed.${report.note ? ` ${report.note}` : ''}`,
      );
    } else {
      await adoClient.addComment(adoRef.workItemId, `Deployment to ${report.environment ?? 'staging'} started.`);
    }
  },
};
