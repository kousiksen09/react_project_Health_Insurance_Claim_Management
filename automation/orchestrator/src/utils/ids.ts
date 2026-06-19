export function slugifyTitle(title: string, maxLength = 40): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

export function createRunId(now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `run_${stamp}_${suffix}`;
}

export function buildBranchName(runId: string, title: string): string {
  return `bugfix/${runId}-${slugifyTitle(title)}`;
}

export function relativeArtifactsPath(runId: string): string {
  return `automation/artifacts/${runId}`;
}
