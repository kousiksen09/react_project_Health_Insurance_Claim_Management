/**
 * n8n Code node — Azure DevOps Service Hook receiver.
 *
 * Configure an ADO Service Hook: Project Settings > Service Hooks > Create subscription
 *   Trigger: "Work item updated"
 *   Filters: Work item type = Bug OR Product Backlog Item (create two subscriptions,
 *            one per type, both pointing at this same webhook — simplest to reason about)
 *            Optionally filter on "State" = your trigger state (e.g. "Ready for Dev")
 *   Action:  Web Hooks -> URL of this n8n webhook node
 *
 * This node normalizes the ADO payload into a BugIntakePayload or PbiIntakePayload
 * (depending on System.WorkItemType) and POSTs it to the orchestrator's /runs/start.
 * It does NOT poll for completion — ADO expects a fast ack, so the run proceeds
 * asynchronously and status/approval happens via chat commands (approve-plan, approve, etc).
 */

const CONFIG = {
  ORCHESTRATOR_URL: 'http://127.0.0.1:4400',
  ORCHESTRATOR_API_KEY: '',
  // Only start a run when the work item's *new* state matches one of these (case-insensitive).
  // Leave empty to react to every "Work item updated" event received (not recommended —
  // filter in the ADO service hook subscription instead).
  TRIGGER_STATES: ['ready for dev', 'approved'],
};

const ORCHESTRATOR_URL = ($env.ORCHESTRATOR_URL || CONFIG.ORCHESTRATOR_URL || 'http://127.0.0.1:4400').replace(/\/$/, '');
const API_KEY = $env.ORCHESTRATOR_API_KEY || CONFIG.ORCHESTRATOR_API_KEY;
const ADO_ORG = $env.ADO_ORG || '';

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeComponent(areaPath) {
  const v = String(areaPath || '').toLowerCase();
  if (v.includes('frontend') || v.includes('ui') || v.includes('client')) return 'frontend';
  if (v.includes('backend') || v.includes('api') || v.includes('server')) return 'backend';
  return 'unknown';
}

function severityFromAdoSeverity(sev) {
  const v = String(sev || '').toLowerCase();
  if (v.includes('1') || v.includes('critical')) return 'critical';
  if (v.includes('2') || v.includes('high')) return 'high';
  if (v.includes('3') || v.includes('medium')) return 'medium';
  return v.includes('4') || v.includes('low') ? 'low' : 'medium';
}

function reply(json) {
  return [{ json }];
}

const body = $input.first().json ?? {};
const eventType = body.eventType || '';
const resource = body.resource || {};
const fields = resource.revision?.fields || resource.fields || {};

function fieldValue(name) {
  const v = fields[name];
  if (v && typeof v === 'object' && 'newValue' in v) return v.newValue;
  return v;
}

const workItemId = resource.workItemId || resource.id;
const workItemType = String(fieldValue('System.WorkItemType') || '').trim();
const title = String(fieldValue('System.Title') || '').trim();
const state = String(fieldValue('System.State') || '').trim();

if (!workItemId || !workItemType || !title) {
  return reply({
    ok: false,
    message: `Ignored event (eventType=${eventType}): missing workItemId/workItemType/title — this may not be a work-item webhook.`,
  });
}

if (CONFIG.TRIGGER_STATES.length > 0 && !CONFIG.TRIGGER_STATES.includes(state.toLowerCase())) {
  return reply({ ok: true, skipped: true, reason: `State '${state}' not in TRIGGER_STATES`, workItemId });
}

if (!API_KEY) {
  return reply({ ok: false, message: 'Missing ORCHESTRATOR_API_KEY — set automation/n8n-local/.env or CONFIG.ORCHESTRATOR_API_KEY.' });
}

const project = body.resourceContainers?.project?.baseUrl
  ? decodeURIComponent(String(body.resourceContainers.project.baseUrl).split('/').filter(Boolean).pop() || '')
  : (resource.teamProject || '');
