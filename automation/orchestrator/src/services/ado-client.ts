import { config } from '../config.js';

interface AdoRequestResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

interface AdoWorkItemField {
  [key: string]: unknown;
}

interface AdoWorkItemResponse {
  id: number;
  fields: AdoWorkItemField;
  url: string;
}

export interface AdoWorkItemDetails {
  id: number;
  type: string;
  title: string;
  descriptionHtml: string;
  acceptanceCriteriaHtml?: string;
  state: string;
  areaPath?: string;
  iterationPath?: string;
  tags: string[];
  priority?: number;
  storyPoints?: number;
  assignedTo?: { email: string; name?: string };
}

function stripHtml(html: string): string {
  return html
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

async function adoRequest<T>(method: string, path: string, body?: unknown): Promise<AdoRequestResult<T>> {
  if (!config.adoConfigured) {
    return { ok: false, status: 503, error: 'ADO_PAT/ADO_ORG/ADO_PROJECT are not configured' };
  }

  const base = `https://dev.azure.com/${config.ado.org}/${encodeURIComponent(config.ado.project)}/_apis`;
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}api-version=7.1`;
  const auth = Buffer.from(`:${config.ado.pat}`).toString('base64');

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': method === 'PATCH' ? 'application/json-patch+json' : 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const message = (data as { message?: string } | undefined)?.message || text.slice(0, 500) || `ADO API ${response.status}`;
      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'ADO request failed' };
  }
}

/**
 * Thin wrapper around Azure DevOps REST API v7.1 (PAT auth).
 * Used to enrich intake, post progress comments, and transition work item state
 * at each pipeline gate (plan approval, PR created, deployed, released).
 */
export const adoClient = {
  async getWorkItem(workItemId: number): Promise<{ ok: boolean; workItem?: AdoWorkItemDetails; error?: string }> {
    const result = await adoRequest<AdoWorkItemResponse>('GET', `/wit/workitems/${workItemId}?$expand=all`);
    if (!result.ok || !result.data) {
      return { ok: false, error: result.error ?? 'Failed to fetch work item' };
    }

    const f = result.data.fields;
    const type = String(f['System.WorkItemType'] ?? 'Unknown');
    const acRaw = f['Microsoft.VSTS.Common.AcceptanceCriteria'];

    return {
      ok: true,
      workItem: {
        id: result.data.id,
        type,
        title: String(f['System.Title'] ?? ''),
        descriptionHtml: String(f['System.Description'] ?? ''),
        acceptanceCriteriaHtml: acRaw ? String(acRaw) : undefined,
        state: String(f['System.State'] ?? ''),
        areaPath: f['System.AreaPath'] ? String(f['System.AreaPath']) : undefined,
        iterationPath: f['System.IterationPath'] ? String(f['System.IterationPath']) : undefined,
        tags: String(f['System.Tags'] ?? '')
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean),
        priority: f['Microsoft.VSTS.Common.Priority'] ? Number(f['Microsoft.VSTS.Common.Priority']) : undefined,
        storyPoints: f['Microsoft.VSTS.Scheduling.StoryPoints']
          ? Number(f['Microsoft.VSTS.Scheduling.StoryPoints'])
          : undefined,
        assignedTo: f['System.AssignedTo']
          ? {
              email: String((f['System.AssignedTo'] as { uniqueName?: string })?.uniqueName ?? ''),
              name: String((f['System.AssignedTo'] as { displayName?: string })?.displayName ?? ''),
            }
          : undefined,
      },
    };
  },

  stripHtml,

  async addComment(workItemId: number, text: string): Promise<{ ok: boolean; error?: string }> {
    const result = await adoRequest('POST', `/wit/workItems/${workItemId}/comments`, { text });
    return { ok: result.ok, error: result.error };
  },

  async updateState(workItemId: number, state: string, comment?: string): Promise<{ ok: boolean; error?: string }> {
    const patch: Array<Record<string, unknown>> = [
      { op: 'add', path: '/fields/System.State', value: state },
    ];
    const result = await adoRequest('PATCH', `/wit/workitems/${workItemId}`, patch);
    if (result.ok && comment) {
      await this.addComment(workItemId, comment);
    }
    return { ok: result.ok, error: result.error };
  },

  buildWorkItemUrl(workItemId: number): string {
    return `https://dev.azure.com/${config.ado.org}/${encodeURIComponent(config.ado.project)}/_workitems/edit/${workItemId}`;
  },
};