const org = ADO_ORG || (body.resourceContainers?.account?.baseUrl
  ? String(body.resourceContainers.account.baseUrl).replace(/https?:\/\//, '').split('.')[0]
  : '');

const workItemUrl = resource._links?.html?.href
  || `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_workitems/edit/${workItemId}`;

const adoRef = {
  workItemId: Number(workItemId),
  workItemType,
  workItemUrl,
  organization: org,
  project,
  areaPath: fieldValue('System.AreaPath'),
  iterationPath: fieldValue('System.IterationPath'),
  tags: String(fieldValue('System.Tags') || '').split(';').map((t) => t.trim()).filter(Boolean),
  state,
};

const assignedToRaw = fieldValue('System.AssignedTo');
const assignedTo = assignedToRaw
  ? {
      email: typeof assignedToRaw === 'object' ? (assignedToRaw.uniqueName || assignedToRaw.email || '') : '',
      name: typeof assignedToRaw === 'object' ? (assignedToRaw.displayName || '') : String(assignedToRaw),
    }
  : undefined;

const reporterEmail = assignedTo?.email || 'ado-webhook@example.com';
const now = new Date().toISOString();
const rev = resource.rev || resource.revision?.rev || 0;
const messageId = `ado-${workItemId}-rev${rev}@${org || 'ado'}`;

const isBug = workItemType.toLowerCase() === 'bug';

const payload = isBug
  ? {
      contractVersion: '1.1.0',
      type: 'bug',
      source: 'ado',
      messageId,
      receivedAt: now,
      reporter: { email: reporterEmail, name: assignedTo?.name },
      bug: {
        title: title.slice(0, 200),
        description: stripHtml(fieldValue('System.Description')).slice(0, 8000) || title,
        severity: severityFromAdoSeverity(fieldValue('Microsoft.VSTS.Common.Severity')),
        component: normalizeComponent(adoRef.areaPath),
        environment: 'ado',
      },
      metadata: {
        emailSubject: `[ADO Bug #${workItemId}] ${title}`,
        labels: ['ado', ...adoRef.tags],
        ado: adoRef,
      },
    }
  : {
      contractVersion: '1.1.0',
      type: 'pbi',
      source: 'ado',
      messageId,
      receivedAt: now,
      reporter: { email: reporterEmail, name: assignedTo?.name },
      ado: adoRef,
      pbi: {
        title: title.slice(0, 200),
        description: stripHtml(fieldValue('System.Description')).slice(0, 20000) || title,
        acceptanceCriteria: stripHtml(fieldValue('Microsoft.VSTS.Common.AcceptanceCriteria')) || undefined,
        storyPoints: fieldValue('Microsoft.VSTS.Scheduling.StoryPoints') ? Number(fieldValue('Microsoft.VSTS.Scheduling.StoryPoints')) : undefined,
        priority: fieldValue('Microsoft.VSTS.Common.Priority') ? Number(fieldValue('Microsoft.VSTS.Common.Priority')) : undefined,
        assignedTo,
      },
      metadata: {
        adoEventType: eventType,
        labels: ['ado', ...adoRef.tags],
      },
    };

try {
  const started = await this.helpers.httpRequest({
    method: 'POST',
    url: `${ORCHESTRATOR_URL}/runs/start`,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload,
    json: true,
    timeout: 30000,
  });

  return reply({
    ok: true,
    runId: started.runId,
    status: started.status,
    type: started.type,
    branchName: started.branchName,
    workItemId,
    message: `Started ${isBug ? 'bug-fix' : 'PBI'} run ${started.runId} for ADO work item #${workItemId}.`,
  });
} catch (err) {
  const status = err.statusCode ?? err.response?.statusCode ?? 'unknown';
  const errBody = err.response?.body ?? err.response?.data ?? err.message;
  if (status === 409) {
    return reply({ ok: true, skipped: true, reason: 'Run already exists for this work item revision', workItemId });
  }
  return reply({ ok: false, message: `Orchestrator error (HTTP ${status}): ${JSON.stringify(errBody)}`, workItemId });
}
